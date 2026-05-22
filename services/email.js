// services/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Blogify Signup OTP',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #667eea; text-align: center;">Your OTP Code</h2>
                <h1 style="text-align: center; letter-spacing: 8px; font-size: 42px; color: #333;">${otp}</h1>
                <p style="text-align: center; color: #666;">This code will expire in 5 minutes.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
};

module.exports = { sendOTPEmail };
