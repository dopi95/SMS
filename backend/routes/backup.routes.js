const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { generateBackup, restoreBackup } = require('../utils/backup');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin')
    return res.status(403).json({ message: 'Access denied' });
  next();
};

// GET /api/backup/download
router.get('/download', auth, adminOnly, async (req, res) => {
  try {
    const backup = await generateBackup();
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    res.status(500).json({ message: 'Backup failed', error: error.message });
  }
});

// POST /api/backup/restore — protected by RESTORE_SECRET, no login needed (for DB crash recovery)
router.post('/restore', async (req, res) => {
  try {
    const { data, secret } = req.body;
    const RESTORE_SECRET = process.env.RESTORE_SECRET || 'bluelight-restore-2024';

    if (secret !== RESTORE_SECRET) return res.status(403).json({ message: 'Invalid restore secret' });
    if (!data) return res.status(400).json({ message: 'No backup data provided' });

    const results = await restoreBackup(data);
    res.json({ message: 'Restore completed', restored: results });
  } catch (error) {
    res.status(500).json({ message: 'Restore failed', error: error.message });
  }
});

module.exports = router;
