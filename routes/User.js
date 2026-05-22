// routes/User.js
const { Router } = require("express");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");
const { sendOTPEmail } = require("../services/email");

const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SEND OTP ======================
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                email: email.toLowerCase(), 
                otp, 
                otpExpires: Date.now() + 5 * 60 * 1000 
            },
            { upsert: true, new: true }
        );

        await sendOTPEmail(email, otp);

        res.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// ====================== VERIFY OTP & CREATE ACCOUNT ======================
router.post("/verify-otp", async (req, res) => {
    const { email, otp, fullName, password } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.otp || Date.now() > user.otpExpires) {
            return res.json({ success: false, message: "OTP expired or invalid" });
        }

        if (user.otp !== otp) {
            return res.json({ success: false, message: "Incorrect OTP" });
        }

        // Create final user (or update)
        const newUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                fullName,
                email: email.toLowerCase(),
                password,
                otp: null,
                otpExpires: null
            },
            { new: true, upsert: true }
        );

        const token = await User.matchPassword(email, password);

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Verification failed" });
    }
});

module.exports = router;
