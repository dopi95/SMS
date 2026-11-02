const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
  bank: {
    type: String,
    enum: ['CBE', 'AWASH', 'UNKNOWN'],
    required: true
  },
  reference: {
    type: String,
    trim: true,
    index: true,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  senderName: {
    type: String,
    trim: true,
    default: ''
  },
  receiverAccount: {
    type: String,
    trim: true,
    default: ''
  },
  senderPhone: {
    type: String,
    trim: true,
    default: ''
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  rawSms: {
    type: String,
    required: true
  },
  matchedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  status: {
    type: String,
    enum: ['unmatched', 'matched', 'ignored'],
    default: 'unmatched'
  },
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

bankTransactionSchema.index({ bank: 1, reference: 1 }, { unique: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(bankTransactionSchema, 'BankTransaction');

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);

