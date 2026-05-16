const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const BlogSchema = new Schema({
    title: {
        type: String,
        required: true, 
    },
    body: {
        type: String,
        required: true, 
    },
    coverImageURL: {
        type: String, 
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
    }
}, { timestamps: true });


const Blog = mongoose.models.blog || model("blog", BlogSchema);
module.exports = Blog;
