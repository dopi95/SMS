const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Notice = require('../models/Notice.model');

// GET all notices (SMS admin)
router.get('/', auth, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).limit(200);
    res.json(notices);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST create notice
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, type, targetClass, scheduledAt } = req.body;
    const notice = await Notice.create({
      title, message,
      type: type || 'notice',
      targetClass: targetClass || 'all',
      scheduledAt: scheduledAt || null,
      sentBy: req.user.name,
      sentById: req.user._id,
    });
    res.status(201).json(notice);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH toggle active
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Not found' });
    notice.isActive = !notice.isActive;
    await notice.save();
    res.json(notice);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
