const mongoose = require('mongoose');

const pendingStudentSchema = new mongoose.Schema({
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
  motherName: { type: String },
  motherPhone: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('PendingStudent', pendingStudentSchema);
