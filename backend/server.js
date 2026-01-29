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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app', 'https://your-frontend-domain.netlify.app']
    : ['http://localhost:4500', 'http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});