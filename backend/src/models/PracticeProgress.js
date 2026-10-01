const mongoose = require('mongoose');

const cardStatSchema = new mongoose.Schema({
  lastSeen: Date,
  timesReviewed: { type: Number, default: 0 },
  lastConfidence: { type: Number, min: 1, max: 5 },
  avgConfidence: { type: Number, default: 0 },
  nextDue: Date
}, { _id: false });

const practiceProgressSchema = new mongoose.Schema({
  kitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kit', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cardStats: {
    type: Map,
    of: cardStatSchema,
    default: {}
  },
  sessionsCompleted: { type: Number, default: 0 },
  lastSessionAt: Date
}, { timestamps: true });

practiceProgressSchema.index({ kitId: 1, ownerId: 1 }, { unique: true });

module.exports = mongoose.model('PracticeProgress', practiceProgressSchema);
