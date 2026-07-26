const express = require('express');
const router = express.Router();
const { sendBulkSMS } = require('../utils/smsService');
const auth = require('../middleware/auth.middleware');

// POST /api/sms/send
// Body: { recipients: [{ phone: string, message: string }] }
router.post('/send', auth, async (req, res) => {
  try {
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients provided' });
    }

    const result = await sendBulkSMS(recipients);
    console.log('[SMS] Result:', JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.error('[SMS] Send error:', error.message);
    res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
});

module.exports = router;
