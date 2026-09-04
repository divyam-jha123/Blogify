const { Router } = require('express');
const Blog = require('../models/blog');
const router = Router();

const AUTHOR_FIELDS = 'userName profileImageURL';

// Build the payload field by field. Never spread the Mongoose document and never
// return `createdBy` unprojected — the User schema has no `select: false` on
// `email`/`password`, so an unprojected populate would leak both.
function serialize(blog) {
  return {
    id: blog._id,
    title: blog.title,
    body: blog.body,
    coverImageUrl: blog.coverImageUrl,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
    author: blog.createdBy
      ? {
        userName: blog.createdBy.userName,
        profileImageURL: blog.createdBy.profileImageURL,
      }
      : null,
  };
}

router.get('/posts', async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', AUTHOR_FIELDS);

    return res.json(blogs.map(serialize));
  } catch (error) {
    console.error('Error listing blogs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    // A malformed ObjectId throws here rather than resolving to null.
    const blog = await Blog.findById(req.params.id).populate('createdBy', AUTHOR_FIELDS);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    return res.json(serialize(blog));
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Blog not found' });
    }
    console.error('Error fetching blog:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
