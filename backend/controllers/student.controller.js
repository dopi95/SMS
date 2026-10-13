const Student = require('../models/Student.model');
const PendingStudent = require('../models/PendingStudent.model');
const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');
const { sanitizeName, isValidEnglishName, isValidAmharicName, isValidParentName, isValidPhone } = require('../utils/validation');

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getStudentFullName = (s) => (s ? [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') : '');

const upsertStudentCredential = async (student) => {
  const username = student.studentId;
  const plainPassword = generateRandomPassword();
  const fullName = `${student.firstName} ${student.middleName} ${student.lastName}`;
  const email = student.email || `${username.replace('/', '_')}@bluelight.edu`;

  const existing = await User.findOne({ email });
  if (existing) {
    existing.password = plainPassword;
    existing.plainPassword = plainPassword;
    existing.name = fullName;
    await existing.save();
  } else {
    const user = new User({ name: fullName, email, password: plainPassword, plainPassword, role: 'student' });
    await user.save();
  }

  // Save credentials on the student record
  await Student.findByIdAndUpdate(student._id, { portalUsername: username, portalPassword: plainPassword });

  return { studentId: student.studentId, username, password: plainPassword, name: fullName };
};

const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: 'active' });
    res.json(students.map(s => { const d = s.toObject(); d.dateOfBirth = normalizeDOB(d.dateOfBirth); return d; }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInactiveStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: 'inactive' });
    res.json(students.map(s => { const d = s.toObject(); d.dateOfBirth = normalizeDOB(d.dateOfBirth); return d; }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const normalizeDOB = (dob) => {
  if (!dob || dob === 'Invalid Date') return '';
  const s = String(dob).trim();
  // Already dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
  // ISO or any parseable date → convert to dd/mm/yyyy
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const data = student.toObject();
    data.dateOfBirth = normalizeDOB(data.dateOfBirth);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStudent = async (req, res) => {
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
      const result = await cloudinary.uploader.upload(fileArr[0].path, {
        folder,
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      return result.secure_url;
    };
    const files = req.files || {};
    const photoUrl = await uploadPhoto(files.photo, 'students');
    const fatherPhotoUrl = await uploadPhoto(files.fatherPhoto, 'students/parents');
    const motherPhotoUrl = await uploadPhoto(files.motherPhoto, 'students/parents');
    const student = new Student({
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
    });
    await student.save();
    await logActivity(req.user, 'Added', 'Student', `Added student ${getStudentFullName(student)} (ID: ${student.studentId})`);
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const uploadPhoto = async (fileArr, folder) => {
      if (!fileArr?.[0]) return null;
      const result = await cloudinary.uploader.upload(fileArr[0].path, {
        folder,
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      return result.secure_url;
    };
    const files = req.files || {};
    const updateData = { ...req.body };
    // Remove signal fields from updateData
    delete updateData.removePhoto;
    delete updateData.removeFatherPhoto;
    delete updateData.removeMotherPhoto;
    // Remove empty enum fields to avoid validation errors
    if (updateData.section === '') delete updateData.section;
    if (updateData.gender === '') delete updateData.gender;
    if (updateData.class === '') delete updateData.class;
    if (updateData.dateOfBirth === 'Invalid Date') delete updateData.dateOfBirth;
    if (updateData.dateOfBirth) updateData.dateOfBirth = normalizeDOB(updateData.dateOfBirth);

    if (updateData.firstName !== undefined) {
      updateData.firstName = sanitizeName(updateData.firstName);
      if (!isValidEnglishName(updateData.firstName)) return res.status(400).json({ message: 'First name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (updateData.middleName !== undefined) {
      updateData.middleName = sanitizeName(updateData.middleName);
      if (!isValidEnglishName(updateData.middleName)) return res.status(400).json({ message: 'Middle name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (updateData.lastName !== undefined) {
      updateData.lastName = sanitizeName(updateData.lastName);
      if (!isValidEnglishName(updateData.lastName)) return res.status(400).json({ message: 'Last name must contain only English letters and cannot be empty, symbols, or numbers' });
    }
    if (updateData.firstNameAmharic !== undefined && updateData.firstNameAmharic.trim()) {
      updateData.firstNameAmharic = sanitizeName(updateData.firstNameAmharic);
      if (!isValidAmharicName(updateData.firstNameAmharic)) return res.status(400).json({ message: 'Amharic first name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (updateData.middleNameAmharic !== undefined && updateData.middleNameAmharic.trim()) {
      updateData.middleNameAmharic = sanitizeName(updateData.middleNameAmharic);
      if (!isValidAmharicName(updateData.middleNameAmharic)) return res.status(400).json({ message: 'Amharic middle name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (updateData.lastNameAmharic !== undefined && updateData.lastNameAmharic.trim()) {
      updateData.lastNameAmharic = sanitizeName(updateData.lastNameAmharic);
      if (!isValidAmharicName(updateData.lastNameAmharic)) return res.status(400).json({ message: 'Amharic last name must contain only Amharic letters and cannot be symbols or numbers' });
    }
    if (updateData.fatherName !== undefined && updateData.fatherName.trim()) {
      updateData.fatherName = sanitizeName(updateData.fatherName);
      if (!isValidParentName(updateData.fatherName)) return res.status(400).json({ message: "Father's name must contain only letters (no numbers or symbols)" });
    }
    if (updateData.motherName !== undefined && updateData.motherName.trim()) {
      updateData.motherName = sanitizeName(updateData.motherName);
      if (!isValidParentName(updateData.motherName)) return res.status(400).json({ message: "Mother's name must contain only letters (no numbers or symbols)" });
    }
    if (updateData.fatherPhone !== undefined && updateData.fatherPhone.trim()) {
      updateData.fatherPhone = updateData.fatherPhone.trim();
      if (!isValidPhone(updateData.fatherPhone)) return res.status(400).json({ message: 'Father phone must be a 10-digit number starting with 09 or 07' });
    }
    if (updateData.motherPhone !== undefined && updateData.motherPhone.trim()) {
      updateData.motherPhone = updateData.motherPhone.trim();
      if (!isValidPhone(updateData.motherPhone)) return res.status(400).json({ message: 'Mother phone must be a 10-digit number starting with 09 or 07' });
    }

    const photoUrl = await uploadPhoto(files.photo, 'students');
    const fatherPhotoUrl = await uploadPhoto(files.fatherPhoto, 'students/parents');
    const motherPhotoUrl = await uploadPhoto(files.motherPhoto, 'students/parents');

    if (photoUrl) updateData.photo = photoUrl;
    else if (req.body.removePhoto) updateData.photo = '';

    if (fatherPhotoUrl) updateData.fatherPhoto = fatherPhotoUrl;
    else if (req.body.removeFatherPhoto) updateData.fatherPhoto = '';

    if (motherPhotoUrl) updateData.motherPhoto = motherPhotoUrl;
    else if (req.body.removeMotherPhoto) updateData.motherPhoto = '';

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Sync changes back to the linked approved pending record
    if (student.studentId) {
      const pendingUpdate = {};
      const syncFields = ['firstName','middleName','lastName','firstNameAmharic','middleNameAmharic','lastNameAmharic','email','dateOfBirth','joinedYear','address','fatherName','fatherPhone','motherName','motherPhone'];
      syncFields.forEach(k => {
        if (updateData[k] !== undefined && updateData[k] !== 'Invalid Date') {
          pendingUpdate[k] = updateData[k];
        }
      });
      if (updateData.gender) pendingUpdate.gender = updateData.gender.toLowerCase();
      if (updateData.class) {
        const reverseClassMap = { 'Nursery': 'Nursery (ጀማሪ)', 'LKG': 'LKG (ደረጃ 1)', 'UKG': 'UKG (ደረጃ 2)' };
        pendingUpdate.class = reverseClassMap[updateData.class] || updateData.class;
      }
      if (Object.keys(pendingUpdate).length) await PendingStudent.findOneAndUpdate({ studentId: student.studentId, status: 'approved' }, pendingUpdate);
    }

    await logActivity(req.user, 'Edited', 'Student', `Edited student ${getStudentFullName(student)} (ID: ${student.studentId})`);
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Also delete the approved pending record for this student
    await PendingStudent.deleteOne({ studentId: student.studentId, status: 'approved' });
    await logActivity(req.user, 'Deleted', 'Student', `Deleted student ${getStudentFullName(student)} (ID: ${student.studentId})`);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const inactiveStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      { status: 'inactive' }, 
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await logActivity(req.user, 'Deactivated', 'Student', `Marked student ${getStudentFullName(student)} as inactive`);
    res.json({ message: 'Student marked as inactive successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const activateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      { status: 'active' }, 
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await logActivity(req.user, 'Activated', 'Student', `Reactivated student ${getStudentFullName(student)}`);
    res.json({ message: 'Student activated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkUpdatePaymentCode = async (req, res) => {
  try {
    const { studentIds, paymentCode } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0)
      return res.status(400).json({ message: 'Student IDs are required' });
    await Student.updateMany({ _id: { $in: studentIds } }, { $set: { paymentCode: paymentCode ?? '' } });
    res.json({ message: `${studentIds.length} students updated successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkUpdateClass = async (req, res) => {
  try {
    const { studentIds, classValue, section } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    const updateData = {};
    if (classValue) updateData.class = classValue;
    if (section) updateData.section = section;
    
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: updateData }
    );
    
    res.json({ message: `${studentIds.length} students updated successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkInactive = async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { status: 'inactive' } }
    );
    
    res.json({ message: `${studentIds.length} students marked as inactive successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs are required' });
    }
    
    const deletedStudents = await Student.find({ _id: { $in: studentIds } }, { studentId: 1 });
    await Student.deleteMany({ _id: { $in: studentIds } });
    // Also delete approved pending records for these students
    const ids = deletedStudents.map(s => s.studentId).filter(Boolean);
    if (ids.length) await PendingStudent.deleteMany({ studentId: { $in: ids }, status: 'approved' });
    await logActivity(req.user, 'Bulk Deleted', 'Student', `Bulk deleted ${studentIds.length} students`);
    res.json({ message: `${studentIds.length} students deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkImport = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0)
      return res.status(400).json({ message: 'No students provided' });

    const validClasses = ['Nursery', 'LKG', 'UKG'];
    const validSections = ['A', 'B', 'C', 'D'];
    const validGenders = ['Male', 'Female'];

    const results = { created: 0, failed: [], students: [] };

    for (const row of students) {
      try {
        // Flexible class matching: "nursery", "NURSERY", "lkg", "ukg" etc.
        const classVal = validClasses.find(c => c.toLowerCase() === (row.class || '').toLowerCase().trim()) || null;
        // Flexible section: strip spaces
        const sectionVal = validSections.find(s => s.toLowerCase() === (row.section || '').toLowerCase().trim()) || undefined;
        // Flexible gender: accept "m"/"f" shorthand too
        let genderInput = (row.gender || '').toLowerCase().trim();
        if (genderInput === 'm') genderInput = 'male';
        if (genderInput === 'f') genderInput = 'female';
        const genderVal = validGenders.find(g => g.toLowerCase() === genderInput) || null;

        const missing = [];
        if (!row.firstName) missing.push('firstName');
        if (!row.middleName) missing.push('middleName');
        if (!row.lastName) missing.push('lastName');
        if (!classVal) missing.push(`class (got: "${row.class}")`);
        if (!genderVal) missing.push(`gender (got: "${row.gender}")`);
        if (!row.joinedYear) missing.push('joinedYear');

        if (missing.length > 0) {
          results.failed.push({ row, reason: `Missing or invalid: ${missing.join(', ')}` });
          continue;
        }

        const parseDateToEC = (val) => {
          if (!val) return undefined;
          const s = String(val).trim();
          // Already dd/mm/yyyy
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
          // Try to parse and convert to dd/mm/yyyy
          const dmyMatch = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
          if (dmyMatch) return `${dmyMatch[1].padStart(2,'0')}/${dmyMatch[2].padStart(2,'0')}/${dmyMatch[3]}`;
          const d = new Date(s);
          if (isNaN(d.getTime())) return undefined;
          return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
        };

        const student = new Student({
          firstName: row.firstName,
          middleName: row.middleName,
          lastName: row.lastName,
          firstNameAmharic: row.firstNameAmharic || '',
          middleNameAmharic: row.middleNameAmharic || '',
          lastNameAmharic: row.lastNameAmharic || '',
          email: row.email || '',
          gender: genderVal,
          dateOfBirth: parseDateToEC(row.dateOfBirth),
          joinedYear: String(row.joinedYear),
          class: classVal,
          section: sectionVal,
          address: row.address || '',
          paymentCode: row.paymentCode || '',
          fatherName: row.fatherName || '',
          fatherPhone: String(row.fatherPhone || ''),
          motherName: row.motherName || '',
          motherPhone: String(row.motherPhone || ''),
        });

        await student.save();
        results.created++;
        results.students.push(student);
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    await logActivity(req.user, 'Bulk Imported', 'Student', `Imported ${results.created} students`);
    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkAssignSections = async (req, res) => {
  try {
    const { classValue, numSections, studentsPerSection } = req.body;
    if (!classValue || !numSections || numSections < 1)
      return res.status(400).json({ message: 'classValue and numSections are required' });

    const students = await Student.find({ status: 'active', class: classValue }, { _id: 1, createdAt: 1 }).sort({ createdAt: 1 });
    if (students.length === 0)
      return res.status(404).json({ message: 'No active students found for this class' });

    // Sort by registration date (earliest = Section A)
    const shuffled = students.map(s => s._id.toString());
    const sections = ['A', 'B', 'C', 'D', 'E'];
    const limit = studentsPerSection ? parseInt(studentsPerSection) : Math.ceil(shuffled.length / numSections);

    const assignments = [];
    for (let i = 0; i < shuffled.length; i++) {
      const sectionIndex = Math.min(Math.floor(i / limit), numSections - 1);
      assignments.push({ id: shuffled[i], section: sections[sectionIndex] });
    }

    // Bulk write
    const bulkOps = assignments.map(a => ({
      updateOne: { filter: { _id: a.id }, update: { $set: { section: a.section } } }
    }));
    await Student.bulkWrite(bulkOps);

    await logActivity(req.user, 'Assigned Sections', 'Student', `Randomly assigned sections for ${assignments.length} students in ${classValue}`);
    res.json({ message: `Sections assigned for ${assignments.length} students`, assignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCredential = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const student = await Student.findById(req.params.id, { studentId: 1, firstName: 1, middleName: 1, lastName: 1, portalUsername: 1, portalPassword: 1 });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({
      studentId: student.studentId,
      name: `${student.firstName} ${student.middleName} ${student.lastName}`,
      username: student.portalUsername || null,
      password: student.portalPassword || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllCredentials = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const students = await Student.find(
      { status: 'active', portalUsername: { $ne: '' }, portalPassword: { $ne: '' } },
      { studentId: 1, firstName: 1, middleName: 1, lastName: 1, class: 1, section: 1, portalUsername: 1, portalPassword: 1 }
    );
    const credentials = students
      .filter(s => s.portalUsername && s.portalPassword)
      .map(s => ({
        studentId: s.studentId,
        name: `${s.firstName} ${s.middleName} ${s.lastName}`,
        class: s.class,
        section: s.section || '',
        username: s.portalUsername,
        password: s.portalPassword
      }));
    res.json({ credentials });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateCredentials = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const students = await Student.find({ status: 'active' });
    if (students.length === 0) return res.status(404).json({ message: 'No active students found' });
    const results = [];
    for (const s of students) {
      if (!s.studentId) continue;
      results.push(await upsertStudentCredential(s));
    }
    await logActivity(req.user, 'Generated Credentials', 'Student', `Generated credentials for ${results.length} students`);
    res.json({ message: `Credentials generated for ${results.length} students`, credentials: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateCredentialSingle = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.studentId) return res.status(400).json({ message: 'Student has no ID yet' });
    const result = await upsertStudentCredential(student);
    await logActivity(req.user, 'Generated Credential', 'Student', `Generated credential for ${getStudentFullName(student)}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent, bulkUpdateClass, bulkUpdatePaymentCode, bulkInactive, bulkDelete, bulkImport, bulkAssignSections, generateCredentials, generateCredentialSingle, getCredential, getAllCredentials };