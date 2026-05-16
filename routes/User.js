const { Router } = require("express");
const User = require("../models/user");
const { sendOTP, sendPasswordResetLink } = require("../services/email");

const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNUP WITH OTP ======================
router.post("/send-otp", async (req, res) => {
    const { email, password } = req.body;   // fullName removed

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and Password are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: "Email already registered. Please login." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email },
            { 
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

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/signup", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || Date.now() > user.otpExpiry || user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ success: true, message: "Account created successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== SIGNIN ======================
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        return res.render("signin", { error: error.message });
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

        const sent = await sendPasswordResetLink(email, resetToken);
        if (sent) {
            res.json({ success: true, message: "Reset link sent! Valid for 2 minutes." });
        } else {
            res.status(500).json({ success: false, message: "Failed to send email" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== RESET PASSWORD ======================
router.get("/reset-password/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.render("reset-password", { error: "Invalid or expired reset link" });
        }

        res.render("reset-password", { token: req.params.token, email: user.email });
    } catch (error) {
        res.render("reset-password", { error: "Something went wrong" });
    }
});

router.post("/reset-password/:token", async (req, res) => {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ success: false, message: "Invalid or expired link" });

        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/logout", (req, res) => res.clearCookie("token").redirect("/"));

module.exports = router;
