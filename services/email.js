const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false // Helps with some Gmail connection issues
    }
});

// Test transporter connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email Transporter Error:", error.message);
    } else {
        console.log("✅ Email Transporter is Ready");
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Signup Verification Code - Blogify',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
                <h2 style="color: #4CAF50; text-align: center;">Verify Your Email Address</h2>
                <h1 style="text-align: center; letter-spacing: 10px; font-size: 48px; color: #333; margin: 20px 0;">${otp}</h1>
                <p style="text-align: center; color: #555; font-size: 16px;">This code will expire in 5 minutes.</p>
                <p style="text-align: center; color: #999; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Email Sent Successfully to: ${email}`);
        console.log(`Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Nodemailer Send Error:");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        console.error("Full Error:", error);
        throw error; // Let the route handle the error
    }
};

module.exports = { sendOTPEmail };
