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

const getSocialPreview = async (req, res) => {
  try {
    const result = await query(
      `SELECT
        id, name, slug, brand, price, original_price, discount, rating,
        review_count, stock, images, thumbnail, description,
        key_benefits
       FROM products
       WHERE slug = $1 AND is_active = TRUE
       LIMIT 1`,
      [req.params.slug]
    );
    if (!result.rows.length) {
      return res.status(404).type('html').send(`<!doctype html>
        <html><head><meta name="robots" content="noindex"></head>
        <body><p>Product not found.</p><a href="${escapeHtml(`${SITE_URL}/products`)}">Browse products</a></body></html>`);
    }

    const product = result.rows[0];
    const productUrl = `${SITE_URL}/products/${product.slug}`;
    const primaryImage = absoluteUrl(
      product.thumbnail || product.images?.find(Boolean),
      DEFAULT_IMAGE
    );
    const rating = Number(product.rating || 0);
    const discount = Number(product.discount || 0);
    const ratingText = rating > 0
      ? ` Rated ${rating.toFixed(1)}/5${Number(product.review_count || 0) > 0 ? ` from ${product.review_count} reviews` : ''}.`
      : '';
    const discountText = discount > 0
      ? ` Save ${discount}%${Number(product.original_price) > Number(product.price) ? ` (MRP ${formatPrice(product.original_price)})` : ''}.`
      : '';
    const brandText = compact(product.brand) ? ` by ${compact(product.brand)}` : '';
    const summary = truncate(
      product.description
        || product.key_benefits?.filter(Boolean).join('. ')
        || `Shop ${product.name}${brandText} online at YogKart.`
    );
    const socialDescription = truncate(
      `${summary} Price ${formatPrice(product.price)}.${ratingText}${discountText}`,
      280
    );
    const title = truncate(
      `${product.name}${brandText} – ${formatPrice(product.price)} | YogKart`,
      95
    );
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: [primaryImage],
      description: summary,
      brand: compact(product.brand)
        ? { '@type': 'Brand', name: product.brand }
        : undefined,
      sku: String(product.id),
      url: productUrl,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'INR',
        price: Number(product.price).toFixed(2),
        availability: Number(product.stock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
      ...(rating > 0 && Number(product.review_count || 0) > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating.toFixed(1),
              reviewCount: Number(product.review_count),
              bestRating: '5',
              worstRating: '1',
            },
          }
        : {}),
    };

    res.removeHeader('Content-Security-Policy');
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow',
    });
    return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(socialDescription)}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${escapeHtml(productUrl)}">

  <meta property="og:type" content="product">
  <meta property="og:site_name" content="YogKart">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(socialDescription)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:image" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:alt" content="${escapeHtml(`${product.name}${brandText}`)}">
  <meta property="product:price:amount" content="${escapeHtml(Number(product.price).toFixed(2))}">
  <meta property="product:price:currency" content="INR">
  ${discount > 0 ? `<meta property="product:sale_price:amount" content="${escapeHtml(Number(product.price).toFixed(2))}">` : ''}
  ${rating > 0 ? `<meta property="product:rating:value" content="${escapeHtml(rating.toFixed(1))}">` : ''}
  ${rating > 0 ? '<meta property="product:rating:scale" content="5">' : ''}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(socialDescription)}">
  <meta name="twitter:image" content="${escapeHtml(primaryImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(`${product.name}${brandText}`)}">

  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <main>
    <h1>${escapeHtml(product.name)}</h1>
    <p>${escapeHtml(socialDescription)}</p>
    <a href="${escapeHtml(productUrl)}">View product on YogKart</a>
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
