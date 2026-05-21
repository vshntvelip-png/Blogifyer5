const { Router } = require("express");
const passport = require("passport");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");

const router = Router();

// ====================== GOOGLE STRATEGY ======================
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const configureGoogleStrategy = () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn("⚠️ Google OAuth credentials missing. Google login will not work.");
        return;
    }

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await User.findOrCreateGoogleUser(profile);
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
};

configureGoogleStrategy();

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ====================== NORMAL ROUTES ======================
router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        await User.create({ fullName, email, password });
        return res.redirect("/user/signin");
    } catch (error) {
        return res.render("signup", { error: "Email already registered" });
    }
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }).redirect("/");
    } catch (error) {
        res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token").redirect("/");
});

// ====================== GOOGLE OAUTH ======================
router.get("/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"] 
}));

router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/user/signin" }),
    (req, res) => {
        const token = creatTokenForUser(req.user);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }).redirect("/");
    }
);

module.exports = router;
