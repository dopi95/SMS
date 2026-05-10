const express = require('express');
const { register, login, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const Student = require('../models/Student.model');
const Teacher = require('../models/Teacher.model');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

// Portal login — matches portalUsername + portalPassword on Student or Teacher
router.post('/portal-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

    // Try student
    const student = await Student.findOne({ portalUsername: username, status: 'active' });
    if (student && student.portalPassword === password) {
      return res.json({
        role: 'student',
        profile: {
          _id: student._id,
          studentId: student.studentId,
          firstName: student.firstName, middleName: student.middleName, lastName: student.lastName,
          firstNameAmharic: student.firstNameAmharic, middleNameAmharic: student.middleNameAmharic, lastNameAmharic: student.lastNameAmharic,
          email: student.email, gender: student.gender, dateOfBirth: student.dateOfBirth,
          joinedYear: student.joinedYear, class: student.class, section: student.section,
          address: student.address, paymentCode: student.paymentCode, photo: student.photo,
          fatherName: student.fatherName, fatherPhone: student.fatherPhone, fatherPhoto: student.fatherPhoto,
          motherName: student.motherName, motherPhone: student.motherPhone, motherPhoto: student.motherPhoto,
          portalUsername: student.portalUsername
        }
      });
    }

    // Try teacher/principal
    const teacher = await Teacher.findOne({ portalUsername: username, isActive: true });
    if (teacher && teacher.portalPassword === password) {
      return res.json({
        role: 'teacher',
        profile: {
          _id: teacher._id,
          teacherId: teacher.teacherId, fullName: teacher.fullName,
          email: teacher.email, phone: teacher.phone, role: teacher.role,
          qualification: teacher.qualification, qualificationLevel: teacher.qualificationLevel,
          experienceYears: teacher.experienceYears, address: teacher.address,
          sex: teacher.sex, employmentDate: teacher.employmentDate, employmentType: teacher.employmentType,
          teachingClass: teacher.teachingClass, teachingSection: teacher.teachingSection, teachingSubject: teacher.teachingSubject,
          photo: teacher.photo, portalUsername: teacher.portalUsername
        }
      });
    }

    return res.status(401).json({ message: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Portal change password
router.post('/portal-change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword, role } = req.body;
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ message: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    if (role === 'student') {
      const student = await Student.findOne({ portalUsername: username });
      if (!student || student.portalPassword !== currentPassword) return res.status(401).json({ message: 'Current password is incorrect' });
      await Student.findByIdAndUpdate(student._id, { portalPassword: newPassword });
    } else {
      const teacher = await Teacher.findOne({ portalUsername: username });
      if (!teacher || teacher.portalPassword !== currentPassword) return res.status(401).json({ message: 'Current password is incorrect' });
      await Teacher.findByIdAndUpdate(teacher._id, { portalPassword: newPassword });
    }
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Portal get payments (for student)
router.get('/portal-payments/:studentId', async (req, res) => {
  try {
    const Payment = require('../models/Payment.model');
    const payments = await Payment.find({ studentId: req.params.studentId });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Portal get fresh profile by username (no password needed - already authenticated via localStorage)
router.get('/portal-profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const student = await Student.findOne({ portalUsername: username, status: 'active' });
    if (student) {
      return res.json({
        role: 'student',
        profile: {
          _id: student._id, studentId: student.studentId,
          firstName: student.firstName, middleName: student.middleName, lastName: student.lastName,
          firstNameAmharic: student.firstNameAmharic, middleNameAmharic: student.middleNameAmharic, lastNameAmharic: student.lastNameAmharic,
          email: student.email, gender: student.gender, dateOfBirth: student.dateOfBirth,
          joinedYear: student.joinedYear, class: student.class, section: student.section,
          address: student.address, paymentCode: student.paymentCode, photo: student.photo,
          fatherName: student.fatherName, fatherPhone: student.fatherPhone, fatherPhoto: student.fatherPhoto,
          motherName: student.motherName, motherPhone: student.motherPhone, motherPhoto: student.motherPhoto,
          portalUsername: student.portalUsername
        }
      });
    }
    const teacher = await Teacher.findOne({ portalUsername: username, isActive: true });
    if (teacher) {
      return res.json({
        role: 'teacher',
        profile: {
          _id: teacher._id, teacherId: teacher.teacherId, fullName: teacher.fullName,
          email: teacher.email, phone: teacher.phone, role: teacher.role,
          qualification: teacher.qualification, qualificationLevel: teacher.qualificationLevel,
          experienceYears: teacher.experienceYears, address: teacher.address,
          sex: teacher.sex, employmentDate: teacher.employmentDate, employmentType: teacher.employmentType,
          teachingClass: teacher.teachingClass, teachingSection: teacher.teachingSection, teachingSubject: teacher.teachingSubject,
          photo: teacher.photo, portalUsername: teacher.portalUsername
        }
      });
    }
    res.status(404).json({ message: 'Profile not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Portal: get students by class and section for attendance
router.get('/portal-students/:class/:section', async (req, res) => {
  try {
    const query = { class: req.params.class, status: 'active' };
    if (req.params.section && req.params.section !== 'none') query.section = req.params.section;
    const students = await Student.find(query, 'studentId firstName middleName lastName').sort({ firstName: 1 });
    res.json(students);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Portal: save/update attendance
router.post('/portal-attendance', async (req, res) => {
  try {
    const Attendance = require('../models/Attendance.model');
    const { date, year, teacherId, class: cls, section, records } = req.body;
    const existing = await Attendance.findOne({ date, teacherId });
    if (existing) {
      existing.records = records;
      await existing.save();
      return res.json(existing);
    }
    const att = await Attendance.create({ date, year, teacherId, class: cls, section, records });
    res.status(201).json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Portal: get attendance by date and teacher
router.get('/portal-attendance/:teacherId/:date', async (req, res) => {
  try {
    const Attendance = require('../models/Attendance.model');
    const att = await Attendance.findOne({ teacherId: req.params.teacherId, date: req.params.date });
    res.json(att || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public portal notices endpoint
router.get('/portal-notices', async (req, res) => {
  try {
    const NotificationHistory = require('../models/NotificationHistory.model');
    const notices = await NotificationHistory.find().sort({ createdAt: -1 }).limit(20);
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;