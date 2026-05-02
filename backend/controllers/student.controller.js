const Student = require('../models/Student.model');
const PendingStudent = require('../models/PendingStudent.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');

const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: 'active' });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInactiveStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: 'inactive' });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStudent = async (req, res) => {
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
    const photoUrl = await uploadPhoto(files.photo, 'students');
    const fatherPhotoUrl = await uploadPhoto(files.fatherPhoto, 'students/parents');
    const motherPhotoUrl = await uploadPhoto(files.motherPhoto, 'students/parents');
    const student = new Student({ ...req.body, photo: photoUrl, fatherPhoto: fatherPhotoUrl, motherPhoto: motherPhotoUrl });
    await student.save();
    await logActivity(req.user, 'Added', 'Student', `Added student ${student.firstName} ${student.lastName} (ID: ${student.studentId})`);
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
    await logActivity(req.user, 'Edited', 'Student', `Edited student ${student.firstName} ${student.lastName} (ID: ${student.studentId})`);
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
    await logActivity(req.user, 'Deleted', 'Student', `Deleted student ${student.firstName} ${student.lastName} (ID: ${student.studentId})`);
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
    await logActivity(req.user, 'Deactivated', 'Student', `Marked student ${student.firstName} ${student.lastName} as inactive`);
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
    await logActivity(req.user, 'Activated', 'Student', `Reactivated student ${student.firstName} ${student.lastName}`);
    res.json({ message: 'Student activated successfully' });
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

        const parseDate = (val) => {
          if (!val) return undefined;
          // dd/mm/yyyy → Date
          const dmyMatch = String(val).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmyMatch) return new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`);
          const d = new Date(val);
          return isNaN(d.getTime()) ? undefined : d;
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
          dateOfBirth: parseDate(row.dateOfBirth),
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

    const students = await Student.find({ status: 'active', class: classValue }, { _id: 1 });
    if (students.length === 0)
      return res.status(404).json({ message: 'No active students found for this class' });

    // Shuffle students randomly
    const shuffled = students.map(s => s._id.toString()).sort(() => Math.random() - 0.5);
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

module.exports = { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent, bulkUpdateClass, bulkInactive, bulkDelete, bulkImport, bulkAssignSections };