const { v4: uuidv4 } = require('uuid');

function buildSchedule(requirements, questions, daysAvailable) {
  const outQuestions = [...questions];
  const reqMap = new Map(requirements.map(r => [r.id, r]));
  
  const scoredQuestions = outQuestions.map(q => {
    let maxWeight = 0;
    for (const rid of (q.requirement_ids || [])) {
      const r = reqMap.get(rid);
      if (r) {
        const weight = r.priority === 'must' ? 2 : 1;
        if (weight > maxWeight) maxWeight = weight;
      }
    }
    const score = maxWeight * q.difficulty;
    return { ...q, score };
  });

  // Check post-condition: every "must" requirement is scheduled
  const scheduledReqIds = new Set();
  for (const q of scoredQuestions) {
    for (const rid of (q.requirement_ids || [])) {
      scheduledReqIds.add(rid);
    }
  }

  const mustReqs = requirements.filter(r => r.priority === 'must');
  for (const r of mustReqs) {
    if (!scheduledReqIds.has(r.id)) {
      // Inject fallback question for missed must-haves
      const fallbackId = `q-fallback-${uuidv4().slice(0,8)}`;
      const fallbackQ = {
        id: fallbackId,
        requirement_ids: [r.id],
        category: "technical",
        prompt: `Review core concept: ${r.text}`,
        answer_outline: "Focus on fundamental principles related to this requirement.",
        difficulty: 3, // Assigned high difficulty to push it earlier in schedule
        score: 6, // max score
        _meta: { origin: "generated", pinned: false }
      };
      
      outQuestions.push(fallbackQ);
      scoredQuestions.push(fallbackQ);
    }
  }

  // Sort hardest/highest priority first
  scoredQuestions.sort((a, b) => b.score - a.score);

  const days = Array.from({ length: daysAvailable }, (_, i) => ({
    day: i + 1,
    questions: [],
    minutes: 0,
    categories: []
  }));

  // Distribute chunks so earlier days get the hardest/highest priority items
  const baseSize = Math.floor(scoredQuestions.length / daysAvailable);
  let remainder = scoredQuestions.length % daysAvailable;

  let currentQIndex = 0;
  for (let i = 0; i < daysAvailable; i++) {
    let daySize = baseSize + (remainder > 0 ? 1 : 0);
    remainder--;

    for (let j = 0; j < daySize; j++) {
      if (currentQIndex < scoredQuestions.length) {
        const q = scoredQuestions[currentQIndex++];
        days[i].questions.push(q);
        days[i].minutes += (10 + 5 * q.difficulty);
        if (q.category) {
          days[i].categories.push(q.category);
        }
      }
    }
  }

  const scheduleDays = days.map(d => {
    const catCounts = {};
    let maxCat = "";
    let maxCount = 0;
    for (const cat of d.categories) {
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      if (catCounts[cat] > maxCount) {
        maxCount = catCounts[cat];
        maxCat = cat;
      }
    }
    
    return {
      day: d.day,
      focus: maxCat ? `${maxCat.charAt(0).toUpperCase() + maxCat.slice(1)} Focus` : "Mixed Review",
      question_ids: d.questions.map(q => q.id),
      minutes: d.minutes
    };
  });

  return { scheduleDays, updatedQuestions: outQuestions };
}

module.exports = { buildSchedule };
