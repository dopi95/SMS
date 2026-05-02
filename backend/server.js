const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db.config');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env.production') });
} else {
  require('dotenv').config();
}

const app = express();

// Connect to database
connectDB();

// Middleware
const allowedOrigins = [
  'https://blasms.vercel.app',
  'https://blsms.vercel.app',
  'https://sms-frontend.vercel.app',
  'https://bluelight-sms.vercel.app',
  'https://sms-rjml.vercel.app',
  'https://sms-vwyd.onrender.com',
  'https://lbk-sms.vercel.app',
  'https://admission.bluelight.edu.et',
  'https://portal.bluelight.edu.et',
  'https://bluelight.edu.et',
  'http://localhost:4500',
  'http://localhost:3500',
  'http://localhost:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain or bluelight.edu.et subdomain
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.bluelight.edu.et') ||
      origin === 'https://bluelight.edu.et' ||
      allowedOrigins.indexOf(origin) !== -1
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/teachers', require('./routes/teacher.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/custom-payments', require('./routes/customPayment.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/pending-students', require('./routes/pendingStudent.routes'));
app.use('/api/admins', require('./routes/admin.routes'));
app.use('/api/activity-logs', require('./routes/activityLog.routes'));
app.use('/api/notification-history', require('./routes/notificationHistory.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Bluelight SMS Backend API',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    status: 'running'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);

  // Auto backup every 24 hours
  const { uploadBackupToCloudinary } = require('./utils/backup');
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const runBackup = () => {
    uploadBackupToCloudinary()
      .then(() => console.log('[Backup] Auto backup completed'))
      .catch(err => console.error('[Backup] Auto backup failed:', err.message));
  };

  // Run once 1 min after server starts, then every 24h
  setTimeout(() => { runBackup(); setInterval(runBackup, TWENTY_FOUR_HOURS); }, 60 * 1000);
});