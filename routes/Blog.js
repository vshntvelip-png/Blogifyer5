const { Router } = require("express");
const Blog = require("../models/blog");
const cloudinaryUpload = require("../middlewares/CloudinaryUploads");

const router = Router();

// GET: Render add blog page
router.get("/add-new", (req, res) => {
    return res.render("addBlog", {
        user: req.user,
    });
});

// POST: Create blog with Cloudinary image
router.post("/", cloudinaryUpload.single("coverImage"), async (req, res) => {
    const { title, body } = req.body;

    try {
        const blog = await Blog.create({
            title,
            body,
            createdBy: req.user._id,
            coverImageURL: req.file ? req.file.path : "/uploads/default.png", // Cloudinary URL
        });

        return res.redirect("/");
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
