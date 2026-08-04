const db = require('../config/database');
const { SITE_URL, generateHreflangs, generateSchemaOrgData, generateLlmsTxt } = require('../services/seo.service');
const { successResponse, errorResponse } = require('../utils/response');

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Master Sitemap Index XML
 */
const sitemapIndex = async (_req, res) => {
  try {
    const { rows: locales } = await db.query(`SELECT code FROM seo_locales WHERE is_active = TRUE ORDER BY code ASC`);

    let sitemapsXml = '';
    locales.forEach(l => {
      sitemapsXml += `
  <sitemap>
    <loc>${SITE_URL}/sitemap-${l.code.toLowerCase()}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
    });

    sitemapsXml += `
  <sitemap>
    <loc>${SITE_URL}/image-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/video-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapsXml}
</sitemapindex>`
    );
  } catch (err) {
    console.error('sitemapIndex error:', err);
    res.status(500).type('text/plain').send('Could not generate sitemap index');
  }
};

/**
 * Per-Locale XML Sitemap (e.g. /sitemap-en-in.xml, /sitemap-en-us.xml)
 */
const localeSitemap = async (req, res) => {
  try {
    const localeCode = (req.params.locale || 'en-in').toLowerCase();

    const { rows: courses } = await db.query(`SELECT slug, updated_at FROM courses WHERE is_active = TRUE LIMIT 100`);
    const { rows: products } = await db.query(`SELECT slug, updated_at FROM products WHERE is_active = TRUE LIMIT 100`);

    const basePages = ['/', '/courses', '/find-teachers', '/pricing', '/fitness-centers', '/products', '/blog', '/verify-certificate'];

    let urlsXml = '';

    for (const page of basePages) {
      const loc = `${SITE_URL}/${localeCode}${page === '/' ? '' : page}`;
      const hreflangs = generateHreflangs(page);
      const hreflangXml = hreflangs
        .map(h => `<xhtml:link rel="${h.rel}" hreflang="${h.hreflang}" href="${escapeXml(h.href)}"/>`)
        .join('\n    ');

      urlsXml += `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    ${hreflangXml}
  </url>`;
    }

    courses.forEach(c => {
      urlsXml += `
  <url>
    <loc>${escapeXml(`${SITE_URL}/${localeCode}/courses/${c.slug}`)}</loc>
    <lastmod>${new Date(c.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    products.forEach(p => {
      urlsXml += `
  <url>
    <loc>${escapeXml(`${SITE_URL}/${localeCode}/products/${p.slug}`)}</loc>
    <lastmod>${new Date(p.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`
    );
  } catch (err) {
    console.error('localeSitemap error:', err);
    res.status(500).type('text/plain').send('Could not generate locale sitemap');
  }
};

/**
 * Image XML Sitemap
 */
const imageSitemap = async (_req, res) => {
  try {
    const { rows: products } = await db.query(
      `SELECT name, slug, thumbnail, images FROM products WHERE is_active = TRUE AND thumbnail IS NOT NULL LIMIT 200`
    );

    let imagesXml = '';
    for (const p of products) {
      const loc = `${SITE_URL}/products/${p.slug}`;
      const img = p.thumbnail || (p.images && p.images[0]) || '';
      if (img) {
        imagesXml += `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <image:image>
      <image:loc>${escapeXml(img)}</image:loc>
      <image:title>${escapeXml(p.name)}</image:title>
    </image:image>
  </url>`;
      }
    }

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imagesXml}
</urlset>`
    );
  } catch (err) {
    console.error('image sitemap error:', err);
    res.status(500).type('text/plain').send('Could not generate image sitemap');
  }
};

/**
 * Video XML Sitemap
 */
const videoSitemap = async (_req, res) => {
  try {
    const { rows: courses } = await db.query(`SELECT title, description, slug, updated_at FROM courses WHERE is_active = TRUE LIMIT 50`);

    let videosXml = '';
    for (const c of courses) {
      const loc = `${SITE_URL}/courses/${c.slug}`;
      videosXml += `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <video:video>
      <video:thumbnail_loc>${SITE_URL}/assets/images/course-preview.jpg</video:thumbnail_loc>
      <video:title>${escapeXml(c.title)}</video:title>
      <video:description>${escapeXml(c.description || c.title)}</video:description>
      <video:publication_date>${new Date(c.updated_at).toISOString()}</video:publication_date>
    </video:video>
  </url>`;
    }

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${videosXml}
</urlset>`
    );
  } catch (err) {
    console.error('video sitemap error:', err);
    res.status(500).type('text/plain').send('Could not generate video sitemap');
  }
};

/**
 * Dynamic Robots.txt incorporating AI Crawlers Permissions
 */
const robots = async (_req, res) => {
  try {
    const { rows: crawlers } = await db.query(`SELECT * FROM seo_ai_crawlers`);

    let crawlerRules = '';
    crawlers.forEach(bot => {
      crawlerRules += `User-agent: ${bot.user_agent}\n`;
      if (bot.status === 'disallow') {
        crawlerRules += `Disallow: /\n\n`;
      } else {
        crawlerRules += `Allow: /\n\n`;
      }
    });

    res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/
Disallow: /profile/
Disallow: /orders/
Disallow: /cart/
Disallow: /checkout/
Disallow: /api/private/

${crawlerRules}Sitemap: ${SITE_URL}/sitemap-index.xml
Sitemap: ${SITE_URL}/image-sitemap.xml
Sitemap: ${SITE_URL}/video-sitemap.xml
`);
  } catch (err) {
    console.error('robots error:', err);
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE_URL}/sitemap-index.xml`);
  }
};

/**
 * AI Discoverability Text Endpoint (llms.txt)
 */
const llmsTxt = async (_req, res) => {
  const content = await generateLlmsTxt();
  res.type('text/plain; charset=utf-8').send(content);
};

/**
 * Public Page SEO Meta API
 */
const getPageSeo = async (req, res) => {
  try {
    const { path = '/', locale, country, lang } = req.query;

    let targetLocaleCode = (locale || (lang && country ? `${lang}-${country}` : 'en-in')).toLowerCase();

    let localeObj = {
      code: targetLocaleCode,
      country_code: country ? country.toUpperCase() : 'IN',
      language_code: lang ? lang.toLowerCase() : 'en',
      name: 'English (India)',
      currency_code: 'INR',
      currency_symbol: '₹',
      exchange_rate: 1.0,
      tax_rule: 'gst_inclusive'
    };

    try {
      const { rows: localeRows } = await db.query(
        `SELECT * FROM seo_locales WHERE code = $1 AND is_active = TRUE`,
        [targetLocaleCode]
      );
      if (localeRows.length > 0) {
        localeObj = localeRows[0];
      }
    } catch (dbErr) {
      console.warn('seo_locales table query warning:', dbErr.message);
    }

    let meta = null;
    try {
      const { rows: metaRows } = await db.query(
        `SELECT * FROM seo_meta_tags
         WHERE page_path = $1 AND (country_code = $2 OR country_code = 'GLOBAL') AND language_code = $3
         ORDER BY CASE WHEN country_code = $2 THEN 1 ELSE 2 END
         LIMIT 1`,
        [path, localeObj.country_code, localeObj.language_code]
      );
      if (metaRows.length > 0) meta = metaRows[0];
    } catch (dbErr) {
      console.warn('seo_meta_tags table query warning:', dbErr.message);
    }

    if (!meta) {
      meta = {
        page_path: path,
        country_code: localeObj.country_code,
        language_code: localeObj.language_code,
        seo_title: `Yogkart — Certification & Yoga Teachers (${localeObj.name})`,
        meta_description: `Book accredited yoga teachers and explore certification courses in ${localeObj.name}.`,
        meta_keywords: ['yoga', 'teacher training', 'meditation', localeObj.name],
        canonical_url: `${SITE_URL}/${localeObj.code}${path === '/' ? '' : path}`,
        og_title: `Yogkart ${localeObj.name}`,
        og_description: `Yoga certification and instructor booking`,
        og_image: `${SITE_URL}/assets/images/og-default.jpg`,
        twitter_card: 'summary_large_image',
        robots: 'index, follow',
        schema_type: 'WebPage',
        schema_json: generateSchemaOrgData('WebPage')
      };
    }

    const hreflangs = generateHreflangs(path);

    return successResponse(
      res,
      {
        path,
        locale: {
          code: localeObj.code,
          countryCode: localeObj.country_code,
          languageCode: localeObj.language_code,
          name: localeObj.name,
          currencyCode: localeObj.currency_code,
          currencySymbol: localeObj.currency_symbol,
          exchangeRate: parseFloat(localeObj.exchange_rate),
          taxRule: localeObj.tax_rule
        },
        meta: {
          seoTitle: meta.seo_title,
          metaDescription: meta.meta_description,
          metaKeywords: meta.meta_keywords || [],
          canonicalUrl: meta.canonical_url || `${SITE_URL}/${localeObj.code}${path === '/' ? '' : path}`,
          ogTitle: meta.og_title || meta.seo_title,
          ogDescription: meta.og_description || meta.meta_description,
          ogImage: meta.og_image || `${SITE_URL}/assets/images/og-default.jpg`,
          twitterCard: meta.twitter_card || 'summary_large_image',
          robots: meta.robots || 'index, follow',
          schemaType: meta.schema_type || 'WebPage',
          schemaJson: meta.schema_json && Object.keys(meta.schema_json).length > 0 ? meta.schema_json : generateSchemaOrgData(meta.schema_type || 'WebPage')
        },
        hreflangs
      },
      'SEO metadata fetched successfully'
    );
  } catch (err) {
    console.error('Error fetching page SEO:', err);
    return errorResponse(res, 'Failed to fetch page SEO metadata', 'SEO_FETCH_ERROR', 500);
  }
};

module.exports = {
  sitemapIndex,
  localeSitemap,
  imageSitemap,
  videoSitemap,
  robots,
  llmsTxt,
  getPageSeo
};
