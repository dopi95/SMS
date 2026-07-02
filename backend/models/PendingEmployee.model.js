const mongoose = require('mongoose');

const pendingEmployeeSchema = new mongoose.Schema({
  fullName:           { type: String, required: true },
  email:              { type: String },
  phone:              { type: String, required: true },
  sex:                { type: String, required: true },
  address:            { type: String },
  role:               { type: String, required: true },
  qualification:      { type: String },
  qualificationLevel: { type: String },
  experienceYears:    { type: String, default: '0' },
  employmentDate:     { type: String, required: true },
  employmentType:     { type: String, required: true },
  photo:              { type: String },
  status:             { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(pendingEmployeeSchema, 'PendingEmployee');

module.exports = mongoose.model('PendingEmployee', pendingEmployeeSchema);
