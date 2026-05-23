const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter on startup
transporter.verify((error) => {
    if (error) {
        console.error("❌ Gmail Transporter Error:", error.message);
    } else {
        console.log("✅ Gmail Transporter Ready");
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Signup OTP - Blogify',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #667eea; text-align: center;">Your Verification Code</h2>
                <h1 style="font-size: 50px; text-align: center; letter-spacing: 12px; color: #333;">${otp}</h1>
                <p style="text-align: center; color: #666;">This code will expire in 5 minutes.</p>
                <p style="text-align: center; color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Sent Successfully to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send email:");
        console.error(error.message);
        throw error;
    }
};

module.exports = { sendOTPEmail };
