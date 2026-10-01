const mongoose = require('mongoose');

const KitSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'researching', 'generating', 'checking_coverage', 'ready', 'failed'], default: 'pending' },
  inputHash: { type: String, required: true },
  source: {
    company: String,
    company_url: String,
    role: String,
    location: String,
    jd_chars: Number,
    researched_at: Date,
    pages_used: [String]
  },
  original_jd: String,
  company_brief: mongoose.Schema.Types.Mixed,
  role: mongoose.Schema.Types.Mixed,
  questions: [mongoose.Schema.Types.Mixed],
  flashcards: [mongoose.Schema.Types.Mixed],
  schedule: mongoose.Schema.Types.Mixed,
  coverage: mongoose.Schema.Types.Mixed,
  progress: [mongoose.Schema.Types.Mixed],
}, { timestamps: true });

KitSchema.index({ ownerId: 1, inputHash: 1 }, { unique: true });

module.exports = mongoose.model('Kit', KitSchema);
