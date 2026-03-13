const CustomPaymentFile = require('../models/CustomPaymentFile.model');
const CustomPaymentEntry = require('../models/CustomPaymentEntry.model');
const asyncHandler = require('../utils/asyncHandler');

// Create new payment file
exports.createFile = asyncHandler(async (req, res) => {
  const { title, year } = req.body;
  
  const file = await CustomPaymentFile.create({
    title,
    year,
    createdBy: req.user._id
  });
  
  res.status(201).json(file);
});

// Get all payment files
exports.getFiles = asyncHandler(async (req, res) => {
  const files = await CustomPaymentFile.find()
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  
  res.json(files);
});

// Get single file with entries
exports.getFile = asyncHandler(async (req, res) => {
  const file = await CustomPaymentFile.findById(req.params.id)
    .populate('createdBy', 'name email');
  
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  const entries = await CustomPaymentEntry.find({ fileId: file._id })
    .sort({ paymentDate: -1 });
  
  res.json({ file, entries });
});

// Delete file
exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await CustomPaymentFile.findById(req.params.id);
  
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  await CustomPaymentEntry.deleteMany({ fileId: file._id });
  await file.deleteOne();
  
  res.json({ message: 'File deleted successfully' });
});

// Update file
exports.updateFile = asyncHandler(async (req, res) => {
  const { title, year } = req.body;
  
  const file = await CustomPaymentFile.findById(req.params.id);
  
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  file.title = title || file.title;
  file.year = year || file.year;
  
  await file.save();
  res.json(file);
});

// Add entry to file
exports.addEntry = asyncHandler(async (req, res) => {
  const { fileId, studentName, class: studentClass, amount, paymentDate } = req.body;
  
  const file = await CustomPaymentFile.findById(fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  const entry = await CustomPaymentEntry.create({
    fileId,
    studentName,
    class: studentClass,
    amount,
    paymentDate
  });
  
  res.status(201).json(entry);
});

// Update entry
exports.updateEntry = asyncHandler(async (req, res) => {
  const { studentName, class: studentClass, amount, paymentDate } = req.body;
  
  const entry = await CustomPaymentEntry.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }
  
  entry.studentName = studentName || entry.studentName;
  entry.class = studentClass || entry.class;
  entry.amount = amount || entry.amount;
  entry.paymentDate = paymentDate || entry.paymentDate;
  
  await entry.save();
  res.json(entry);
});

// Delete entry
exports.deleteEntry = asyncHandler(async (req, res) => {
  const entry = await CustomPaymentEntry.findById(req.params.id);
  
  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }
  
  await entry.deleteOne();
  res.json({ message: 'Entry deleted successfully' });
});
