const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");

const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

// Protect route
router.use(restrictToLoggedInUserOnly);

// GET User Profile
router.get("/", async (req, res) => {
    try {
        const userBlogs = await Blog.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.render("profile", {
            user: req.user,
            blogs: userBlogs
        });
    } catch (error) {
        console.error("Profile Route Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
