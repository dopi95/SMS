const axios = require('axios');

const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    const emailData = {
      sender: {
        name: 'Bluelight SMS',
        email: 'admin@bluelightsms.com'
      },
      to: [{ 
        email: email, 
        name: userName 
      }],
      subject: 'Password Reset OTP - Bluelight SMS',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563eb; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Bluelight SMS</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">School Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Password Reset Request</h2>
            <p>Dear ${userName},</p>
            <p>Your OTP for password reset is:</p>
            
            <div style="background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <h3 style="margin: 0; color: #2563eb; font-size: 32px; letter-spacing: 3px;">${otp}</h3>
            </div>
            
            <p style="color: #6c757d;">This OTP is valid for 10 minutes only. Do not share with anyone.</p>
          </div>
        </div>
      `,
      textContent: `Bluelight SMS Password Reset\n\nDear ${userName},\n\nYour OTP: ${otp}\n\nValid for 10 minutes.`
    };
    
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data;
    
  } catch (error) {
    return { messageId: 'fallback' };
  }
};

module.exports = { sendOTPEmail };