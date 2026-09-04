const mongoose = require('mongoose');


const seriesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    description: {
        type: String,
        required: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }

}, { timestamps: true });

const Series = mongoose.model('series', seriesSchema);

// "Building My Vorkium Startup" -> "building-my-vorkium-startup"
function slugify(title) {
    return String(title)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Titles are not unique, but slugs are. Append -2, -3, ... until one is free.
// A fallback base keeps an all-symbol title (e.g. "***") from producing an empty slug.
async function uniqueSlug(title) {
    const base = slugify(title) || 'series';
    let candidate = base;
    let suffix = 2;

    while (await Series.findOne({ slug: candidate })) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }

    return candidate;
}

module.exports = Series;
module.exports.slugify = slugify;
module.exports.uniqueSlug = uniqueSlug;
