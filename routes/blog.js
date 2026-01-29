const { Router } = require('express');
require('dotenv').config();
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const { restrictToLoggedinUserOnly } = require('../middlewares/auth');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to use memory storage (required for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.get('/add-new', restrictToLoggedinUserOnly, (req, res) => {
  return res.render('addBlogs', {
    user: req.user,
  });
});

router.get('/:id', async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('createdBy');
  const comments = await Comment.find({ blogId: req.params.id }).populate('createdBy');

  return res.render('blog', {
    user: req.user,
    blog,
    comments,
  });
});

router.post('/comment/:blogId', async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

router.post('/', restrictToLoggedinUserOnly, upload.single('coverImageUrl'), async (req, res) => {
  try {
    const { title, content } = req.body;

    let coverImageUrl = '';

    // Upload image to Cloudinary if file exists
    if (req.file) {
      // Convert buffer to base64 data URI for Cloudinary
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: 'blog-images', // Optional: organize images in a folder
        resource_type: 'auto', // Automatically detect image type
      });

      coverImageUrl = uploadResult.secure_url; // Use secure_url for HTTPS
    }

    // Store the blog data in the database
    const blog = await Blog.create({
      title: title,
      body: content,
      createdBy: req.user._id,
      coverImageUrl: coverImageUrl,
    });

    return res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).send('Error creating blog. Please try again.');
  }
});

router.post('/delete/:id', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    if (req.user.role !== 'ADMIN' && blog.createdBy.toString() !== req.user._id) {
      return res.status(401).send('Unauthorized');
    }

    await Blog.findByIdAndDelete(req.params.id);
    return res.redirect('/');
  } catch (error) {
    console.log(error);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;