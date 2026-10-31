const https = require('https');
const axios = require('axios');

const SMS_API_URL = process.env.SMS_API_URL || 'https://smsethiopia.com/api/sms/send';

// Reusable HTTPS agent with HTTP Keep-Alive for high-speed connection reuse
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 35000,
});

const apiClient = axios.create({
  httpsAgent,
  timeout: 35000,
});

/**
 * Send a single SMS via SMS Ethiopia with retry on timeout
 * @param {string} msisdn - Phone number in 251XXXXXXXXX format
 * @param {string} text - SMS body
 * @param {number} retries - Number of retry attempts on timeout/network failure
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
const sendSMS = async (msisdn, text, retries = 1) => {
  const apiKey = (process.env.SMS_ETHIOPIA_API_KEY || '').trim();
  if (!apiKey) {
    return { success: false, error: 'SMS_ETHIOPIA_API_KEY is not configured on server' };
  }

  const payload = {
    msisdn,
    text,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await apiClient.post(
        SMS_API_URL,
        payload,
        {
          headers: {
            'KEY': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Some gateways return HTTP 200 with an internal error status/message
      if (response.data && (response.data.status === 'error' || response.data.error_message || (response.data.status && response.data.status !== 'success'))) {
        const errMsg = response.data.error_message || response.data.message || response.data.error || JSON.stringify(response.data);
        return { success: false, error: errMsg };
      }

      return { success: true, data: response.data };
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'));
      const isNetwork = err.code === 'ENOTFOUND' || err.code === 'ECONNRESET' || !err.response;

      // If timeout or network glitch and we have retries left, wait and retry once
      if ((isTimeout || isNetwork) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }

      const data = err.response?.data;
      let errDetail = data?.error_message || data?.message || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : err.message));

      if (isTimeout) {
        errDetail = 'SMS provider connection timed out. The telecom gateway took too long to respond. Please try again.';
      }

      return { success: false, error: errDetail };
    }
  }
};

/**
 * Normalize Ethiopian phone number to 251XXXXXXXXX format
 */
const normalizePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('251')) return digits;
  if (digits.startsWith('0')) return '251' + digits.slice(1);
  return '251' + digits;
};

/**
 * Send bulk SMS messages in parallel using a concurrent worker pool
 * Fast performance: 10 parallel connections simultaneously
 * @param {Array<{phone: string, message: string, studentName?: string, parentName?: string}>} recipients
 * @param {number} concurrency - Max concurrent requests (default: 10)
 * @returns {{ sent: number, failed: number, errors: Array }}
 */
const sendBulkSMS = async (recipients, concurrency = 10) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  let nextIndex = 0;

  // Worker continuously picks the next recipient until the queue is finished
  const worker = async () => {
    while (nextIndex < recipients.length) {
      const currentIndex = nextIndex++;
      const item = recipients[currentIndex];
      if (!item) break;

      const { phone, message, studentName, parentName } = item;
      const normalized = normalizePhone(phone);
      const result = await sendSMS(normalized, message);

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({
          phone,
          studentName: studentName || '',
          parentName: parentName || '',
          error: result.error,
        });
      }
    }
  };

  // Launch worker pool
  const workerCount = Math.min(concurrency, recipients.length);
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return { sent, failed, errors };
};

module.exports = { sendSMS, sendBulkSMS, normalizePhone };
