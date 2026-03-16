const Student = require('../models/Student.model');
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
    
    await Student.deleteMany({ _id: { $in: studentIds } });
    await logActivity(req.user, 'Bulk Deleted', 'Student', `Bulk deleted ${studentIds.length} students`);
    res.json({ message: `${studentIds.length} students deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent, bulkUpdateClass, bulkInactive, bulkDelete };