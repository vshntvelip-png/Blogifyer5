// routes/User.js
const { Router } = require("express");
const User = require("../models/user");
const { sendOTP } = require("../services/email");

const router = Router();

// In-memory OTP temporary storage map
const otpStore = new Map();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNUP WITH OTP ======================
router.post("/signup", async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "All form fields are required." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "This email address is already registered." });
        }

        // Generate clean 6 digit numeric code string
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save records inside global context tracker
        otpStore.set(email.toLowerCase(), {
            otp,
            expiry: Date.now() + 5 * 60 * 1000, // 5 minute verification window
            userData: { 
                fullName, 
                email: email.toLowerCase(), 
                password 
            }
        });

        // Trigger nodemailer sequence
        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send validation email. Check server authentication parameters." 
            });
        }

        return res.json({ 
            success: true, 
            message: "OTP sent successfully! Please check your mailbox profile." 
        });

    } catch (error) {
        console.error("Signup Route Execution Error:", error);
        return res.status(500).json({ success: false, message: "Internal server processing failure." });
    }
});

// ====================== VERIFY OTP ======================
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const stored = otpStore.get(email?.toLowerCase());

        if (!stored) {
            return res.status(400).json({ success: false, message: "OTP session not found or invalid." });
        }

        if (Date.now() > stored.expiry) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ success: false, message: "Your verification code has expired." });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ success: false, message: "Incorrect OTP code. Try again." });
        }

        // Save target entity documentation directly down inside cloud collection system
        await User.create(stored.userData);
        otpStore.delete(email.toLowerCase());

        // Perform password evaluation lookup to construct verification signature cookies
        const token = await User.matchPassword(email, stored.userData.password);

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return res.json({ success: true });

    } catch (error) {
        console.error("Verify OTP Handler Error:", error);
        return res.status(500).json({ success: false, message: "Verification processing failed." });
    }
});

// ====================== LOGOUT ROUTE ======================
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    return res.redirect("/");
});

module.exports = router;
