const PendingStudent = require('../models/PendingStudent.model');
const Student = require('../models/Student.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');

const submitPending = async (req, res) => {
  try {
    const uploadPhoto = async (fileArr, folder) => {
      if (!fileArr?.[0]) return '';
      const result = await cloudinary.uploader.upload(fileArr[0].path, {
        folder,
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      return result.secure_url;
    };
    const files = req.files || {};
    const photoUrl = await uploadPhoto(files.photo, 'pending_students');
    const fatherPhotoUrl = await uploadPhoto(files.fatherPhoto, 'pending_students/parents');
    const motherPhotoUrl = await uploadPhoto(files.motherPhoto, 'pending_students/parents');
    const pending = new PendingStudent({ ...req.body, photo: photoUrl, fatherPhoto: fatherPhotoUrl, motherPhoto: motherPhotoUrl });
    await pending.save();
    res.status(201).json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPending = async (req, res) => {
  try {
    const students = await PendingStudent.find().sort({ createdAt: -1 });
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
      fatherPhoto: pending.fatherPhoto,
      motherName: pending.motherName,
      motherPhone: pending.motherPhone,
      motherPhoto: pending.motherPhoto,
      status: 'active',
    });
    await student.save();
    await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'approved', studentId: student.studentId });
    await logActivity(req.user, 'Approved', 'Pending Student', `Approved registration of ${pending.firstName} ${pending.lastName} (Student ID: ${student.studentId})`);
    res.json({ message: 'Student approved and added', studentId: student.studentId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectPending = async (req, res) => {
  try {
    const pending = await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!pending) return res.status(404).json({ message: 'Not found' });
    await Student.deleteOne({ firstName: pending.firstName, middleName: pending.middleName, lastName: pending.lastName, fatherPhone: pending.fatherPhone });
    await logActivity(req.user, 'Rejected', 'Pending Student', `Rejected registration of ${pending.firstName} ${pending.lastName}`);
    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePending = async (req, res) => {
  try {
    const pending = await PendingStudent.findByIdAndDelete(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });
    await Student.deleteOne({ firstName: pending.firstName, middleName: pending.middleName, lastName: pending.lastName, fatherPhone: pending.fatherPhone });
    await logActivity(req.user, 'Deleted', 'Pending Student', `Deleted registration record of ${pending.firstName} ${pending.lastName}`);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitPending, getPending, getPendingCount, approvePending, rejectPending, deletePending };
