const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipients: { type: Number, default: 0 },
  phoneNumbers: { type: Number, default: 0 },
  sentBy: { type: String, required: true },
  sentById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(notificationHistorySchema, 'NotificationHistory');

module.exports = mongoose.model('NotificationHistory', notificationHistorySchema);
