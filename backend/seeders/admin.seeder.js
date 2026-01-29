const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'elyasat594@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create superadmin user
    const adminUser = new User({
      name: 'Super Admin',
      email: 'elyasat594@gmail.com',
      password: 'admin123',
      role: 'admin'
    });

    await adminUser.save();
    console.log('✅ Superadmin user created successfully');
    console.log('Email: elyasat594@gmail.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();