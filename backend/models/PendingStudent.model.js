const mongoose = require('mongoose');

const pendingStudentSchema = new mongoose.Schema({
  studentId: { type: String, default: '' },  // filled when approved
  studentType: { type: String, enum: ['new', 'existing'], default: 'new' },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  lastName: { type: String, required: true },
  firstNameAmharic: { type: String },
  middleNameAmharic: { type: String },
  lastNameAmharic: { type: String },
  gender: { type: String, required: true },
  email: { type: String },
  dateOfBirth: { type: String },
  joinedYear: { type: String, required: true },
  class: { type: String, required: true },
  address: { type: String },
  photo: { type: String },
  fatherName: { type: String },
  fatherPhone: { type: String },
  fatherPhoto: { type: String },
  motherName: { type: String },
  motherPhone: { type: String },
  motherPhoto: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

const { registerMirrorHooks } = require('../utils/mirrorSync');
registerMirrorHooks(pendingStudentSchema, 'PendingStudent');

module.exports = mongoose.model('PendingStudent', pendingStudentSchema);
