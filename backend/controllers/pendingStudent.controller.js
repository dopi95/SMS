const PendingStudent = require('../models/PendingStudent.model');
const Student = require('../models/Student.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');
const { sanitizeName, isValidEnglishName, isValidAmharicName, isValidParentName, isValidPhone } = require('../utils/validation');

const getStudentFullName = (s) => (s ? [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') : '');

const submitPending = async (req, res) => {
  try {
    const firstName = sanitizeName(req.body.firstName);
    const middleName = sanitizeName(req.body.middleName);
    const lastName = sanitizeName(req.body.lastName);
    const firstNameAmharic = sanitizeName(req.body.firstNameAmharic);
    const middleNameAmharic = sanitizeName(req.body.middleNameAmharic);
    const lastNameAmharic = sanitizeName(req.body.lastNameAmharic);
    const fatherName = sanitizeName(req.body.fatherName);
    const motherName = sanitizeName(req.body.motherName);
    const fatherPhone = req.body.fatherPhone ? String(req.body.fatherPhone).trim() : '';
    const motherPhone = req.body.motherPhone ? String(req.body.motherPhone).trim() : '';

    if (!isValidEnglishName(firstName)) {
      return res.status(400).json({ message: 'First name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (!isValidEnglishName(middleName)) {
      return res.status(400).json({ message: 'Middle name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (!isValidEnglishName(lastName)) {
      return res.status(400).json({ message: 'Last name must contain only English letters and cannot be empty, symbols, or numbers' });
    }

    if (firstNameAmharic && !isValidAmharicName(firstNameAmharic)) {
      return res.status(400).json({ message: 'Amharic first name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (middleNameAmharic && !isValidAmharicName(middleNameAmharic)) {
      return res.status(400).json({ message: 'Amharic middle name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (lastNameAmharic && !isValidAmharicName(lastNameAmharic)) {
      return res.status(400).json({ message: 'Amharic last name must contain only Amharic letters and cannot be symbols or numbers' });
    }

    if (fatherName && !isValidParentName(fatherName)) {
      return res.status(400).json({ message: "Father's name must contain only letters (no numbers or symbols)" });
    }
    if (motherName && !isValidParentName(motherName)) {
      return res.status(400).json({ message: "Mother's name must contain only letters (no numbers or symbols)" });
    }

    if (fatherPhone && !isValidPhone(fatherPhone)) {
      return res.status(400).json({ message: 'Father phone must be a 10-digit number starting with 09 or 07' });
    }
    if (motherPhone && !isValidPhone(motherPhone)) {
      return res.status(400).json({ message: 'Mother phone must be a 10-digit number starting with 09 or 07' });
    }

    const uploadPhoto = async (fileArr, folder) => {
      if (!fileArr?.[0]) return '';
      const file = fileArr[0];
      const uploadOptions = { folder, transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto:low', fetch_format: 'auto' }] };
      let result;
      if (file.buffer) {
        result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => err ? reject(err) : resolve(res));
          stream.end(file.buffer);
        });
      } else {
        result = await cloudinary.uploader.upload(file.path, uploadOptions);
      }
      return result.secure_url;
    };
    const files = req.files || {};
    const [photoUrl, fatherPhotoUrl, motherPhotoUrl] = await Promise.all([
      uploadPhoto(files.photo, 'pending_students'),
      uploadPhoto(files.fatherPhoto, 'pending_students/parents'),
      uploadPhoto(files.motherPhoto, 'pending_students/parents'),
    ]);

    const payload = {
      ...req.body,
      firstName,
      middleName,
      lastName,
      firstNameAmharic,
      middleNameAmharic,
      lastNameAmharic,
      fatherName,
      motherName,
      fatherPhone,
      motherPhone,
      photo: photoUrl,
      fatherPhoto: fatherPhotoUrl,
      motherPhoto: motherPhotoUrl,
    };
    if (payload.dateOfBirth === 'Invalid Date') {
      delete payload.dateOfBirth;
    }

    const pending = new PendingStudent(payload);
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
      dateOfBirth: (pending.dateOfBirth && pending.dateOfBirth !== 'Invalid Date') ? pending.dateOfBirth : undefined,
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
      studentType: pending.studentType || 'new',
      status: 'active',
    });
    await student.save();
    await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'approved', studentId: student.studentId });
    await logActivity(req.user, 'Approved', 'Pending Student', `Approved registration of ${getStudentFullName(pending)} (Student ID: ${student.studentId})`);
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
    await logActivity(req.user, 'Rejected', 'Pending Student', `Rejected registration of ${getStudentFullName(pending)}`);
    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePending = async (req, res) => {
  try {
    const allowed = [
      'studentType','firstName','middleName','lastName',
      'firstNameAmharic','middleNameAmharic','lastNameAmharic',
      'gender','email','dateOfBirth','joinedYear','class',
      'address','fatherName','fatherPhone','motherName','motherPhone',
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined && req.body[k] !== 'Invalid Date') update[k] = req.body[k]; });

    if (update.firstName !== undefined) {
      update.firstName = sanitizeName(update.firstName);
      if (!isValidEnglishName(update.firstName)) return res.status(400).json({ message: 'First name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (update.middleName !== undefined) {
      update.middleName = sanitizeName(update.middleName);
      if (!isValidEnglishName(update.middleName)) return res.status(400).json({ message: 'Middle name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (update.lastName !== undefined) {
      update.lastName = sanitizeName(update.lastName);
      if (!isValidEnglishName(update.lastName)) return res.status(400).json({ message: 'Last name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (update.firstNameAmharic !== undefined && update.firstNameAmharic.trim()) {
      update.firstNameAmharic = sanitizeName(update.firstNameAmharic);
      if (!isValidAmharicName(update.firstNameAmharic)) return res.status(400).json({ message: 'Amharic first name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (update.middleNameAmharic !== undefined && update.middleNameAmharic.trim()) {
      update.middleNameAmharic = sanitizeName(update.middleNameAmharic);
      if (!isValidAmharicName(update.middleNameAmharic)) return res.status(400).json({ message: 'Amharic middle name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (update.lastNameAmharic !== undefined && update.lastNameAmharic.trim()) {
      update.lastNameAmharic = sanitizeName(update.lastNameAmharic);
      if (!isValidAmharicName(update.lastNameAmharic)) return res.status(400).json({ message: 'Amharic last name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (update.fatherName !== undefined && update.fatherName.trim()) {
      update.fatherName = sanitizeName(update.fatherName);
      if (!isValidParentName(update.fatherName)) return res.status(400).json({ message: "Father's name must contain only letters (no numbers or symbols)" });
    }
    if (update.motherName !== undefined && update.motherName.trim()) {
      update.motherName = sanitizeName(update.motherName);
      if (!isValidParentName(update.motherName)) return res.status(400).json({ message: "Mother's name must contain only letters (no numbers or symbols)" });
    }
    if (update.fatherPhone !== undefined && update.fatherPhone.trim()) {
      update.fatherPhone = update.fatherPhone.trim();
      if (!isValidPhone(update.fatherPhone)) return res.status(400).json({ message: 'Father phone must be a 10-digit number starting with 09 or 07' });
    }
    if (update.motherPhone !== undefined && update.motherPhone.trim()) {
      update.motherPhone = update.motherPhone.trim();
      if (!isValidPhone(update.motherPhone)) return res.status(400).json({ message: 'Mother phone must be a 10-digit number starting with 09 or 07' });
    }

    const pending = await PendingStudent.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pending) return res.status(404).json({ message: 'Not found' });

    // If approved, sync changes to the linked Student record
    if (pending.status === 'approved' && pending.studentId) {
      const classMap = { 'Nursery (ጀማሪ)': 'Nursery', 'LKG (ደረጃ 1)': 'LKG', 'UKG (ደረጃ 2)': 'UKG' };
      const studentUpdate = {};
      const syncFields = ['firstName','middleName','lastName','firstNameAmharic','middleNameAmharic','lastNameAmharic','email','dateOfBirth','joinedYear','address','fatherName','fatherPhone','motherName','motherPhone'];
      syncFields.forEach(k => { if (update[k] !== undefined && update[k] !== 'Invalid Date') studentUpdate[k] = update[k]; });
      if (update.gender) studentUpdate.gender = update.gender === 'male' ? 'Male' : update.gender === 'female' ? 'Female' : update.gender;
      if (update.class) studentUpdate.class = classMap[update.class] || update.class;
      if (Object.keys(studentUpdate).length) await Student.findOneAndUpdate({ studentId: pending.studentId }, studentUpdate);
    }

    await logActivity(req.user, 'Updated', 'Pending Student', `Updated registration of ${getStudentFullName(pending)}`);
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const makePendingAgain = async (req, res) => {
  try {
    const pending = await PendingStudent.findById(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });
    // Remove the linked student record if it was approved
    if (pending.studentId) {
      await Student.deleteOne({ studentId: pending.studentId });
    }
    await PendingStudent.findByIdAndUpdate(req.params.id, { status: 'pending', studentId: undefined });
    await logActivity(req.user, 'Reset to Pending', 'Pending Student', `Reset registration of ${getStudentFullName(pending)} back to pending`);
    res.json({ message: 'Status reset to pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePending = async (req, res) => {
  try {
    const pending = await PendingStudent.findByIdAndDelete(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });
    await Student.deleteOne({ firstName: pending.firstName, middleName: pending.middleName, lastName: pending.lastName, fatherPhone: pending.fatherPhone });
    await logActivity(req.user, 'Deleted', 'Pending Student', `Deleted registration record of ${getStudentFullName(pending)}`);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitPending, getPending, getPendingCount, approvePending, rejectPending, deletePending, makePendingAgain, updatePending };
