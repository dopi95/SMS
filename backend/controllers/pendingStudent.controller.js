const PendingStudent = require('../models/PendingStudent.model');
const Student = require('../models/Student.model');
const cloudinary = require('../config/cloudinary.config');

const submitPending = async (req, res) => {
  try {
    let photoUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'pending_students',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      photoUrl = result.secure_url;
    }
    const pending = new PendingStudent({ ...req.body, photo: photoUrl });
    await pending.save();
    res.status(201).json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPending = async (req, res) => {
  try {
    const students = await PendingStudent.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingCount = async (req, res) => {
  try {
    const count = await PendingStudent.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approvePending = async (req, res) => {
  try {
    const pending = await PendingStudent.findById(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });

    const classMap = {
      'Nursery (ጀማሪ)': 'Nursery',
      'LKG (ደረጃ 1)': 'LKG',
      'UKG (ደረጃ 2)': 'UKG',
    };

    const student = new Student({
      firstName: pending.firstName,
      middleName: pending.middleName,
      lastName: pending.lastName,
      firstNameAmharic: pending.firstNameAmharic,
      middleNameAmharic: pending.middleNameAmharic,
      lastNameAmharic: pending.lastNameAmharic,
      gender: pending.gender === 'male' ? 'Male' : 'Female',
      email: pending.email,
      dateOfBirth: pending.dateOfBirth ? new Date(pending.dateOfBirth) : undefined,
      joinedYear: pending.joinedYear,
      class: classMap[pending.class] || pending.class,
      address: pending.address,
      photo: pending.photo,
      fatherName: pending.fatherName,
      fatherPhone: pending.fatherPhone,
      motherName: pending.motherName,
      motherPhone: pending.motherPhone,
      status: 'active',
    });
    await student.save();
    await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.json({ message: 'Student approved and added', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectPending = async (req, res) => {
  try {
    const pending = await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!pending) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitPending, getPending, getPendingCount, approvePending, rejectPending };
