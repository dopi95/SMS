const mongoose = require('mongoose');

const customPaymentFileSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(customPaymentFileSchema, 'CustomPaymentFile');

module.exports = mongoose.model('CustomPaymentFile', customPaymentFileSchema);
