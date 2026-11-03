const mongoose = require('mongoose');

const bankPayerMappingSchema = new mongoose.Schema({
  payerName: {
    type: String,
    required: true,
    trim: true
  },
  cleanPayerName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  accountNumber: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }],
  notes: {
    type: String,
    default: 'Learned from manual link'
  },
  lastLinkedAt: {
    type: Date,
    default: Date.now
  },
  linkCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

bankPayerMappingSchema.index({ cleanPayerName: 1, accountNumber: 1 });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(bankPayerMappingSchema, 'BankPayerMapping');

module.exports = mongoose.model('BankPayerMapping', bankPayerMappingSchema);

