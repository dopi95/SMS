const ActivityLog = require('../models/ActivityLog.model');

const getLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(500);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const clearLogs = async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.json({ message: 'Logs cleared' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const deleteLog = async (req, res) => {
  try {
    const log = await ActivityLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Log deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getLogs, clearLogs, deleteLog };
