const { query } = require('../config/database');
const { SITE_URL } = require('../services/productSeo.service');

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const sitemap = async (_req, res) => {
  try {
    const result = await query(
      `SELECT p.slug, p.canonical_url, p.updated_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE
         AND (p.category_id IS NULL OR c.is_active = TRUE)
       ORDER BY p.updated_at DESC`
    );
    const urls = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${SITE_URL}/products`, priority: '0.9', changefreq: 'daily' },
      ...result.rows.map(product => ({
        loc: product.canonical_url || `${SITE_URL}/products/${product.slug}`,
        lastmod: new Date(product.updated_at).toISOString(),
        priority: '0.8',
        changefreq: 'weekly',
      })),
    ];
    const body = urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}
</urlset>`
    );
  } catch (err) {
    console.error('sitemap error:', err);
    res.status(500).type('text/plain').send('Could not generate sitemap');
  }
};

const robots = (_req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${SITE_URL}/sitemap.xml
`);
};

module.exports = { sitemap, robots };
