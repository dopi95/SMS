const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  type:      { type: String, enum: ['notice', 'exam', 'event', 'schedule'], default: 'notice' },
  targetClass: { type: String, default: 'all' }, // 'all' | 'Nursery' | 'LKG' | 'UKG'
  scheduledAt: { type: Date, default: null },     // for exam/event date
  isActive:  { type: Boolean, default: true },
  sentBy:    { type: String, required: true },
  sentById:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
