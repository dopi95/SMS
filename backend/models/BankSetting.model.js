const mongoose = require('mongoose');

const bankSettingSchema = new mongoose.Schema({
  cbeAccount: {
    type: String,
    trim: true,
    default: ''
  },
  cbePhone: {
    type: String,
    trim: true,
    default: ''
  },
  cbeActive: {
    type: Boolean,
    default: true
  },
  awashAccount: {
    type: String,
    trim: true,
    default: ''
  },
  awashPhone: {
    type: String,
    trim: true,
    default: ''
  },
  awashActive: {
    type: Boolean,
    default: true
  },
  webhookSecret: {
    type: String,
    trim: true,
    default: () => 'bluelight_sec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
  }
}, {
  timestamps: true
});

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(bankSettingSchema, 'BankSetting');

module.exports = mongoose.model('BankSetting', bankSettingSchema);

