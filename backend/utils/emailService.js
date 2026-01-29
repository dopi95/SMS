const axios = require('axios');

const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    console.log('=== Email Service ===');
    console.log('Sending to:', email);
    console.log('OTP:', otp);
    
    const emailData = {
      sender: {
        name: 'Bluelight Academy',
        email: process.env.BREVO_EMAIL
      },
      to: [{ email, name: userName }],
      subject: 'Password Reset - Bluelight Academy',
      htmlContent: `<div><h1>Bluelight Academy</h1><p>Dear ${userName},</p><p>Your OTP: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p></div>`
    };
    
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Email sent successfully via Brevo');
    return response.data;
  } catch (error) {
    // If Brevo fails (account not activated), log OTP for testing
    if (error.response?.status === 403) {
      console.log('\n=== BREVO ACCOUNT NOT ACTIVATED ===');
      console.log('Contact support@brevo.com to activate SMTP');
      console.log('\n=== OTP FOR TESTING ===');
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('========================\n');
      return { messageId: 'console-fallback' };
    }
    throw error;
  }
};

module.exports = { sendOTPEmail };