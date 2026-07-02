const PendingEmployee = require('../models/PendingEmployee.model');
const Teacher = require('../models/Teacher.model');
const cloudinary = require('../config/cloudinary.config');
const logActivity = require('../utils/logActivity');

const uploadPhoto = async (fileArr, folder) => {
  if (!fileArr?.[0]) return '';
  const file = fileArr[0];
  const opts = { folder, transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto:low', fetch_format: 'auto' }] };
  let result;
  if (file.buffer) {
    result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(opts, (err, res) => err ? reject(err) : resolve(res));
      stream.end(file.buffer);
    });
  } else {
    result = await cloudinary.uploader.upload(file.path, opts);
  }
  return result.secure_url;
};

const submitPending = async (req, res) => {
  try {
    const files = req.files || {};
    const photoUrl = await uploadPhoto(files.photo, 'pending_employees');
    const pending = new PendingEmployee({ ...req.body, photo: photoUrl });
    await pending.save();
    res.status(201).json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPending = async (req, res) => {
  try {
    const list = await PendingEmployee.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingCount = async (req, res) => {
  try {
    const count = await PendingEmployee.countDocuments({ status: 'pending' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approvePending = async (req, res) => {
  try {
    const pending = await PendingEmployee.findById(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });

    // Generate teacherId like EMP001
    const all = await Teacher.find({}, { teacherId: 1 });
    let maxNum = 0;
    for (const t of all) {
      const m = t.teacherId && t.teacherId.match(/^EMP(\d+)/);
      if (m) { const n = parseInt(m[1]); if (n > maxNum) maxNum = n; }
    }
    const teacherId = `EMP${String(maxNum + 1).padStart(3, '0')}`;

    const teacher = new Teacher({
      teacherId,
      fullName:           pending.fullName,
      email:              pending.email,
      phone:              pending.phone,
      sex:                pending.sex,
      address:            pending.address,
      role:               pending.role,
      qualification:      pending.qualification,
      qualificationLevel: pending.qualificationLevel,
      experienceYears:    pending.experienceYears,
      employmentDate:     pending.employmentDate,
      employmentType:     pending.employmentType,
      photo:              pending.photo,
      isActive:           true,
    });
    await teacher.save();
    await PendingEmployee.findByIdAndUpdate(req.params.id, { status: 'approved' });
    await logActivity(req.user, 'Approved', 'Pending Employee', `Approved employee application of ${pending.fullName} (ID: ${teacherId})`);
    res.json({ message: 'Employee approved and added', teacherId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectPending = async (req, res) => {
  try {
    const pending = await PendingEmployee.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!pending) return res.status(404).json({ message: 'Not found' });
    await logActivity(req.user, 'Rejected', 'Pending Employee', `Rejected employee application of ${pending.fullName}`);
    res.json({ message: 'Application rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePending = async (req, res) => {
  try {
    const pending = await PendingEmployee.findByIdAndDelete(req.params.id);
    if (!pending) return res.status(404).json({ message: 'Not found' });
    await logActivity(req.user, 'Deleted', 'Pending Employee', `Deleted employee application of ${pending.fullName}`);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitPending, getPending, getPendingCount, approvePending, rejectPending, deletePending };
