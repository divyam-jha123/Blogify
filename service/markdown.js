const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

// Post bodies are authored as Markdown and stored as the raw Markdown source, so
// rendering happens on read. marked itself does not sanitize, and the body is
// arbitrary user input, so its output must go through sanitize-html before it
// reaches the `<%- %>` in the view.
marked.setOptions({
  gfm: true,
  breaks: true, // Authors write prose, so a single newline should be a line break.
});

const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 'blockquote',
    'ul', 'ol', 'li',
    'code', 'pre',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    // rel/target must be listed here too, or the transformTags below adds them
    // and this filter immediately strips them again.
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title'],
    code: ['class'], // marked emits language-xxx on fenced blocks
  },
  // Blocks javascript: and data: URLs in both links and images.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Outbound links open in a new tab without handing over window.opener.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

function renderMarkdown(source) {
  if (!source) {
    return '';
  }

  return sanitizeHtml(marked.parse(source), SANITIZE_OPTIONS);
}

// Card excerpts show plain prose, not raw Markdown: without this a post opening
// with "# Heading" would render a literal '#' in the homepage and rail cards.
function markdownExcerpt(source, length = 100) {
  if (!source) {
    return '';
  }

  const text = sanitizeHtml(marked.parse(source), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > length ? `${text.slice(0, length)}...` : text;
}

module.exports = { renderMarkdown, markdownExcerpt };
