const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary.config');
const Student = require('../models/Student.model');
const Teacher = require('../models/Teacher.model');
const User = require('../models/User.model');
const Class = require('../models/Class.model');
const Payment = require('../models/Payment.model');
const PendingStudent = require('../models/PendingStudent.model');
const CustomPaymentFile = require('../models/CustomPaymentFile.model');
const CustomPaymentEntry = require('../models/CustomPaymentEntry.model');
const ActivityLog = require('../models/ActivityLog.model');

const generateBackup = async () => {
  const [students, teachers, users, classes, payments, pendingStudents, customPaymentFiles, customPaymentEntries, activityLogs] = await Promise.all([
    Student.find().lean(),
    Teacher.find().lean(),
    User.find().select('-password').lean(),
    Class.find().lean(),
    Payment.find().lean(),
    PendingStudent.find().lean(),
    CustomPaymentFile.find().lean(),
    CustomPaymentEntry.find().lean(),
    ActivityLog.find().lean(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    counts: { students: students.length, teachers: teachers.length, users: users.length, classes: classes.length, payments: payments.length },
    data: { students, teachers, users, classes, payments, pendingStudents, customPaymentFiles, customPaymentEntries, activityLogs },
  };
};

const restoreBackup = async (data) => {
  const collections = [
    { model: ActivityLog, key: 'activityLogs' },
    { model: CustomPaymentEntry, key: 'customPaymentEntries' },
    { model: CustomPaymentFile, key: 'customPaymentFiles' },
    { model: Payment, key: 'payments' },
    { model: PendingStudent, key: 'pendingStudents' },
    { model: Class, key: 'classes' },
    { model: User, key: 'users' },
    { model: Teacher, key: 'teachers' },
    { model: Student, key: 'students' },
  ];

  const results = {};

  for (const { model, key } of collections) {
    const records = data[key];
    if (!records || records.length === 0) { results[key] = 0; continue; }

    // upsert by _id so re-running restore won't duplicate
    await Promise.all(
      records.map(doc => model.findByIdAndUpdate(doc._id, doc, { upsert: true, new: true }))
    );
    results[key] = records.length;
  }

  return results;
};

const uploadBackupToCloudinary = async () => {
  const backup = await generateBackup();
  const json = JSON.stringify(backup, null, 2);
  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'sms-backups', public_id: filename },
      (error, result) => {
        if (error) return reject(error);
        console.log(`[Backup] Saved to Cloudinary: ${result.secure_url}`);
        resolve(result);
      }
    );
    Readable.from(Buffer.from(json)).pipe(stream);
  });
};

module.exports = { generateBackup, restoreBackup, uploadBackupToCloudinary };
