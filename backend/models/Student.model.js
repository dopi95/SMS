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
  section: { type: String, enum: ['A', 'B', 'C', 'D'], default: undefined },
  address: { type: String },
  paymentCode: { type: String },
  photo: { type: String },
  fatherName: { type: String },
  fatherPhone: { type: String },
  fatherPhoto: { type: String },
  motherName: { type: String },
  motherPhone: { type: String },
  motherPhoto: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  enrollmentDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-generate or update studentId
studentSchema.pre('save', async function(next) {
  const year = this.joinedYear ? this.joinedYear.toString() : '';

  if (!this.studentId) {
    // Find the highest numeric part across ALL students regardless of year
    const allStudents = await mongoose.model('Student').find(
      { studentId: { $regex: /^BLUE\d+\/\d{4}$/ } },
      { studentId: 1 }
    );

    let maxNumber = 0;
    for (const s of allStudents) {
      const match = s.studentId && s.studentId.match(/^BLUE(\d+)\//);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    }

    this.studentId = `BLUE${String(maxNumber + 1).padStart(3, '0')}/${year}`;
  } else if (this.isModified('joinedYear') && year.length === 4) {
    // Existing student — update year part only
    const match = this.studentId.match(/^BLUE(\d+)\//);
    if (match) {
      this.studentId = `BLUE${match[1]}/${year}`;
    }
  }

  next();
});

module.exports = mongoose.model('Student', studentSchema);