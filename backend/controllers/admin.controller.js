const User = require('../models/User.model');
const bcrypt = require('bcryptjs');

const ALL_PAGES = [
  { page: 'dashboard',        actions: ['view'] },
  { page: 'students',         actions: ['view','add','edit','delete','inactive'] },
  { page: 'employees',        actions: ['view','add','edit','delete','inactive'] },
  { page: 'payments',         actions: ['view','add','delete'] },
  { page: 'custom-payment',   actions: ['view','add','edit','delete'] },
  { page: 'pending-students', actions: ['view','approve','reject','delete'] },
  { page: 'notifications',    actions: ['view','send'] },
  { page: 'admins',           actions: ['view','add','edit','delete'] },
  { page: 'activity-logs',    actions: ['view'] },
  { page: 'profile',          actions: ['view','edit'] },
];

const getAdmins = async (req, res) => {
  try {
    const admins = await User.find(
      { role: { $in: ['superadmin', 'admin', 'executive'] } },
      { password: 0 }
    ).sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    let resolvedPermissions = permissions;
    if (role === 'superadmin') {
      resolvedPermissions = ALL_PAGES;
    } else if (!permissions || permissions.length === 0) {
      resolvedPermissions = [
        { page: 'dashboard', actions: ['view'] },
        { page: 'profile',   actions: ['view', 'edit'] },
      ];
    }

    const user = new User({ name, email, password, plainPassword: password, role, permissions: resolvedPermissions });
    await user.save();
    const result = user.toObject();
    delete result.password;
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const updateData = { name, email, role };

    if (role === 'superadmin') {
      updateData.permissions = ALL_PAGES;
    } else if (permissions) {
      updateData.permissions = permissions;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
      updateData.plainPassword = password;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, select: '-password' });
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    if (user.role === 'superadmin') return res.status(403).json({ message: 'Cannot delete superadmin' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdmins, createAdmin, updateAdmin, deleteAdmin, ALL_PAGES };
