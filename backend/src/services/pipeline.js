const { z } = require('zod');
const { callLLM } = require('./llm');
const { crawlCompanySite, findInterviewProcessDiscussion } = require('./crawler');
const { checkCoverage } = require('./coverage');
const { buildSchedule } = require('./schedule');
const { KitSchema, RequirementSchema, QuestionSchema, FlashcardSchema } = require('../schemas/kit');
const { v4: uuidv4 } = require('uuid');
const { URL } = require('url');

const MAX_PASSES = 3;

async function runPipeline(input, ctx = {}) {
  const { jd, company_url, days } = input;
  const progress = [];
  const logProgress = (step, status, detail) => {
    progress.push({ step, status, detail, at: new Date() });
    if (ctx.onProgress) ctx.onProgress({ step, status, detail });
  };

  try {
    // 1. extractRequirements
    logProgress('extractRequirements', 'running');
    const RoleExtractionSchema = z.object({
      title: z.string(),
      seniority: z.string(),
      location: z.string(),
      responsibilities: z.array(z.string()),
      requirements: z.array(RequirementSchema)
    });
    const requirementsRes = await callLLM('extractRequirements', { jd }, RoleExtractionSchema);
    let requirements = [];
    let roleData = {
      title: "Role Profile",
      seniority: "Unknown Seniority",
      location: "Unknown Location",
      responsibilities: []
    };
    if (requirementsRes.ok === false && requirementsRes.code) {
      logProgress('extractRequirements', 'failed', requirementsRes.message);
    } else {
      roleData = {
        title: requirementsRes.title || "Role Profile",
        seniority: requirementsRes.seniority || "Unknown Seniority",
        location: requirementsRes.location || "Unknown Location",
        responsibilities: requirementsRes.responsibilities || []
      };
      requirements = (requirementsRes.requirements || []).map(r => ({ ...r, _meta: { origin: 'generated', pinned: false } }));
      logProgress('extractRequirements', 'ok');
    }

    // 2. crawlCompanySite
    logProgress('crawlCompanySite', 'running');
    const crawlResult = await crawlCompanySite(company_url);
    logProgress('crawlCompanySite', 'ok', `Crawled ${crawlResult.pages.length} pages`);

    // 3. buildCompanyBrief
    logProgress('buildCompanyBrief', 'running');
    const pagesText = crawlResult.pages.map(p => `URL: ${p.url}\n${p.text}`).join('\n\n---\n\n');
    let companyBrief = { summary: 'We could not retrieve information about this company', what_they_do: '', sources: [], _meta: { origin: 'generated', pinned: false } };
    if (crawlResult.pages.length > 0) {
      const briefRes = await callLLM('buildCompanyBrief', { pagesText }, KitSchema.shape.company_brief);
      if (briefRes.ok === false && briefRes.code) {
        logProgress('buildCompanyBrief', 'failed', briefRes.message);
      } else {
        companyBrief = { ...briefRes, _meta: { origin: 'generated', pinned: false } };
        logProgress('buildCompanyBrief', 'ok');
      }
    } else {
      logProgress('buildCompanyBrief', 'skipped', 'No pages crawled');
    }

    // 4. findInterviewProcessDiscussion
    let companyName = "Unknown";
    try {
      const urlObj = new URL(company_url);
      companyName = urlObj.hostname.replace('www.', '').split('.')[0];
    } catch(e) {}
    
    logProgress('findInterviewProcessDiscussion', 'running');
    const processNotes = await findInterviewProcessDiscussion(companyName);
    logProgress('findInterviewProcessDiscussion', 'ok');

    // 5. generateQuestionsPerRequirement
    logProgress('generateQuestions', 'running');
    let questions = [];
    for (const req of requirements) {
      await new Promise(r => setTimeout(r, 1500)); // Delay to avoid Gemini rate limits
      const qRes = await callLLM('generateQuestion', { requirement: JSON.stringify(req), processContext: JSON.stringify(processNotes) }, z.array(QuestionSchema));
      if (qRes.ok === false && qRes.code) {
        logProgress(`generateQuestion:${req.id}`, 'failed', qRes.message);
      } else {
        const generated = qRes.map(q => ({ ...q, _meta: { origin: 'generated', pinned: false } }));
        questions.push(...generated);
      }
    }
    logProgress('generateQuestions', 'ok');

    // 6 & 7. checkCoverage and loop
    let passes = 1;
    let uncovered = checkCoverage(requirements, questions);
    while (uncovered.length > 0 && passes < MAX_PASSES) {
      logProgress('generateQuestionsForGaps', 'running', `Pass ${passes}, ${uncovered.length} gaps`);
      const gaps = requirements.filter(r => uncovered.includes(r.id));
      for (const req of gaps) {
        await new Promise(r => setTimeout(r, 1500)); // Delay
        const qRes = await callLLM('generateQuestion', { requirement: JSON.stringify(req), processContext: JSON.stringify(processNotes) }, z.array(QuestionSchema));
        if (qRes.ok === false && qRes.code) {
           // Skip on failure
        } else {
          const generated = qRes.map(q => ({ ...q, _meta: { origin: 'generated', pinned: false } }));
          questions.push(...generated);
        }
      }
      uncovered = checkCoverage(requirements, questions);
      passes++;
    }

    // 8. generateFlashcards
    logProgress('generateFlashcards', 'running');
    const flashcardsRes = await callLLM('generateFlashcards', { questions: JSON.stringify(questions) }, z.array(FlashcardSchema));
    let flashcards = [];
    if (flashcardsRes.ok === false && flashcardsRes.code) {
      logProgress('generateFlashcards', 'failed', flashcardsRes.message);
    } else {
      flashcards = flashcardsRes.map(f => ({ ...f, _meta: { origin: 'generated', pinned: false } }));
      logProgress('generateFlashcards', 'ok');
    }

    // 9. buildSchedule
    logProgress('buildSchedule', 'running');
    const { scheduleDays, updatedQuestions } = buildSchedule(requirements, questions, days);
    questions = updatedQuestions;
    logProgress('buildSchedule', 'ok');

    // 10. Assemble and Validate Kit
    const kitData = {
      source: {
        company: companyName,
        company_url,
        role: roleData.title, 
        location: roleData.location,
        jd_chars: jd.length,
        researched_at: new Date().toISOString(),
        pages_used: (crawlResult.pages || []).map(p => p.url)
      },
      company_brief: companyBrief,
      role: {
        title: roleData.title,
        seniority: roleData.seniority,
        responsibilities: roleData.responsibilities,
        requirements
      },
      questions,
      flashcards,
      schedule: {
        days_available: days,
        days: scheduleDays,
        _meta: { origin: 'generated', pinned: false }
      },
      coverage: {
        uncovered_requirement_ids: uncovered,
        passes
      }
    };

    // validateKit
    const kit = KitSchema.parse(kitData);
    
    return { ok: true, kit, progress };

  } catch (e) {
    logProgress('pipeline', 'failed', e.message);
    return { ok: false, error: e };
  }
}

async function regenerateBrief(company_url) {
  const crawlResult = await crawlCompanySite(company_url);
  const pagesText = crawlResult.pages.map(p => `URL: ${p.url}\n${p.text}`).join('\n\n---\n\n');
  let companyBrief = { summary: 'We could not retrieve information about this company', what_they_do: '', sources: [], _meta: { origin: 'generated', pinned: false } };
  
  if (crawlResult.pages.length > 0) {
    const briefRes = await callLLM('buildCompanyBrief', { pagesText }, KitSchema.shape.company_brief);
    if (briefRes.ok !== false) {
      companyBrief = { ...briefRes, _meta: { origin: 'generated', pinned: false } };
    }
  }
  return { companyBrief, pages_used: crawlResult.pages.map(p => p.url) };
}

async function regenerateRole(jd, existingRequirements = [], existingQuestions = [], existingFlashcards = []) {
  const RoleExtractionSchema = z.object({
    title: z.string(),
    seniority: z.string(),
    location: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(RequirementSchema)
  });
  const requirementsRes = await callLLM('extractRequirements', { jd }, RoleExtractionSchema);
  if (requirementsRes.ok === false) throw new Error(requirementsRes.message);

  let newReqs = (requirementsRes.requirements || []).map(r => ({ ...r, _meta: { origin: 'generated', pinned: false } }));
  const manualReqs = existingRequirements.filter(r => r._meta && r._meta.pinned);
  
  // Remap old IDs to new IDs
  const idMap = {};
  for (const oldReq of existingRequirements.filter(r => !r._meta?.pinned)) {
    const match = newReqs.find(nr => nr.kind === oldReq.kind && !Object.values(idMap).includes(nr.id));
    if (match) {
      idMap[oldReq.id] = match.id;
    }
  }

  const remappedQuestions = existingQuestions.map(q => ({
    ...q,
    requirement_ids: q.requirement_ids.map(id => idMap[id] || id)
  }));

  const remappedFlashcards = existingFlashcards.map(f => ({
    ...f,
    requirement_ids: (f.requirement_ids || []).map(id => idMap[id] || id)
  }));

  return {
    role: {
      title: requirementsRes.title || "Role Profile",
      seniority: requirementsRes.seniority || "Unknown Seniority",
      responsibilities: requirementsRes.responsibilities || [],
      requirements: [...manualReqs, ...newReqs]
    },
    remappedQuestions,
    remappedFlashcards
  };
}

async function regenerateQuestions(requirements, existingQuestions, companyName) {
  const processNotes = await findInterviewProcessDiscussion(companyName);
  const manualQs = existingQuestions.filter(q => q._meta && q._meta.pinned);
  let questions = [];

  for (const req of requirements) {
    await new Promise(r => setTimeout(r, 1500));
    const qRes = await callLLM('generateQuestion', { requirement: JSON.stringify(req), processContext: JSON.stringify(processNotes) }, z.array(QuestionSchema));
    if (qRes.ok !== false) {
      questions.push(...qRes.map(q => ({ ...q, _meta: { origin: 'generated', pinned: false } })));
    }
  }

  let uncovered = checkCoverage(requirements, questions);
  let passes = 1;
  while (uncovered.length > 0 && passes < MAX_PASSES) {
    const gaps = requirements.filter(r => uncovered.includes(r.id));
    for (const req of gaps) {
      await new Promise(r => setTimeout(r, 1500));
      const qRes = await callLLM('generateQuestion', { requirement: JSON.stringify(req), processContext: JSON.stringify(processNotes) }, z.array(QuestionSchema));
      if (qRes.ok !== false) {
        questions.push(...qRes.map(q => ({ ...q, _meta: { origin: 'generated', pinned: false } })));
      }
    }
    uncovered = checkCoverage(requirements, questions);
    passes++;
  }

  return { questions: [...manualQs, ...questions], uncovered_requirement_ids: uncovered, passes };
}

async function regenerateFlashcards(questions, existingFlashcards) {
  const manualFs = existingFlashcards.filter(f => f._meta && f._meta.pinned);
  const flashcardsRes = await callLLM('generateFlashcards', { questions: JSON.stringify(questions) }, z.array(FlashcardSchema));
  let generated = [];
  if (flashcardsRes.ok !== false) {
    generated = flashcardsRes.map(f => ({ ...f, _meta: { origin: 'generated', pinned: false } }));
  }
  return { flashcards: [...manualFs, ...generated] };
}

module.exports = { 
  runPipeline,
  regenerateBrief,
  regenerateRole,
  regenerateQuestions,
  regenerateFlashcards
};
