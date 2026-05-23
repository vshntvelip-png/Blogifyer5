const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendOTPEmail } = require('../services/email');
const crypto = require('crypto');

const otpStore = new Map();
const resetTokens = new Map(); // In-memory reset tokens (for production, use Redis or DB)

// ====================== GET SIGNIN PAGE ======================
router.get('/signin', (req, res) => {
    res.render('signin');
});

// ====================== POST SIGNIN ======================
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.status(200).json({ success: true, message: "Login successful" });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message || "Invalid credentials" });
    }
});

// ====================== LOGOUT ======================
router.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect('/');
});

router.post('/logout', (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// ====================== GET SIGNUP PAGE ======================
router.get('/signup', (req, res) => {
    res.render('signup');
});

// ====================== SEND OTP ======================
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    console.log("📧 [Send OTP] Request for:", email);

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login instead."
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 5 * 60 * 1000;

        otpStore.set(normalizedEmail, { otp, expires });

        await sendOTPEmail(normalizedEmail, otp);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error("🚨 [Send OTP] Full Error:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP. Please check server console.' 
        });
    }
});

// ====================== SIGNUP ======================
router.post('/signup', async (req, res) => {
    const { fullName, email, password, otp } = req.body;

    if (!fullName || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        const stored = otpStore.get(normalizedEmail);
        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        otpStore.delete(normalizedEmail);

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email already registered." });
        }

        const newUser = await User.create({
            fullName: fullName,
            email: normalizedEmail,
            password: password
        });

        const token = await User.matchPassword(normalizedEmail, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({ success: true, message: "Account created successfully!" });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Signup failed" });
    }
});

// ====================== FORGOT PASSWORD ======================
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.json({ 
                success: true, 
                message: "If your email is registered, a reset link has been sent." 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

        resetTokens.set(resetToken, { 
            userId: user._id, 
            expires 
        });

        const resetLink = `https://blogifyer5.onrender.com/user/reset-password/${resetToken}`;

        // Send Reset Email
        const transporter = require('nodemailer').createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: `"Blogify" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: 'Reset Your Blogify Password',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>Password Reset Request</h2>
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetLink}" style="background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
                        Reset Password
                    </a>
                    <p style="margin-top:20px; color:#666;">This link expires in 15 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ success: true, message: "Reset link sent to your email." });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
});

// ====================== RESET PASSWORD PAGE ======================
router.get('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const data = resetTokens.get(token);

    if (!data || data.expires < Date.now()) {
        return res.send("<h3>❌ Invalid or expired reset link.</h3>");
    }

    const user = await User.findById(data.userId);
    if (!user) return res.send("<h3>User not found.</h3>");

    res.render('reset-password', { user, token });
});

// ====================== RESET PASSWORD (POST) ======================
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const data = resetTokens.get(token);
        if (!data || data.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }

        const user = await User.findById(data.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.password = newPassword; // Pre-save middleware will hash it
        await user.save();

        resetTokens.delete(token);

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, message: "Failed to update password" });
    }
});

module.exports = router;
