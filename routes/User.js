const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendOTPEmail } = require('../services/email');

const otpStore = new Map();

// ====================== GET SIGNIN PAGE ======================
router.get('/signin', (req, res) => {
    res.render('signin');   // Make sure you have a signin.ejs file in views/
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
        console.error("🚨 Send OTP Error:", error);
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

module.exports = router;
