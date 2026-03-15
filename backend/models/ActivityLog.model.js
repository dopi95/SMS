const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByName: { type: String, required: true },
  performedByRole: { type: String, required: true },
  action: { type: String, required: true },   // e.g. 'Added', 'Edited', 'Deleted'
  module: { type: String, required: true },   // e.g. 'Student', 'Payment'
  description: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
