const express = require('express');
const crypto = require('crypto');
const Kit = require('../models/Kit');
const Job = require('../models/Job');
const { runPipeline, regenerateBrief, regenerateRole, regenerateQuestions, regenerateFlashcards } = require('../services/pipeline');
const { checkCoverage } = require('../services/coverage');
const { buildSchedule } = require('../services/schedule');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

async function requireOwnership(req, res, next) {
  try {
    const kit = await Kit.findById(req.params.id);
    if (!kit || kit.ownerId.toString() !== req.session.userId.toString()) {
      return res.status(403).json({ error: 'Forbidden or not found' });
    }
    req.kit = kit;
    next();
  } catch (e) {
    res.status(400).json({ error: 'Invalid kit ID' });
  }
}

// POST /api/kits
router.post('/', async (req, res) => {
  try {
    const { jd, company_url, days } = req.body;
    const inputHash = crypto.createHash('sha256').update(jd + company_url + days).digest('hex');
    
    let kit = await Kit.findOne({ ownerId: req.session.userId, inputHash });
    if (kit) {
      return res.status(200).json({ existing: true, kitId: kit._id });
    }

    kit = await Kit.create({
      ownerId: req.session.userId,
      inputHash,
      status: 'pending',
      progress: [],
      source: { company: '', company_url, role: '', location: '', jd_chars: jd.length, pages_used: [] },
      original_jd: jd
    });

    const job = await Job.create({
      kitId: kit._id,
      ownerId: req.session.userId,
      status: 'running',
      startedAt: new Date()
    });

    generateKitBackground(job._id, kit._id, { jd, company_url, days });
    res.status(202).json({ jobId: job._id, kitId: kit._id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

async function generateKitBackground(jobId, kitId, input) {
  const job = await Job.findById(jobId);
  const kit = await Kit.findById(kitId);

  const result = await runPipeline(input, {
    onProgress: async (p) => {
      await Job.findByIdAndUpdate(jobId, { currentStep: p.step });
      await Kit.findByIdAndUpdate(kitId, { $push: { progress: p } });
    }
  });

  if (result.ok) {
    await Kit.findByIdAndUpdate(kitId, { ...result.kit, status: 'ready' });
    await Job.findByIdAndUpdate(jobId, { status: 'completed', finishedAt: new Date() });
  } else {
    await Kit.findByIdAndUpdate(kitId, { status: 'failed' });
    await Job.findByIdAndUpdate(jobId, { status: 'failed', error: result.error, finishedAt: new Date() });
  }
}

router.get('/', async (req, res) => {
  const kits = await Kit.find({ ownerId: req.session.userId }).sort('-createdAt');
  res.json(kits);
});

router.get('/:id', requireOwnership, async (req, res) => {
  res.json(req.kit);
});

router.delete('/:id', requireOwnership, async (req, res) => {
  try {
    await Kit.findByIdAndDelete(req.params.id);
    await Job.deleteMany({ kitId: req.params.id });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id/events', requireOwnership, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Next.js / Nginx proxy buffering
  res.flushHeaders();

  const kitId = req.params.id;
  
  const interval = setInterval(async () => {
    try {
      const k = await Kit.findById(kitId).select('status progress');
      if (k) {
        res.write(`data: ${JSON.stringify(k)}\n\n`);
        if (k.status === 'ready' || k.status === 'failed') {
          clearInterval(interval);
          res.end();
        }
      }
    } catch(e) {}
  }, 2000);

  req.on('close', () => clearInterval(interval));
});

// Update specific fields (optimistic concurrency support)
router.patch('/:id/brief', requireOwnership, async (req, res) => {
  const { brief, updatedAt } = req.body;
  if (updatedAt && new Date(req.kit.updatedAt).getTime() > new Date(updatedAt).getTime()) {
    return res.status(409).json({ error: 'Conflict' });
  }
  
  const existingBrief = req.kit.company_brief || {};
  req.kit.company_brief = {
    ...existingBrief,
    ...brief,
    _meta: {
      ...(existingBrief._meta || {}),
      ...(brief?._meta || {}),
      origin: 'edited',
      pinned: true
    }
  };
  req.kit.markModified('company_brief');
  await req.kit.save();
  res.json(req.kit);
});

// Implementation of Section 6 Regeneration Model
router.post('/:id/regenerate', requireOwnership, async (req, res) => {
  const { section } = req.body;
  const kit = req.kit;

  try {
    if (section === 'brief') {
      const { companyBrief, pages_used } = await regenerateBrief(kit.source.company_url);
      kit.company_brief = companyBrief;
      kit.source.pages_used = pages_used;
    } 
    else if (section === 'role') {
      if (!kit.original_jd) {
        return res.status(400).json({ error: 'Original Job Description is missing for this kit. Cannot regenerate Role section.' });
      }
      const { role, remappedQuestions, remappedFlashcards } = await regenerateRole(
        kit.original_jd, 
        kit.role.requirements, 
        kit.questions, 
        kit.flashcards
      );
      kit.role = role;
      kit.questions = remappedQuestions;
      kit.flashcards = remappedFlashcards;
    }
    else if (section === 'questions') {
      const { questions, uncovered_requirement_ids, passes } = await regenerateQuestions(
        kit.role.requirements,
        kit.questions,
        kit.source.company
      );
      kit.questions = questions;
      kit.coverage = { uncovered_requirement_ids, passes };
    }
    else if (section === 'flashcards') {
      const { flashcards } = await regenerateFlashcards(kit.questions, kit.flashcards);
      kit.flashcards = flashcards;
    }
    else if (section === 'schedule') {
      const { scheduleDays, updatedQuestions } = buildSchedule(
        kit.role.requirements, 
        kit.questions, 
        kit.schedule.days_available || 5
      );
      kit.schedule.days = scheduleDays;
      kit.questions = updatedQuestions;
    }
    else {
      return res.status(400).json({ error: 'Unsupported regeneration section' });
    }

    // Always increment a version or save properly
    kit.markModified(section);
    if (section === 'role') {
      kit.markModified('questions');
      kit.markModified('flashcards');
    }
    if (section === 'questions' || section === 'schedule') {
      kit.markModified('questions');
      if (section === 'schedule') kit.markModified('schedule');
    }

    await kit.save();
    res.json(kit);
  } catch (error) {
    console.error('Regeneration error:', error);
    res.status(500).json({ error: error.message || 'Failed to regenerate section' });
  }
});

// POST /api/kits/:id/questions
router.post('/:id/questions', requireOwnership, async (req, res) => {
  const { category, prompt, answer_outline, difficulty, requirement_ids } = req.body;
  const newQuestion = {
    id: `q-manual-${Date.now()}`,
    requirement_ids: requirement_ids || [],
    category,
    prompt,
    answer_outline,
    difficulty,
    _meta: { origin: 'manual', pinned: true }
  };
  req.kit.questions.push(newQuestion);
  await req.kit.save();
  res.status(201).json(newQuestion);
});

// DELETE /api/kits/:id/questions/:qId
router.delete('/:id/questions/:qId', requireOwnership, async (req, res) => {
  req.kit.questions = req.kit.questions.filter(q => q.id !== req.params.qId);
  await req.kit.save();
  res.sendStatus(204);
});

// POST /api/kits/:id/flashcards
router.post('/:id/flashcards', requireOwnership, async (req, res) => {
  const { front, back, requirement_ids } = req.body;
  const newCard = {
    id: `f-manual-${Date.now()}`,
    front, back, requirement_ids: requirement_ids || [],
    _meta: { origin: 'manual', pinned: true }
  };
  req.kit.flashcards.push(newCard);
  await req.kit.save();
  res.status(201).json(newCard);
});

// DELETE /api/kits/:id/flashcards/:fId
router.delete('/:id/flashcards/:fId', requireOwnership, async (req, res) => {
  req.kit.flashcards = req.kit.flashcards.filter(f => f.id !== req.params.fId);
  await req.kit.save();
  res.sendStatus(204);
});

// PATCH /api/kits/:id/questions/reorder
router.patch('/:id/questions/reorder', requireOwnership, async (req, res) => {
  const { orderedIds } = req.body; // array of question IDs
  const qMap = new Map(req.kit.questions.map(q => [q.id, q]));
  const orderedQuestions = orderedIds.map(id => qMap.get(id)).filter(Boolean);
  const missing = req.kit.questions.filter(q => !orderedIds.includes(q.id));
  req.kit.questions = [...orderedQuestions, ...missing];
  await req.kit.save();
  res.json(req.kit.questions);
});

// PATCH /api/kits/:id/questions/:qId/move
router.patch('/:id/questions/:qId/move', requireOwnership, async (req, res) => {
  const { category } = req.body;
  const q = req.kit.questions.find(q => q.id === req.params.qId);
  if (q) {
    q.category = category;
    if (q._meta) q._meta.pinned = true;
    else q._meta = { origin: 'edited', pinned: true };
    await req.kit.save();
  }
  res.json(req.kit.questions);
});

// PATCH /api/kits/:id/questions/:qId
router.patch('/:id/questions/:qId', requireOwnership, async (req, res) => {
  const { prompt, answer_outline, difficulty, category } = req.body;
  const q = req.kit.questions.find(q => q.id === req.params.qId);
  if (q) {
    if (prompt !== undefined) q.prompt = prompt;
    if (answer_outline !== undefined) q.answer_outline = answer_outline;
    if (difficulty !== undefined) q.difficulty = difficulty;
    if (category !== undefined) q.category = category;
    if (q._meta) q._meta.pinned = true;
    else q._meta = { origin: 'edited', pinned: true };
    
    req.kit.markModified('questions');
    await req.kit.save();
    return res.json(q);
  }
  res.status(404).json({ error: 'Question not found' });
});

// PATCH /api/kits/:id/flashcards/:fId
router.patch('/:id/flashcards/:fId', requireOwnership, async (req, res) => {
  const { front, back } = req.body;
  const f = req.kit.flashcards.find(f => f.id === req.params.fId);
  if (f) {
    if (front !== undefined) f.front = front;
    if (back !== undefined) f.back = back;
    if (f._meta) f._meta.pinned = true;
    else f._meta = { origin: 'edited', pinned: true };
    
    req.kit.markModified('flashcards');
    await req.kit.save();
    return res.json(f);
  }
  res.status(404).json({ error: 'Flashcard not found' });
});

module.exports = router;
