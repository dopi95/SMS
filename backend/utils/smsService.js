const axios = require('axios');

const SMS_API_URL = 'https://smsethiopia.com/api/sms/send';

/**
 * Send a single SMS via SMS Ethiopia
 * @param {string} msisdn - Phone number (e.g. 251911234567)
 * @param {string} text - SMS body
 */
const sendSMS = async (msisdn, text) => {
  const response = await axios.post(
    SMS_API_URL,
    { msisdn, text },
    {
      headers: {
        'KEY': process.env.SMS_ETHIOPIA_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Normalize Ethiopian phone number to 251XXXXXXXXX format
 */
const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('251')) return digits
  if (digits.startsWith('0')) return '251' + digits.slice(1)
  return '251' + digits
};

/**
 * Send bulk SMS messages
 * @param {Array<{phone: string, message: string}>} recipients
 * @returns {{ sent: number, failed: number, errors: Array }}
 */
const sendBulkSMS = async (recipients) => {
  let sent = 0, failed = 0;
  const errors = [];

  console.log(`[SMS] Sending to ${recipients.length} recipients:`, recipients.map(r => r.phone));

  for (let i = 0; i < recipients.length; i++) {
    const { phone, message } = recipients[i];
    const normalized = normalizePhone(phone);
    try {
      const result = await sendSMS(normalized, message);
      console.log(`[SMS] ✓ Sent to ${normalized}:`, result);
      sent++;
    } catch (err) {
      const errDetail = err.response?.data || err.message;
      console.log(`[SMS] ✗ Failed to ${normalized}:`, errDetail);
      failed++;
      errors.push({ phone, error: errDetail });
    }
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  return { sent, failed, errors };
};

module.exports = { sendSMS, sendBulkSMS };
