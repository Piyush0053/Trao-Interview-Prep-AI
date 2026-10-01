const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  kitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kit' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  currentStep: { type: String },
  error: { type: mongoose.Schema.Types.Mixed },
  startedAt: { type: Date },
  finishedAt: { type: Date }
});

module.exports = mongoose.model('Job', JobSchema);
