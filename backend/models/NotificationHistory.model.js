const mongoose = require('mongoose');

const failedRecipientSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  studentName: { type: String, default: '' },
  parentName: { type: String, default: '' },
  error: { type: String, default: '' },
}, { _id: false });

const notificationHistorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipients: { type: Number, default: 0 },
  phoneNumbers: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  failedDetails: [failedRecipientSchema],
  sentBy: { type: String, required: true },
  sentById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(notificationHistorySchema, 'NotificationHistory');

module.exports = mongoose.model('NotificationHistory', notificationHistorySchema);
