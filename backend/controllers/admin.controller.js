const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const logActivity = require('../utils/logActivity');
const { sendSMS, normalizePhone } = require('../utils/smsService');

const ALL_PAGES = [
  { page: 'dashboard',        actions: ['view'] },
  { page: 'students',         actions: ['view','add','edit','delete','inactive'] },
  { page: 'employees',        actions: ['view','add','edit','delete','inactive'] },
  { page: 'admins',           actions: ['view','add','edit','delete'] },
  { page: 'payments',         actions: ['view','add','delete'] },
  { page: 'custom-payment',   actions: ['view','add','edit','delete'] },
  { page: 'bank-reports',     actions: ['view','link','approve','delete'] },
  { page: 'notifications',    actions: ['view','send'] },
  { page: 'notice',           actions: ['view','send','delete'] },
  { page: 'settings',         actions: ['view','edit'] },
  { page: 'bank-settings',    actions: ['view','edit'] },
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
    const { name, email, password, role, permissions, phone, sendNotification } = req.body;
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

    const user = new User({
      name,
      email,
      password,
      plainPassword: password,
      role,
      phone: (phone || '').trim(),
      permissions: resolvedPermissions,
      mustChangePassword: true
    });
    await user.save();

    let smsSent = false;
    let smsError = null;
    if (sendNotification && phone && phone.trim()) {
      try {
        const normPhone = normalizePhone(phone.trim());
        const smsText = `Dear ${name},\nYou have been registered as an Admin at Bluelight Academy.\nPlease login and change your password:\n\nUsername: ${email}\nPassword: ${password}\n\nLogin link: https://admission.bluelight.edu.et`;
        const smsRes = await sendSMS(normPhone, smsText);
        if (smsRes.success) {
          smsSent = true;
        } else {
          smsError = smsRes.error;
        }
      } catch (err) {
        console.error('[createAdmin] SMS error:', err);
        smsError = err.message;
      }
    }

    await logActivity(req.user, 'Created Admin', 'Admins', `Created admin "${name}" with role "${role}"`);
    const result = user.toObject();
    delete result.password;
    result.smsSent = smsSent;
    if (smsError) result.smsError = smsError;
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions, phone, mustChangePassword } = req.body;
    const updateData = { name, email, role };
    if (phone !== undefined) updateData.phone = (phone || '').trim();
    if (mustChangePassword !== undefined) updateData.mustChangePassword = mustChangePassword;

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
    await logActivity(req.user, 'Updated Admin', 'Admins', `Updated admin "${user.name}" (role: ${user.role})`);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    await User.findByIdAndDelete(req.params.id);
    await logActivity(req.user, 'Deleted Admin', 'Admins', `Deleted admin "${user.name}" (role: ${user.role})`);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAdmins, createAdmin, updateAdmin, deleteAdmin, ALL_PAGES };
