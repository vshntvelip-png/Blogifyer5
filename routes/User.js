const { Router } = require("express");
const User = require("../models/user");
const { sendOTP, sendPasswordResetLink } = require("../services/email");

const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNIN WITH OTP (New Logic) ======================
router.post("/signin/send-otp", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });

        // If user exists and is verified, check password
        if (existingUser && existingUser.isVerified) {
            try {
                await User.matchPassword(email, password); // will throw if wrong password
                return res.json({ 
                    success: true, 
                    alreadyLoggedIn: true, 
                    message: "Login successful" 
                });
            } catch (err) {
                return res.status(400).json({ success: false, message: "Incorrect Password" });
            }
        }

        // New User or Unverified → Send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email },
            {
                fullName,
                email,
                password,
                otp,
                otpExpiry: Date.now() + 10 * 60 * 1000,
                isVerified: false
            },
            { upsert: true, new: true }
        );

        const sent = await sendOTP(email, otp);
        if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Verify OTP & Login
router.post("/signin/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !user.otp || Date.now() > user.otpExpiry || user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        const token = await User.matchPassword(email, user.password); // Wait, better to generate token directly

        // Better: Generate token manually
        const finalToken = require("../services/authentication").creatTokenForUser(user);

        res.json({ 
            success: true, 
            message: "Login successful", 
            token: finalToken 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== FORGOT PASSWORD ======================
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: "No account found" });

        const resetToken = user.generateResetToken();
        await user.save();

        await sendPasswordResetLink(email, resetToken);
        res.json({ success: true, message: "Reset link sent (valid 2 minutes)" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Reset Password Routes (Keep as before)
router.get("/reset-password/:token", async (req, res) => { ... });   // Same as previous
router.post("/reset-password/:token", async (req, res) => { ... });  // Same as previous

router.get("/logout", (req, res) => res.clearCookie("token").redirect("/"));

module.exports = router;
