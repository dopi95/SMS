const CustomPaymentFile = require('../models/CustomPaymentFile.model');
const CustomPaymentEntry = require('../models/CustomPaymentEntry.model');
const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const logActivity = require('../utils/logActivity');

// Create new payment file
exports.createFile = asyncHandler(async (req, res) => {
  const { title, year } = req.body;
  
  const file = await CustomPaymentFile.create({ title, year, createdBy: req.user._id });
  await logActivity(req.user, 'Created File', 'Custom Payment', `Created custom payment file "${title}" (${year})`);
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
  await logActivity(req.user, 'Deleted File', 'Custom Payment', `Deleted custom payment file "${file.title}" (${file.year})`);
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
  await logActivity(req.user, 'Edited File', 'Custom Payment', `Edited custom payment file "${file.title}" (${file.year})`);
  res.json(file);
});

// Add entry to file
exports.addEntry = asyncHandler(async (req, res) => {
  const { fileId, studentName, class: studentClass, amount, paymentDate, paymentMethod } = req.body;
  
  const file = await CustomPaymentFile.findById(fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  const entry = await CustomPaymentEntry.create({ fileId, studentName, class: studentClass, amount, paymentDate, paymentMethod });
  await logActivity(req.user, 'Added Entry', 'Custom Payment', `Added entry for "${studentName}" — ${amount} ETB`);
  res.status(201).json(entry);
});

// Update entry
exports.updateEntry = asyncHandler(async (req, res) => {
  const { studentName, class: studentClass, amount, paymentDate, paymentMethod } = req.body;
  
  const entry = await CustomPaymentEntry.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }
  
  entry.studentName = studentName || entry.studentName;
  entry.class = studentClass || entry.class;
  entry.amount = amount || entry.amount;
  entry.paymentDate = paymentDate || entry.paymentDate;
  entry.paymentMethod = paymentMethod || entry.paymentMethod;
  
  await entry.save();
  await logActivity(req.user, 'Edited Entry', 'Custom Payment', `Edited entry for "${entry.studentName}" — ${entry.amount} ETB`);
  res.json(entry);
});

// Delete entry
exports.deleteEntry = asyncHandler(async (req, res) => {
  const entry = await CustomPaymentEntry.findById(req.params.id);
  
  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }
  
  await entry.deleteOne();
  await logActivity(req.user, 'Deleted Entry', 'Custom Payment', `Deleted entry for "${entry.studentName}" — ${entry.amount} ETB`);
  res.json({ message: 'Entry deleted successfully' });
});

// Export file entries to PDF
exports.exportFile = asyncHandler(async (req, res) => {
  const file = await CustomPaymentFile.findById(req.params.id);
  
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  const entries = await CustomPaymentEntry.find({ fileId: file._id })
    .sort({ paymentDate: -1 });
  
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file.title}-${file.year}.pdf"`);
  
  doc.pipe(res);
  
  // Title
  doc.fontSize(20).font('Helvetica-Bold').text(file.title, { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Year: ${file.year} E.C`, { align: 'center' });
  doc.moveDown();
  
  // Table header
  const tableTop = 150;
  const col1 = 50;
  const col2 = 200;
  const col3 = 280;
  const col4 = 360;
  const col5 = 460;
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Student Name', col1, tableTop);
  doc.text('Class', col2, tableTop);
  doc.text('Amount', col3, tableTop);
  doc.text('Date', col4, tableTop);
  doc.text('Method', col5, tableTop);
  
  doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  
  // Table rows
  let y = tableTop + 25;
  
  doc.font('Helvetica').fontSize(9);
  
  entries.forEach((entry, index) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    
    const date = new Date(entry.paymentDate).toLocaleDateString();
    const method = entry.paymentMethod === 'bank' ? 'Bank' : 'Cash';
    
    doc.text(entry.studentName, col1, y, { width: 140, ellipsis: true });
    doc.text(entry.class, col2, y);
    doc.text(`${entry.amount.toLocaleString()} ETB`, col3, y);
    doc.text(date, col4, y);
    doc.text(method, col5, y);
    
    y += 20;
  });
  
  // Footer
  doc.fontSize(8).font('Helvetica').text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    50,
    750,
    { align: 'center' }
  );
  
  doc.end();
});
