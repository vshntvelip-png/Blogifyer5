const { Router } = require("express");
const Blog = require("../models/Blog");

const router = Router();

// Get All Blogs - Already handled in index.js "/" route

// View Single Blog
router.get("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate("createdBy", "fullName profileImageURL");

        if (!blog) return res.status(404).send("Blog Not Found");

        res.render("view", { 
            blog,
            user: req.user 
        });
    } catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Delete Blog (Owner Only)
router.delete("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        if (!req.user || blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this blog" });
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
