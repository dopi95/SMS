const mongoose = require('mongoose');

const feeSettingSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: String,
    required: true,
    enum: ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June']
  },
  monthlyFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  penaltyFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  penaltyDay: {
    type: Number,
    required: true,
    min: 1,
    max: 30,
    default: 10
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

feeSettingSchema.index({ year: 1, month: 1 }, { unique: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(feeSettingSchema, 'FeeSetting');

module.exports = mongoose.model('FeeSetting', feeSettingSchema);
