const { Router } = require('express');
const Blog = require('../models/blog');
const Series = require('../models/series');
const router = Router();

const AUTHOR_FIELDS = 'userName profileImageURL';
const SERIES_FIELDS = 'title slug';

// This API is read-only, unauthenticated, and returns only already-public data,
// so it is opened to any origin for use from external sites (e.g. a portfolio).
// Credentials are deliberately not allowed: '*' and cookies are mutually
// exclusive per the CORS spec, and nothing here is user-specific anyway.
// Written by hand rather than pulling in the `cors` package for ~10 lines.
router.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

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
    series: blog.series
      ? {
        id: blog.series._id,
        title: blog.series.title,
        slug: blog.series.slug,
      }
      : null,
    partNumber: blog.partNumber,
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
      .populate('createdBy', AUTHOR_FIELDS)
      .populate('series', SERIES_FIELDS);

    return res.json(blogs.map(serialize));
  } catch (error) {
    console.error('Error listing blogs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    // A malformed ObjectId throws here rather than resolving to null.
    const blog = await Blog.findById(req.params.id)
      .populate('createdBy', AUTHOR_FIELDS)
      .populate('series', SERIES_FIELDS);

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

// Listed before '/series/:slug' for clarity; the paths do not actually collide.
router.get('/series', async (req, res) => {
  try {
    const allSeries = await Series.find({}).sort({ createdAt: -1 });

    // One grouped query for every count rather than a find() per series.
    const counts = await Blog.aggregate([
      { $match: { series: { $ne: null } } },
      { $group: { _id: '$series', count: { $sum: 1 } } },
    ]);

    const countBySeries = {};
    counts.forEach((row) => {
      countBySeries[row._id.toString()] = row.count;
    });

    return res.json(allSeries.map((series) => ({
      id: series._id,
      title: series.title,
      slug: series.slug,
      description: series.description,
      partCount: countBySeries[series._id.toString()] || 0,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
    })));
  } catch (error) {
    console.error('Error listing series:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/series/:slug', async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug });

    if (!series) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const parts = await Blog.find({ series: series._id })
      .sort({ partNumber: 1, createdAt: 1 })
      .populate('createdBy', AUTHOR_FIELDS)
      .populate('series', SERIES_FIELDS);

    return res.json({
      id: series._id,
      title: series.title,
      slug: series.slug,
      description: series.description,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
      parts: parts.map(serialize),
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
