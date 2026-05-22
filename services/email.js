// services/email.js
const nodemailer = require('nodemailer');

// Create transporter with Gmail settings
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Verify transporter connection
const verifyTransporter = async (transporter) => {
    try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.error('SMTP verification failed:', error.message);
        return false;
    }
};

const sendOTP = async (email, otp) => {
    try {
        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('EMAIL_USER or EMAIL_PASSWORD not configured in environment variables');
            return false;
        }

        console.log(`Attempting to send OTP to: ${email}`);
        console.log(`Using EMAIL_USER: ${process.env.EMAIL_USER}`);

        const transporter = createTransporter();

        // Verify connection first
        const isVerified = await verifyTransporter(transporter);
        if (!isVerified) {
            console.error('Transporter verification failed - check your Gmail App Password');
            return false;
        }

        const mailOptions = {
            from: `"Blogify" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Blogify Signup OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; border-radius: 12px; background-color: #f9f9f9;">
                    <h2 style="color: #667eea; text-align: center;">Verify Your Email Address</h2>
                    <p style="font-size: 16px; text-align: center;">Use the following OTP to complete your signup:</p>
                    <h1 style="color: #667eea; letter-spacing: 12px; font-size: 48px; text-align: center; margin: 20px 0;">${otp}</h1>
                    <p style="text-align: center; color: #666;">
                        This code will expire in <strong>5 minutes</strong>.
                    </p>
                    <p style="text-align: center; color: #999; font-size: 14px;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`OTP sent successfully to ${email} | Message ID: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error('Failed to send OTP email:', error.message);
        console.error('Full error:', error);
        
        // Provide helpful error messages
        if (error.code === 'EAUTH') {
            console.error('Authentication failed - Please check:');
            console.error('1. EMAIL_USER is correct');
            console.error('2. EMAIL_PASSWORD is a valid Gmail App Password (not your regular password)');
            console.error('3. 2-Step Verification is enabled on your Gmail account');
        } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
            console.error('Connection failed - Check your network or firewall settings');
        }
        
        return false;
    }
};

module.exports = { sendOTP };
