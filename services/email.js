const nodemailer = require("nodemailer");
require("dotenv").config();

// Using Nodemailer with App Password (recommended approach)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER || "vshntvelip@gmail.com",
        pass: process.env.EMAIL_PASSWORD || "eatrtctnrqqfmhtd"
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: '"Blogify" <vshntvelip@gmail.com>',
        to: email,
        subject: "Your OTP Code - Blogify",
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #333;">Your OTP Code</h2>
                    <div style="background: #007bff; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #666; margin: 15px 0;">This OTP will expire in 5 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Nodemailer Error:", error);
        return false;
    }
};

const sendPasswordResetLink = async (email, resetToken) => {
    const resetLink = `http://localhost:8000/user/reset-password/${resetToken}`;

    const mailOptions = {
        from: '"Blogify" <vshntvelip@gmail.com>',
        to: email,
        subject: "Reset Your Password - Blogify",
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; text-align: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p style="color: #666;">Click the button below to reset your password:</p>
                    <a href="${resetLink}" style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                        Reset Password
                    </a>
                    <p style="color: #999; font-size: 12px;"><strong>This link is valid for only 2 minutes.</strong></p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Reset link sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Reset Email Error:", error);
        return false;
    }
};

module.exports = { sendOTP, sendPasswordResetLink };
