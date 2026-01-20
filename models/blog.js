const mongoose = require('mongoose');


const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    converImageUrl: {
        type: String,
        required: false,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    }

}, { timestamps: true });

const Blog = mongoose.model('blogPost', blogSchema);

modules.exports = Blog;