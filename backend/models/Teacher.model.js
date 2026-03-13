const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  year: { type: String, required: true },
  monthlySalary: { type: Number, required: true }
});

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  role: { type: String, required: true },
  qualification: { type: String },
  qualificationLevel: { type: String },
  experienceYears: { type: String },
  address: { type: String },
  sex: { type: String, required: true },
  employmentDate: { type: String, required: true },
  employmentType: { type: String, required: true },
  teachingClass: { type: String },
  teachingSubject: { type: String },
  photo: { type: String },
  isActive: { type: Boolean, default: true },
  salaries: [salarySchema]
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);