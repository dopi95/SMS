const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  year: { type: String, required: true },
  teacherId: { type: String, required: true },
  class: { type: String, required: true },
  section: { type: String },
  records: [{
    studentId: { type: String, required: true },
    studentName: { type: String },
    status: { type: String, enum: ['P', 'A', 'PE', ''], default: '' }
  }]
}, { timestamps: true });

attendanceSchema.index({ date: 1, teacherId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
