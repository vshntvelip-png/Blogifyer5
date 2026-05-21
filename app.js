const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// ====================== MongoDB Connection ======================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in environment variables!");
}

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
});

// ====================== View Engine & Middleware ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.resolve("./public")));

// Authentication Middleware
app.use(checkForAuthenticationCookie("token"));

// ====================== Routes ======================
app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 });

        res.render("home", {
            user: req.user,
            blogs: allBlogs
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", UserBlogsRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
});
