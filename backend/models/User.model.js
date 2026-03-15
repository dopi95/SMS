const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const permissionSchema = new mongoose.Schema({
  page: { type: String, required: true },       // e.g. 'students'
  actions: [{ type: String }]                   // e.g. ['view','add','edit','delete']
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String, default: '' }, // stored for display only
  role: { type: String, enum: ['superadmin', 'admin', 'executive', 'teacher', 'student'], required: true },
  permissions: [permissionSchema],
  profilePhoto: { type: String, default: '' },
  phone: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);