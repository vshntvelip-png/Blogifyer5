const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String },                    // Now optional for OAuth users
    googleId: { type: String, unique: true, sparse: true },
    profileImageURL: { type: String, default: "/imgs/default.png" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

// Hash password before saving (only if password is provided)
UserSchema.pre("save", async function () {
    const user = this;
    if (!user.isModified("password") || !user.password) return;

    const salt = randomBytes(16).toString("hex");
    const hashedPassword = createHmac("sha256", salt)
        .update(user.password)
        .digest("hex");

    user.salt = salt;
    user.password = hashedPassword;
});

UserSchema.static('matchPassword', async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found!");

    if (!user.password) throw new Error("Password login not available for this account");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

// New static method for Google OAuth
UserSchema.static('findOrCreateGoogleUser', async function (profile) {
    let user = await this.findOne({ googleId: profile.id });

    if (!user) {
        user = await this.findOne({ email: profile.emails[0].value });

        if (!user) {
            // Create new user
            user = await this.create({
                fullName: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
            });
        } else {
            // Link Google to existing email account
            user.googleId = profile.id;
            if (profile.photos?.[0]?.value) user.profileImageURL = profile.photos[0].value;
            await user.save();
        }
    }

    return user;
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
