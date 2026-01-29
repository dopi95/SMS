const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true, sparse: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  lastName: { type: String, required: true },
  firstNameAmharic: { type: String },
  middleNameAmharic: { type: String },
  lastNameAmharic: { type: String },
  email: { type: String },
  gender: { type: String, required: true, enum: ['Male', 'Female'] },
  dateOfBirth: { type: Date },
  joinedYear: { type: String, required: true },
  class: { type: String, required: true, enum: ['Nursery', 'LKG', 'UKG'] },
  section: { type: String, enum: ['A', 'B', 'C', 'D'] },
  address: { type: String },
  paymentCode: { type: String },
  photo: { type: String },
  fatherName: { type: String },
  fatherPhone: { type: String },
  motherName: { type: String },
  motherPhone: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  enrollmentDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-generate or update studentId
studentSchema.pre('save', async function(next) {
  const year = this.joinedYear ? this.joinedYear.toString() : '';
  
  if (!this.studentId) {
    // New student - generate new ID
    const lastStudent = await mongoose.model('Student').findOne(
      { studentId: { $regex: `^BLUE\\d{3}/${year}$` } },
      {},
      { sort: { studentId: -1 } }
    );
    
    let nextNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      const match = lastStudent.studentId.match(/BLUE(\d{3})\/(\d{4})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    this.studentId = `BLUE${String(nextNumber).padStart(3, '0')}/${year}`;
  } else if (this.isModified('joinedYear') && year.length === 4) {
    // Existing student - update year only
    const match = this.studentId.match(/BLUE(\d{3})\/(\d{4})/);
    if (match) {
      const number = match[1];
      this.studentId = `BLUE${number}/${year}`;
    }
  }
  
  next();
});

module.exports = mongoose.model('Student', studentSchema);