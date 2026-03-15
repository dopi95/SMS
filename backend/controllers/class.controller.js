const Class = require('../models/Class.model');

const getClasses = async (req, res) => {
  try {
    const classes = await Class.find().populate('teacher', 'teacherId user').populate('students', 'studentId user');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id).populate('teacher', 'teacherId user').populate('students', 'studentId user');
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClass = async (req, res) => {
  try {
    const classData = new Class(req.body);
    await classData.save();
    await classData.populate('teacher', 'teacherId user');
    res.status(201).json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const classData = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('teacher', 'teacherId user');
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const classData = await Class.findByIdAndDelete(req.params.id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getClasses, getClass, createClass, updateClass, deleteClass };