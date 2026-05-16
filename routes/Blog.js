const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const Blog = require("../models/blog"); // Make sure the path to your blog model is correct

const router = Router();

// Configure storage for uploaded blog cover images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(`./public/uploads`)); // Saves files into public/uploads
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });

// GET: Render the add blog page
router.get("/add-new", (req, res) => {
    return res.render("addBlog", {
        user: req.user,
    });
});

// POST: Handle blog creation form data
// 'coverImage' matches the name attribute in your HTML file input
router.post("/", upload.single("coverImage"), async (req, res) => {
    const { title, body } = req.body;
    
    try {
        const blog = await Blog.create({
            title,
            body,
            createdBy: req.user._id, // Tied to the logged-in user from your auth middleware
            coverImageURL: req.file ? `/uploads/${req.file.filename}` : "/uploads/default.png",
        });
        
        return res.redirect(`/`);
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
