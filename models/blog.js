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
    coverImageUrl: {
        type: String,
        required: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    series: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "series",
        default: null,
    },
    // Ordering key within a series, not a display value: deleting a middle part
    // leaves a gap, and the views render the position from the sorted list instead.
    partNumber: {
        type: Number,
        default: null,
    }

}, { timestamps: true });

// The sort used by the series page and the reader's left rail.
blogSchema.index({ series: 1, partNumber: 1 });

const Blog = mongoose.model('blogPost', blogSchema);

module.exports = Blog;