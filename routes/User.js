const { Router } = require("express");
const User = require("../models/user");
const { sendOTP, sendPasswordResetLink } = require("../services/email");

const router = Router();

// GET Routes
router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNUP WITH OTP ======================
router.post("/send-otp", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email },
            {
                fullName,
                email,
                password,
                otp,
                otpExpiry: Date.now() + 10 * 60 * 1000, // 10 min
                isVerified: false
            },
            { upsert: true, new: true }
        );

        const emailSent = await sendOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: "Failed to send OTP" });
        }

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/signup", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        if (user.isVerified) return res.status(400).json({ success: false, message: "User already verified" });

        if (Date.now() > user.otpExpiry) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ success: true, message: "Account created successfully!" });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== FORGOT PASSWORD ======================
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "No account found with this email" });
        }

        const resetToken = user.generateResetToken();
        await user.save();

        const emailSent = await sendPasswordResetLink(email, resetToken);

        if (emailSent) {
            res.json({ success: true, message: "Reset link sent to your email (valid for 2 minutes)" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send reset email" });
        }
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== RESET PASSWORD ======================
router.get("/reset-password/:token", async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.render("reset-password", { 
                error: "Invalid or expired reset link. Please request a new one." 
            });
        }

        res.render("reset-password", { token, email: user.email });
    } catch (error) {
        res.render("reset-password", { error: "Something went wrong" });
    }
});

router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
        }

        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        console.error("Signin Error:", error.message);
        return res.render("signin", { error: error.message });
    }
});

router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
