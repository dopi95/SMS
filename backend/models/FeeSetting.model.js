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
  penaltyAssignTo: {
    type: String,
    enum: ['all', 'regular', 'special', 'none'],
    default: 'all'
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
  siblingDiscount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
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

const FeeSettingModel = mongoose.model('FeeSetting', feeSettingSchema);

module.exports = FeeSettingModel;
