const { query } = require('../config/database');
const { SITE_URL } = require('../services/productSeo.service');

const DEFAULT_IMAGE = `${SITE_URL}/assets/images/categories/category-placeholder.jpg`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const absoluteUrl = (value, fallback = '') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (/^https?:\/\//i.test(text)) return text;
  return `${SITE_URL}/${text.replace(/^\/+/, '')}`;
};

const compact = value => String(value || '').replace(/\s+/g, ' ').trim();

const truncate = (value, max = 220) => {
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

const getSocialPreview = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const result = await query(
      `SELECT
        p.id, p.name, p.slug, p.brand, p.price, p.original_price, p.discount, p.rating,
        p.review_count, p.stock, p.images, p.thumbnail, p.description, p.short_description,
        p.key_benefits, p.category_id, c.name AS category_name
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
        <body><p>Product not found.</p><a href="${escapeHtml(`${SITE_URL}/products`)}">Browse products on YogKart</a></body></html>`);
    }

    const product = result.rows[0];
    const productUrl = `${SITE_URL}/products/${product.slug}`;
    const rawImage = parseImages(product.images, product.thumbnail);
    const primaryImage = absoluteUrl(rawImage, DEFAULT_IMAGE);
    
    const price = Number(product.price || 0);
    const originalPrice = Number(product.original_price || 0);
    const discount = Number(product.discount || 0) || (originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);
    const rating = Number(product.rating || 4.8);

    const priceFormatted = formatPrice(price);
    const origPriceFormatted = originalPrice > price ? formatPrice(originalPrice) : '';
    const discountFormatted = discount > 0 ? `${discount}% OFF` : '';

    const isComb = /comb|kanga/i.test(product.name) || /comb/i.test(product.slug);
    let desc = String(product.short_description || product.description || '').trim();
    if (!isComb && /neem wooden comb|does not generate static electricity/i.test(desc)) {
      desc = `${product.name} is formulated with pure, premium ingredients for optimal efficacy, gentle daily care, and natural wellness.`;
    }

    let priceOfferSnippet = `Special Price: ${priceFormatted}`;
    if (origPriceFormatted && discountFormatted) {
      priceOfferSnippet += ` (MRP: ${origPriceFormatted} • ${discountFormatted})`;
    }

    const title = `${product.name} – Buy Online at ${priceFormatted} | YogKart`;
    const socialDescription = truncate(
      `${product.name} - ${priceOfferSnippet}. ${desc} 100% Genuine, Free Delivery & COD Available.`,
      280
    );

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [primaryImage],
      description: desc || socialDescription,
      brand: {
        '@type': 'Brand',
        name: compact(product.brand) || 'YogKart'
      },
      sku: String(product.id),
      url: productUrl,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'INR',
        price: price.toFixed(2),
        availability: Number(product.stock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'YogKart'
        }
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating.toFixed(1),
        reviewCount: Number(product.review_count || 5),
        bestRating: '5',
        worstRating: '1',
      },
    };

    res.removeHeader('Content-Security-Policy');
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'all',
    });
    return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(socialDescription)}">
  <link rel="canonical" href="${escapeHtml(productUrl)}">

  <!-- Open Graph / WhatsApp / Facebook / Telegram -->
  <meta property="og:site_name" content="YogKart">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(`${product.name} - ${priceFormatted} | YogKart`)}">
  <meta property="og:description" content="${escapeHtml(socialDescription)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:image" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:alt" content="${escapeHtml(product.name)}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta property="og:image:type" content="${primaryImage.endsWith('.png') ? 'image/png' : 'image/jpeg'}">

  <!-- Product Specific Metadata -->
  <meta property="product:price:amount" content="${escapeHtml(price.toFixed(2))}">
  <meta property="product:price:currency" content="INR">
  <meta property="product:availability" content="${Number(product.stock || 0) > 0 ? 'in stock' : 'out of stock'}">
  <meta property="product:condition" content="new">
  <meta property="product:brand" content="${escapeHtml(product.brand || 'YogKart')}">
  <meta property="product:retailer_item_id" content="${escapeHtml(String(product.id))}">
  ${discount > 0 ? `<meta property="product:sale_price:amount" content="${escapeHtml(price.toFixed(2))}">` : ''}

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@yogkart">
  <meta name="twitter:title" content="${escapeHtml(`${product.name} - ${priceFormatted} | YogKart`)}">
  <meta name="twitter:description" content="${escapeHtml(socialDescription)}">
  <meta name="twitter:image" content="${escapeHtml(primaryImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(product.name)}">

  <!-- Instant Browser Redirect to Full Interactive App -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 24px; text-align: center;">
  <main style="max-width: 540px; margin: 40px auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
    <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(product.name)}" style="width: 200px; height: 200px; object-fit: contain; margin-bottom: 20px; border-radius: 16px;" onerror="this.src='${DEFAULT_IMAGE}'">
    <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; line-height: 1.3;">${escapeHtml(product.name)}</h1>
    <p style="font-size: 22px; font-weight: 800; color: #059669; margin: 12px 0;">${escapeHtml(priceFormatted)} <span style="font-size: 14px; font-weight: 500; color: #6b7280; text-decoration: line-through;">${escapeHtml(origPriceFormatted)}</span> <span style="font-size: 12px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 9999px;">${escapeHtml(discountFormatted)}</span></p>
    <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;">${escapeHtml(socialDescription)}</p>
    <a href="${escapeHtml(productUrl)}" style="display: inline-block; background: #059669; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">Buy Now on YogKart</a>
  </main>
  <script>window.location.replace(${JSON.stringify(productUrl)});</script>
</body>
</html>`);
  } catch (error) {
    console.error('Social product preview error:', error);
    return res.status(500).type('html').send('<!doctype html><html><body>Preview unavailable.</body></html>');
  }
};

module.exports = { getSocialPreview };
