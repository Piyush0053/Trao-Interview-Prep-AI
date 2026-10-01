const express = require('express');
const PracticeProgress = require('../models/PracticeProgress');
const Kit = require('../models/Kit');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
router.use(requireAuth);

router.get('/:kitId', async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.kitId, ownerId: req.session.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    
    let progress = await PracticeProgress.findOne({ kitId: kit._id, ownerId: req.session.userId });
    if (!progress) {
      progress = await PracticeProgress.create({ kitId: kit._id, ownerId: req.session.userId, cardStats: {} });
    }
    
    // Order flashcards: least confident first, then never seen, then nextDue
    const flashcards = kit.flashcards.map(f => {
      const fObj = typeof f.toObject === 'function' ? f.toObject() : f;
      const stats = progress.cardStats.get(fObj.id) || { avgConfidence: 0, timesReviewed: 0 };
      return { ...fObj, stats };
    });
    
    flashcards.sort((a, b) => {
      if (a.stats.timesReviewed === 0 && b.stats.timesReviewed > 0) return -1;
      if (b.stats.timesReviewed === 0 && a.stats.timesReviewed > 0) return 1;
      return a.stats.avgConfidence - b.stats.avgConfidence;
    });
    
    res.json({ progress, flashcards });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:kitId/review', async (req, res) => {
  try {
    const { flashcardId, confidence } = req.body;
    let progress = await PracticeProgress.findOne({ kitId: req.params.kitId, ownerId: req.session.userId });
    if (!progress) {
      progress = await PracticeProgress.create({ kitId: req.params.kitId, ownerId: req.session.userId, cardStats: {} });
    }
    
    const stats = progress.cardStats.get(flashcardId) || { timesReviewed: 0, avgConfidence: 0 };
    const newTimes = stats.timesReviewed + 1;
    const newAvg = ((stats.avgConfidence * stats.timesReviewed) + confidence) / newTimes;
    
    const now = new Date();
    // Simple spaced repetition interval calculation based on confidence (1-5)
    const intervalDays = Math.pow(2, confidence - 1);
    const nextDue = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    
    progress.cardStats.set(flashcardId, {
      lastSeen: now,
      timesReviewed: newTimes,
      lastConfidence: confidence,
      avgConfidence: newAvg,
      nextDue: nextDue
    });
    
    progress.lastSessionAt = now;
    await progress.save();
    
    res.json(progress);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
