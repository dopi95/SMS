const Teacher = require('../models/Teacher.model');
const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const upsertTeacherCredential = async (teacher) => {
  const username = teacher.teacherId;
  const plainPassword = generateRandomPassword();
  const email = teacher.email || `${username.toLowerCase()}@bluelight.edu`;
  const existing = await User.findOne({ email });
  if (existing) {
    existing.password = plainPassword;
    existing.plainPassword = plainPassword;
    existing.name = teacher.fullName;
    await existing.save();
  } else {
    await new User({ name: teacher.fullName, email, password: plainPassword, plainPassword, role: 'teacher' }).save();
  }
  await Teacher.findByIdAndUpdate(teacher._id, { portalUsername: username, portalPassword: plainPassword });
  return { teacherId: teacher.teacherId, name: teacher.fullName, role: teacher.role, username, password: plainPassword };
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTeacher = async (req, res) => {
  try {
    // Generate auto-incremented teacher ID
    const lastTeacher = await Teacher.findOne().sort({ teacherId: -1 });
    let newIdNumber = 1;
    
    if (lastTeacher && lastTeacher.teacherId) {
      const lastNumber = parseInt(lastTeacher.teacherId.replace('BLSTAFF', ''));
      if (!isNaN(lastNumber)) {
        newIdNumber = lastNumber + 1;
      }
    }
    
    const teacherId = `BLSTAFF${String(newIdNumber).padStart(3, '0')}`;
    
    let photoUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path || `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
        folder: 'teachers'
      });
      photoUrl = result.secure_url;
    }
    
    // Parse salaries if it's a string
    let salaries = [];
    if (req.body.salaries) {
      salaries = typeof req.body.salaries === 'string' ? JSON.parse(req.body.salaries) : req.body.salaries;
    }
    
    const teacher = new Teacher({
      ...req.body,
      teacherId,
      photo: photoUrl,
      salaries
    });
    
    await teacher.save();
    await logActivity(req.user, 'Added', 'Employee', `Added employee ${teacher.fullName} (ID: ${teacher.teacherId})`);
    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTeacher = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path || `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
        folder: 'teachers'
      });
      updateData.photo = result.secure_url;
    }
    
    // Parse salaries if it's a string
    if (updateData.salaries && typeof updateData.salaries === 'string') {
      updateData.salaries = JSON.parse(updateData.salaries);
    }
    
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    await logActivity(req.user, 'Edited', 'Employee', `Edited employee ${teacher.fullName} (ID: ${teacher.teacherId})`);
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    await logActivity(req.user, 'Deleted', 'Employee', `Deleted employee ${teacher.fullName} (ID: ${teacher.teacherId})`);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkImportTeachers = async (req, res) => {
  try {
    const { teachers: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ message: 'No data provided' });

    const lastTeacher = await Teacher.findOne().sort({ teacherId: -1 });
    let counter = 1;
    if (lastTeacher?.teacherId) {
      const n = parseInt(lastTeacher.teacherId.replace('BLSTAFF', ''));
      if (!isNaN(n)) counter = n + 1;
    }

    const created = [];
    const failed = [];

    for (const row of rows) {
      try {
        if (!row.fullName || !row.phone || !row.role || !row.sex || !row.employmentDate || !row.employmentType) {
          failed.push({ row, reason: 'Missing required fields (fullName, phone, role, sex, employmentDate, employmentType)' });
          continue;
        }
        const teacherId = `BLSTAFF${String(counter).padStart(3, '0')}`;
        const teacher = new Teacher({ ...row, teacherId });
        await teacher.save();
        created.push(teacher);
        counter++;
      } catch (err) {
        failed.push({ row, reason: err.message });
      }
    }

    await logActivity(req.user, 'Added', 'Employee', `Bulk imported ${created.length} employees`);
    res.json({ created: created.length, failed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateEmployeeCredentials = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const teachers = await Teacher.find({ isActive: true, role: { $in: ['Teacher', 'Principal'] } });
    if (teachers.length === 0) return res.status(404).json({ message: 'No active teachers/principals found' });
    const results = [];
    for (const t of teachers) results.push(await upsertTeacherCredential(t));
    await logActivity(req.user, 'Generated Credentials', 'Employee', `Generated credentials for ${results.length} employees`);
    res.json({ message: `Credentials generated for ${results.length} employees`, credentials: results });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const generateEmployeeCredentialSingle = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Employee not found' });
    const result = await upsertTeacherCredential(teacher);
    await logActivity(req.user, 'Generated Credential', 'Employee', `Generated credential for ${teacher.fullName}`);
    res.json(result);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getEmployeeCredential = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const teacher = await Teacher.findById(req.params.id, { teacherId: 1, fullName: 1, role: 1, portalUsername: 1, portalPassword: 1 });
    if (!teacher) return res.status(404).json({ message: 'Employee not found' });
    res.json({ teacherId: teacher.teacherId, name: teacher.fullName, role: teacher.role, username: teacher.portalUsername || null, password: teacher.portalPassword || null });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAllEmployeeCredentials = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Forbidden' });
    const teachers = await Teacher.find(
      { isActive: true, portalUsername: { $ne: '' }, portalPassword: { $ne: '' } },
      { teacherId: 1, fullName: 1, role: 1, portalUsername: 1, portalPassword: 1 }
    );
    const credentials = teachers
      .filter(t => t.portalUsername && t.portalPassword)
      .map(t => ({ teacherId: t.teacherId, name: t.fullName, role: t.role, username: t.portalUsername, password: t.portalPassword }));
    res.json({ credentials });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher, bulkImportTeachers, generateEmployeeCredentials, generateEmployeeCredentialSingle, getEmployeeCredential, getAllEmployeeCredentials };