const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const NotificationHistory = require('../models/NotificationHistory.model');

// GET all notification history
router.get('/', auth, async (req, res) => {
  try {
    const history = await NotificationHistory.find().sort({ createdAt: -1 }).limit(100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST save a notification to history
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, recipients, phoneNumbers } = req.body;
    const record = await NotificationHistory.create({
      title, message, recipients, phoneNumbers,
      sentBy: req.user.name,
      sentById: req.user._id,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE a notification history record
router.delete('/:id', auth, async (req, res) => {
  try {
    await NotificationHistory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
