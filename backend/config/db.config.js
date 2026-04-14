const mongoose = require('mongoose');

let backupConn = null;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Primary Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  // Connect to backup cluster if configured
  if (process.env.MONGODB_BACKUP_URI) {
    try {
      backupConn = await mongoose.createConnection(process.env.MONGODB_BACKUP_URI).asPromise();
      console.log('MongoDB Backup Connected');
    } catch (error) {
      console.warn('MongoDB Backup connection failed (non-fatal):', error.message);
    }
  }
};

const getBackupConn = () => backupConn;

module.exports = connectDB;
module.exports.getBackupConn = getBackupConn;