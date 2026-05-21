const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String },           // Optional for Google users
    googleId: { type: String, unique: true, sparse: true },
    profileImageURL: { type: String, default: "/imgs/default.png" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

// Password hashing (only for email/password users)
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();

    const salt = randomBytes(16).toString("hex");
    const hashedPassword = createHmac("sha256", salt)
        .update(this.password)
        .digest("hex");

    this.salt = salt;
    this.password = hashedPassword;
    next();
});

UserSchema.static('matchPassword', async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found");
    if (!user.password) throw new Error("This account uses Google Sign-In");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

// Google User Handler
UserSchema.static('findOrCreateGoogleUser', async function (profile) {
    let user = await this.findOne({ googleId: profile.id });

    if (!user) {
        user = await this.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link Google to existing account
            user.googleId = profile.id;
            if (profile.photos && profile.photos[0]) {
                user.profileImageURL = profile.photos[0].value;
            }
            await user.save();
        } else {
            // Create new user
            user = await this.create({
                fullName: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
            });
        }
    }
    return user;
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
