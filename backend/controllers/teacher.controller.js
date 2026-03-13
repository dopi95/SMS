const Teacher = require('../models/Teacher.model');
const cloudinary = require('../config/cloudinary.config');

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTeacher = async (req, res) => {
  try {
    // Generate auto-incremented teacher ID
    const lastTeacher = await Teacher.findOne().sort({ teacherId: -1 });
    let newIdNumber = 1;
    
    if (lastTeacher && lastTeacher.teacherId) {
      const lastNumber = parseInt(lastTeacher.teacherId.replace('BLSTAFF', ''));
      if (!isNaN(lastNumber)) {
        newIdNumber = lastNumber + 1;
      }
    }
    
    const teacherId = `BLSTAFF${String(newIdNumber).padStart(3, '0')}`;
    
    let photoUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path || `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
        folder: 'teachers'
      });
      photoUrl = result.secure_url;
    }
    
    // Parse salaries if it's a string
    let salaries = [];
    if (req.body.salaries) {
      salaries = typeof req.body.salaries === 'string' ? JSON.parse(req.body.salaries) : req.body.salaries;
    }
    
    const teacher = new Teacher({
      ...req.body,
      teacherId,
      photo: photoUrl,
      salaries
    });
    
    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTeacher = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path || `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
        folder: 'teachers'
      });
      updateData.photo = result.secure_url;
    }
    
    // Parse salaries if it's a string
    if (updateData.salaries && typeof updateData.salaries === 'string') {
      updateData.salaries = JSON.parse(updateData.salaries);
    }
    
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher };