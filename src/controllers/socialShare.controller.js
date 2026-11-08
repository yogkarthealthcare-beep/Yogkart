const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { query } = require('../config/database');
const { SITE_URL } = require('../services/productSeo.service');

const DEFAULT_IMAGE = `${SITE_URL}/assets/images/categories/category-placeholder.jpg`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const absoluteUrl = (value, fallback = '') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (/^https?:\/\//i.test(text)) return text;
  return `${SITE_URL}/${text.replace(/^\/+/, '')}`;
};

const compact = value => String(value || '').replace(/\s+/g, ' ').trim();

const truncate = (value, max = 160) => {
  const text = compact(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max + 1).replace(/\s+\S*$/, '').trim()}…`;
};

const formatPrice = value => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseImages = (imagesVal, thumbnailVal) => {
  if (thumbnailVal && typeof thumbnailVal === 'string' && thumbnailVal.trim()) {
    return thumbnailVal.trim();
  }
  if (Array.isArray(imagesVal) && imagesVal.length > 0 && typeof imagesVal[0] === 'string') {
    return imagesVal[0].trim();
  }
  if (typeof imagesVal === 'string' && imagesVal.trim()) {
    try {
      const parsed = JSON.parse(imagesVal);
      if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0]).trim();
    } catch {
      const split = imagesVal.split(/[,|\n]/);
      if (split.length > 0 && split[0].trim()) return split[0].trim();
    }
  }
  return DEFAULT_IMAGE;
};

// ── Cache Directory for 1200x630 Share Banners ──────────────
const CACHE_DIR = path.join(__dirname, '../../uploads/share_banners');
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create share_banners directory:', e.message);
  }
}

// ── GET /share/images/:slug.jpg (1200x630 High-Res Banner) ──
const getSocialImage = async (req, res) => {
  try {
    const rawSlug = String(req.params.slug || '').replace(/\.(jpg|jpeg|png|webp)$/i, '').trim();
    if (!rawSlug) {
      return res.status(404).send('Not found');
    }

    const result = await query(
      `SELECT id, name, slug, brand, price, original_price, discount, images, thumbnail
       FROM products
       WHERE (slug = $1 OR id::text = $1)
         AND is_active = TRUE
       LIMIT 1`,
      [rawSlug]
    );

    if (!result.rows.length) {
      return res.status(404).send('Product not found');
    }

    const product = result.rows[0];
    const cacheFile = path.join(CACHE_DIR, `${product.slug}.jpg`);

    // Cache check unless force refreshed via ?refresh=true or ?v=
    const isRefresh = req.query.refresh === 'true';
    if (!isRefresh && fs.existsSync(cacheFile)) {
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      });
      return fs.createReadStream(cacheFile).pipe(res);
    }

    const price = Number(product.price || 0);
    const origPrice = Number(product.original_price || 0);
    const discount = Number(product.discount || 0) || (origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0);

    const priceFormatted = `₹${price.toLocaleString('en-IN')}`;
    const origPriceFormatted = origPrice > price ? `₹${origPrice.toLocaleString('en-IN')}` : '';
    const discountFormatted = discount > 0 ? `${discount}% OFF` : '';

    // Split product title into 2 clean lines
    const title = product.name || 'Ayurvedic Wellness Product';
    const words = title.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).length <= 26) {
        line1 += (line1 ? ' ' : '') + w;
      } else if ((line2 + ' ' + w).length <= 32) {
        line2 += (line2 ? ' ' : '') + w;
      }
    }
    if (!line2 && words.length > 5) {
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }

    const width = 1200;
    const height = 630;
    const brandText = "YOGKART • 100% NATURAL & AYURVEDIC";

    const svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FCFBF7"/>
            <stop offset="50%" stop-color="#FBF8F0"/>
            <stop offset="100%" stop-color="#F2ECE0"/>
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.08"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bg)"/>

        <!-- Outer border -->
        <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="28" fill="none" stroke="#0B4D2C" stroke-opacity="0.12" stroke-width="2"/>

        <!-- Brand Pill -->
        <rect x="70" y="65" width="410" height="38" rx="19" fill="#0B4D2C" fill-opacity="0.08"/>
        <text x="275" y="89" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#0B4D2C" text-anchor="middle" letter-spacing="2">${escapeXml(brandText)}</text>

        <!-- Product Title -->
        <text x="70" y="160" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="800" fill="#111827" letter-spacing="-0.5">${escapeXml(line1)}</text>
        ${line2 ? `<text x="70" y="210" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="800" fill="#111827" letter-spacing="-0.5">${escapeXml(line2)}</text>` : ''}

        <!-- Rating & Quality -->
        <text x="70" y="${line2 ? 265 : 220}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#059669">★ 4.9 Rating  •  100% Pure &amp; Authentic</text>

        <!-- Price Section -->
        <text x="70" y="${line2 ? 345 : 300}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#0B4D2C">
          ${escapeXml(priceFormatted)}
          ${origPriceFormatted ? `<tspan font-size="26" font-weight="500" fill="#9CA3AF" text-decoration="line-through"> ${escapeXml(origPriceFormatted)}</tspan>` : ''}
        </text>

        <!-- Discount Badge -->
        ${discountFormatted ? `
          <rect x="${line2 ? 290 : 290}" y="${line2 ? 312 : 267}" width="115" height="34" rx="8" fill="#DC2626"/>
          <text x="${line2 ? 347 : 347}" y="${line2 ? 335 : 290}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle">${escapeXml(discountFormatted)}</text>
        ` : ''}

        <!-- Shop Now CTA Button in Lower Corner -->
        <rect x="70" y="440" width="240" height="60" rx="30" fill="#0B4D2C" filter="url(#shadow)"/>
        <text x="190" y="478" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">SHOP NOW ➔</text>

        <!-- Trust Badges -->
        <text x="70" y="555" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#6B7280">100% Pure &amp; Natural  •  Cash on Delivery Available  •  Yogkart.com</text>

        <!-- Product Card Container on Right -->
        <rect x="670" y="65" width="450" height="490" rx="28" fill="#FFFFFF" filter="url(#shadow)"/>
        <rect x="670" y="65" width="450" height="490" rx="28" fill="none" stroke="#E5E7EB" stroke-width="1.5"/>
      </svg>
    `;

    const rawImage = parseImages(product.images, product.thumbnail);
    let productImgBuffer = null;

    if (rawImage && rawImage !== DEFAULT_IMAGE) {
      try {
        const fullImgUrl = absoluteUrl(rawImage, DEFAULT_IMAGE);
        const imgRes = await fetch(fullImgUrl, { signal: AbortSignal.timeout(3500) });
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          productImgBuffer = await sharp(Buffer.from(arrBuf))
            .resize(390, 430, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toBuffer();
        }
      } catch (err) {
        console.warn('Could not fetch product image for banner:', err.message);
      }
    }

    const composites = [
      { input: Buffer.from(svgOverlay), top: 0, left: 0 }
    ];

    if (productImgBuffer) {
      // Place centered inside the right container (container is at x: 670, y: 65, w: 450, h: 490)
      composites.push({
        input: productImgBuffer,
        top: 95,
        left: 700
      });
    }

    const bannerBuffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: '#FCFBF7'
      }
    })
      .composite(composites)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Cache to disk
    try {
      fs.writeFileSync(cacheFile, bannerBuffer);
    } catch (e) {
      console.warn('Could not write banner cache:', e.message);
    }

    res.removeHeader('Content-Security-Policy');
    res.set({
      'Content-Type': 'image/jpeg',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
    });
    return res.send(bannerBuffer);
  } catch (error) {
    console.error('Social banner generation error:', error);
    return res.redirect(DEFAULT_IMAGE);
  }
};

// ── GET /share/products/:slug (Server-Side HTML with Open Graph Meta) ──
const getSocialPreview = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const result = await query(
      `SELECT
        p.id, p.name, p.slug, p.brand, p.price, p.original_price, p.discount, p.rating,
        p.review_count, p.stock, p.images, p.thumbnail, p.description, p.short_description,
        p.meta_description, p.key_benefits, p.category_id, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE (p.slug = $1 OR p.id::text = $1)
         AND p.is_active = TRUE
       LIMIT 1`,
      [slug]
    );

    if (!result.rows.length) {
      return res.status(404).type('html').send(`<!doctype html>
        <html><head><meta name="robots" content="noindex"></head>
        <body><p>Product not found.</p><a href="${escapeHtml(`${SITE_URL}/products`)}">Browse products on Yogkart</a></body></html>`);
    }

    const product = result.rows[0];

    // Preserve any UTM or query parameters passed in the request
    const queryParams = new URLSearchParams(req.query || {});
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    // Target product page URL with UTMs intact for human shoppers
    const productUrl = `${SITE_URL}/products/${product.slug}${queryString}`;
    // Canonical link for social crawlers (points to this share route)
    const shareCanonicalUrl = `${SITE_URL}/p/${product.slug}`;

    // 1200x630 High-Resolution Share Banner URL & raw product image fallback
    const shareImageUrl = `https://api.yogkart.com/share/images/${product.slug}.jpg`;
    const rawProductImg = absoluteUrl(parseImages(product.images, product.thumbnail), DEFAULT_IMAGE);

    const price = Number(product.price || 0);
    const originalPrice = Number(product.original_price || 0);
    const discount = Number(product.discount || 0) || (originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);
    const priceFormatted = formatPrice(price);

    // Short English Marketing Description (editable from admin, fallback to default line, max 160 chars)
    const fallbackDesc = "Pure. Natural. Trusted. Boost your everyday wellness with 100% natural Ayurvedic care from Yogkart.";
    const rawMarketingDesc = compact(product.short_description || product.meta_description || fallbackDesc);
    const ogDescription = truncate(rawMarketingDesc, 160);

    const ogTitle = product.name;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [shareImageUrl, rawProductImg],
      description: ogDescription,
      brand: {
        '@type': 'Brand',
        name: compact(product.brand) || 'Yogkart'
      },
      sku: String(product.id),
      url: shareCanonicalUrl,
      offers: {
        '@type': 'Offer',
        url: shareCanonicalUrl,
        priceCurrency: 'INR',
        price: price.toFixed(2),
        availability: Number(product.stock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'Yogkart'
        }
      }
    };

    res.removeHeader('Content-Security-Policy');
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
      'Access-Control-Allow-Origin': '*'
    });

    return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(`${ogTitle} | Yogkart`)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <link rel="canonical" href="${escapeHtml(shareCanonicalUrl)}">

  <!-- Open Graph / WhatsApp / Facebook / Telegram -->
  <meta property="og:site_name" content="Yogkart">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:url" content="${escapeHtml(shareCanonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(shareImageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(shareImageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image" content="${escapeHtml(rawProductImg)}">

  <!-- Product Metadata -->
  <meta property="product:price:amount" content="${escapeHtml(price.toFixed(2))}">
  <meta property="product:price:currency" content="INR">
  <meta property="product:availability" content="${Number(product.stock || 0) > 0 ? 'in stock' : 'out of stock'}">
  <meta property="product:condition" content="new">
  <meta property="product:brand" content="${escapeHtml(product.brand || 'Yogkart')}">
  <meta property="product:retailer_item_id" content="${escapeHtml(String(product.id))}">
  ${discount > 0 ? `<meta property="product:sale_price:amount" content="${escapeHtml(price.toFixed(2))}">` : ''}

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@yogkart">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(shareImageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(product.name)}">

  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 24px; text-align: center;">
  <main style="max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
    <img src="${escapeHtml(shareImageUrl)}" alt="${escapeHtml(product.name)}" style="width: 100%; max-width: 480px; height: auto; object-fit: contain; margin-bottom: 20px; border-radius: 16px;">
    <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; line-height: 1.3;">${escapeHtml(product.name)}</h1>
    <p style="font-size: 22px; font-weight: 800; color: #0b4d2c; margin: 12px 0;">${escapeHtml(priceFormatted)}</p>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;">${escapeHtml(ogDescription)}</p>
    <a href="${escapeHtml(productUrl)}" style="display: inline-block; background: #0b4d2c; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(11,77,44,0.3);">Buy Now on Yogkart</a>
  </main>
  <script>
    // Real human visitors are seamlessly redirected to the full app
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace(${JSON.stringify(productUrl)});
    }
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('Social product preview error:', error);
    return res.status(500).type('html').send('<!doctype html><html><body>Preview unavailable.</body></html>');
  }
};

module.exports = { getSocialPreview, getSocialImage };
