const Student = require('../models/Student.model');
const cloudinary = require('../config/cloudinary.config');

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
    let photoUrl = '';
    
    // Handle photo upload
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'students',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      photoUrl = result.secure_url;
    }

    const studentData = {
      ...req.body,
      photo: photoUrl
    };

    const student = new Student(studentData);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Handle photo upload
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'students',
        transformation: [{ width: 400, height: 400, crop: 'fill' }]
      });
      updateData.photo = result.secure_url;
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
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
    res.json({ message: 'Student activated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStudents, getInactiveStudents, getStudent, createStudent, updateStudent, deleteStudent, inactiveStudent, activateStudent };