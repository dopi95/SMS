const mongoose = require('mongoose');

const customPaymentEntrySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomPaymentFile',
    required: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank'],
    required: true,
    default: 'cash'
  }
}, {
  timestamps: true
});

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(customPaymentEntrySchema, 'CustomPaymentEntry');

module.exports = mongoose.model('CustomPaymentEntry', customPaymentEntrySchema);
