const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    salt: { 
        type: String 
    },
    password: { 
        type: String 
    },
    googleId: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    profileImageURL: { 
        type: String, 
        default: "/imgs/default.png" 
    },
    role: { 
        type: String, 
        enum: ["USER", "ADMIN"], 
        default: "USER" 
    },
}, { timestamps: true });

// ====================== PASSWORD HASHING (Only for Email Users) ======================
UserSchema.pre("save", async function (next) {
    if (this.googleId || !this.password || !this.isModified("password")) {
        return next();
    }

    try {
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = createHmac("sha256", salt)
            .update(this.password)
            .digest("hex");

        this.salt = salt;
        this.password = hashedPassword;
        next();
    } catch (error) {
        console.error("❌ Password Hashing Error:", error);
        next(error);
    }
});

// ====================== STATIC METHODS ======================
UserSchema.static("matchPassword", async function (email, password) {
    const user = await this.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found");
    if (!user.password) throw new Error("This account uses Google Sign-In");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

// ====================== GOOGLE USER CREATION (FORCE CREATE) ======================
UserSchema.static("findOrCreateGoogleUser", async function (profile) {
    try {
        const email = profile.emails[0].value.toLowerCase();
        const googleId = profile.id;

        console.log(`🔍 Google Login Attempt: ${email} (ID: ${googleId})`);

        // Try finding by Google ID first
        let user = await this.findOne({ googleId });

        if (!user) {
            // Check by email (in case user signed up with email before)
            user = await this.findOne({ email });

            if (user) {
                console.log(`🔗 Linking Google to existing account: ${email}`);
                user.googleId = googleId;
                if (profile.photos?.[0]?.value) {
                    user.profileImageURL = profile.photos[0].value;
                }
                await user.save();
            } else {
                // === FORCE CREATE NEW USER ===
                console.log(`🆕 Creating NEW Google Account: ${email}`);
                user = await this.create({
                    fullName: profile.displayName || "Google User",
                    email: email,
                    googleId: googleId,
                    profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
                });
                console.log(`✅ New Google User Created Successfully! ID: ${user._id}`);
            }
        } else {
            console.log(`✅ Existing Google User Found: ${email}`);
        }

        return user;
    } catch (error) {
        console.error("❌ findOrCreateGoogleUser FAILED:", error.message);
        throw error;
    }
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
