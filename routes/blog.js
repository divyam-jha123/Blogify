const { Router } = require('express');
require('dotenv').config();
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const Series = require('../models/series');
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

// The series a user may attach a post to: their own, alphabetical for the picker.
function findOwnSeries(user) {
  return Series.find({ createdBy: user._id }).sort({ title: 1 });
}

// Resolves the submitted `series` field to { seriesId, series }. The picker only
// ever offers the user's own series, but the form is trivially forged, so
// ownership is enforced here rather than in the view. Returns { error } instead
// of throwing so callers can pick the status code.
async function resolveSeries(seriesField, user) {
  if (!seriesField) {
    return { seriesId: null, series: null };
  }

  let series;
  try {
    series = await Series.findById(seriesField);
  } catch (error) {
    // A malformed ObjectId throws rather than resolving to null.
    if (error.name === 'CastError') {
      return { error: { status: 404, message: 'Series not found' } };
    }
    throw error;
  }

  if (!series) {
    return { error: { status: 404, message: 'Series not found' } };
  }

  if (user.role !== 'ADMIN' && series.createdBy.toString() !== user._id) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  return { seriesId: series._id, series };
}

// Appends to the end of the series. Gaps left by deleted parts are never reused.
async function nextPartNumber(seriesId) {
  const last = await Blog.findOne({ series: seriesId }).sort({ partNumber: -1 });
  return (last && last.partNumber ? last.partNumber : 0) + 1;
}

router.get('/add-new', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    return res.render('addBlogs', {
      user: req.user,
      seriesList: await findOwnSeries(req.user),
    });
  } catch (error) {
    console.error('Error loading new blog form:', error);
    return res.status(500).send('Internal Server Error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('createdBy').populate('series');
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    const comments = await Comment.find({ blogId: req.params.id }).populate('createdBy');

    // A post in a series is read in the two-pane layout, so the rail needs enough
    // of each sibling to render a card. Standalone posts keep the single-column view.
    let seriesParts = null;
    let seriesIndex = -1;
    if (blog.series) {
      seriesParts = await Blog.find({ series: blog.series._id })
        .sort({ partNumber: 1, createdAt: 1 })
        .select('_id title body coverImageUrl createdAt');
      seriesIndex = seriesParts.findIndex((part) => part._id.equals(blog._id));
    }

    return res.render('blog', {
      user: req.user,
      blog,
      comments,
      series: blog.series || null,
      seriesParts,
      seriesIndex,
    });
  } catch (error) {
    // A malformed ObjectId throws here rather than resolving to null.
    if (error.name === 'CastError') {
      return res.status(404).send('Blog not found');
    }
    console.error('Error fetching blog:', error);
    return res.status(500).send('Internal Server Error');
  }
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

    const { seriesId, error } = await resolveSeries(req.body.series, req.user);
    if (error) {
      return res.status(error.status).send(error.message);
    }

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
      series: seriesId,
      partNumber: seriesId ? await nextPartNumber(seriesId) : null,
    });

    return res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).send('Error creating blog. Please try again.');
  }
});

router.get('/edit/:id', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    if (req.user.role !== 'ADMIN' && blog.createdBy.toString() !== req.user._id) {
      return res.status(401).send('Unauthorized');
    }

    return res.render('editBlogs', {
      user: req.user,
      blog,
      seriesList: await findOwnSeries(req.user),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send('Internal Server Error');
  }
});

router.post('/edit/:id', restrictToLoggedinUserOnly, upload.single('coverImageUrl'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    if (req.user.role !== 'ADMIN' && blog.createdBy.toString() !== req.user._id) {
      return res.status(401).send('Unauthorized');
    }

    const { title, content } = req.body;

    const { seriesId, error } = await resolveSeries(req.body.series, req.user);
    if (error) {
      return res.status(error.status).send(error.message);
    }

    blog.title = title;
    blog.body = content;

    // Only reposition when the post actually moves between series, so that
    // re-editing a post does not shuffle it to the end of its own series.
    if (String(blog.series) !== String(seriesId)) {
      blog.series = seriesId;
      blog.partNumber = seriesId ? await nextPartNumber(seriesId) : null;
    }

    // Replace the cover image only if a new file was uploaded
    if (req.file) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: 'blog-images',
        resource_type: 'auto',
      });

      blog.coverImageUrl = uploadResult.secure_url;
    }

    await blog.save();

    return res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).send('Error updating blog. Please try again.');
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