const { Router } = require('express');
const Series = require('../models/series');
const { uniqueSlug } = require('../models/series');
const Blog = require('../models/blog');
const { restrictToLoggedinUserOnly } = require('../middlewares/auth');
const router = Router();

// Loads a series by slug and checks the viewer may modify it. Returns
// { series } on success or { status, message } describing the failure, so the
// callers stay a single `if` instead of repeating the check five times.
async function findOwnedSeries(slug, user) {
  const series = await Series.findOne({ slug });

  if (!series) {
    return { status: 404, message: 'Series not found' };
  }

  // req.user comes from the JWT payload, so _id is a string.
  if (user.role !== 'ADMIN' && series.createdBy.toString() !== user._id) {
    return { status: 401, message: 'Unauthorized' };
  }

  return { series };
}

router.get('/', async (req, res) => {
  try {
    const allSeries = await Series.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'userName profileImageURL');

    // One grouped query for every count, rather than a find() per series.
    const counts = await Blog.aggregate([
      { $match: { series: { $ne: null } } },
      { $group: { _id: '$series', count: { $sum: 1 } } },
    ]);

    const countBySeries = {};
    counts.forEach((row) => {
      countBySeries[row._id.toString()] = row.count;
    });

    return res.render('seriesIndex', {
      user: req.user,
      allSeries,
      countBySeries,
    });
  } catch (error) {
    console.error('Error listing series:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Declared before '/:slug' so the literal is not swallowed by the param route.
router.get('/new', restrictToLoggedinUserOnly, (req, res) => {
  return res.render('addSeries', {
    user: req.user,
  });
});

router.post('/', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const { title, description } = req.body;

    const series = await Series.create({
      title,
      description,
      slug: await uniqueSlug(title),
      createdBy: req.user._id,
    });

    return res.redirect(`/series/${series.slug}`);
  } catch (error) {
    console.error('Error creating series:', error);
    return res.status(500).send('Error creating series. Please try again.');
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug }).populate('createdBy');
    if (!series) {
      return res.status(404).send('Series not found');
    }

    // Reading order: partNumber ascending, createdAt as the tiebreaker.
    const parts = await Blog.find({ series: series._id })
      .sort({ partNumber: 1, createdAt: 1 })
      .populate('createdBy');

    return res.render('series', {
      user: req.user,
      series,
      parts,
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return res.status(500).send('Internal Server Error');
  }
});

router.get('/:slug/edit', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const { series, status, message } = await findOwnedSeries(req.params.slug, req.user);
    if (!series) {
      return res.status(status).send(message);
    }

    return res.render('editSeries', {
      user: req.user,
      series,
    });
  } catch (error) {
    console.error('Error loading series for edit:', error);
    return res.status(500).send('Internal Server Error');
  }
});

router.post('/:slug/edit', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const { series, status, message } = await findOwnedSeries(req.params.slug, req.user);
    if (!series) {
      return res.status(status).send(message);
    }

    // The slug deliberately stays put — regenerating it would break links that
    // readers have already shared.
    series.title = req.body.title;
    series.description = req.body.description;
    await series.save();

    return res.redirect(`/series/${series.slug}`);
  } catch (error) {
    console.error('Error updating series:', error);
    return res.status(500).send('Error updating series. Please try again.');
  }
});

router.post('/:slug/delete', restrictToLoggedinUserOnly, async (req, res) => {
  try {
    const { series, status, message } = await findOwnedSeries(req.params.slug, req.user);
    if (!series) {
      return res.status(status).send(message);
    }

    // Deleting a series releases its posts; it never deletes them.
    await Blog.updateMany({ series: series._id }, { $set: { series: null, partNumber: null } });
    await Series.findByIdAndDelete(series._id);

    return res.redirect('/series');
  } catch (error) {
    console.error('Error deleting series:', error);
    return res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
