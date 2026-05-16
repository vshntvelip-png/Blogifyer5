const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");
const Blog = require("./models/blog");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const PORT = 8000;
const app = express();

const localDB = "mongodb://127.0.0.1:27017/blogify5";

mongoose.connect(localDB)
    .then(() => console.log(`MongoDB Connected to: ${localDB}`))
    .catch((err) => console.error("Mongo Connection Error:", err));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

// Fixed: Correct root static file serving path definition
app.use("/", express.static(path.resolve("./public")));

app.use(checkForAuthenticationCookie("token"));

app.get("/", async (req, res) => {
    try {
        // Fixed: Passed a proper object configuration into sort() to prevent runtime crashes
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
    console.log(`Server started at http://localhost:${PORT}`);
});
