const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String, required: true },
    profileImageURL: { type: String, default: "/public/imgs/default.png" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

// FIXED: Removed 'next' parameter because the function is async
UserSchema.pre("save", async function () {
    const user = this;
    if (!user.isModified("password")) return;

    const salt = randomBytes(16).toString("hex");
    const hashedPassword = createHmac("sha256", salt)
        .update(user.password)
        .digest("hex");

    user.salt = salt;
    user.password = hashedPassword;
    // No next() call needed here for async functions
});

UserSchema.static('matchPassword', async function(email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found!");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password) 
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;