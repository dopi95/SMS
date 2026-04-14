require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: 'elyasyenealem@gmail.com' });
  if (existing) {
    console.log('Superadmin already exists.');
    process.exit(0);
  }

  await User.create({
    name: 'Super Admin',
    email: 'elyasyenealem@gmail.com',
    password: 'ela123',
    plainPassword: 'ela123',
    role: 'superadmin',
  });

  console.log('Superadmin created successfully.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
