const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");
const Blog = require("./models/Blog");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

dotenv.config();

const app = express();

// Improved MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s
})
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:", err.message);
        console.error("Please check your MONGODB_URI in Render Environment Variables");
    });

// View Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.resolve("./public")));

app.use(checkForAuthenticationCookie("token"));

// Home Route
app.get("/", async (req, res) => {
    try {
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 }).lean();
        res.render("home", {
            user: req.user || null,
            blogs: allBlogs || []
        });
    } catch (error) {
        console.error("Home Route Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", UserBlogsRoute);

// 404 Handler
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

module.exports = app;
