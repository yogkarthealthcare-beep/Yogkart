const { query } = require('../config/database');

const SITE_URL = String(
  process.env.SEO_BASE_URL || process.env.FRONTEND_URL || 'https://yogkart.com'
).replace(/\/$/, '');

const SEO_SCHEMA_SQL = `
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(70),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(180),
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS product_highlights TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_alt_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER NOT NULL DEFAULT 0
    CHECK (seo_score >= 0 AND seo_score <= 100),
  ADD COLUMN IF NOT EXISTS seo_suggestions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_generated_by VARCHAR(20) DEFAULT 'template',
  ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_active_slug
  ON products (slug) WHERE is_active = TRUE;
`;

const ensureProductSeoSchema = async () => {
  await query(SEO_SCHEMA_SQL);
  const missing = await query(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.seo_title IS NULL OR p.meta_description IS NULL`
  );
  for (const product of missing.rows) {
    const seo = templateSeo(product);
    seo.slug = product.slug || seo.slug;
    seo.canonical_url = productUrl(seo.slug);
    seo.schema_json = buildSchema(product, seo);
    const result = scoreSeo(seo, product);
    await query(
      `UPDATE products SET
        seo_title=$1, meta_description=$2, meta_keywords=$3, canonical_url=$4,
        short_description=$5, seo_description=$6, product_highlights=$7,
        image_alt_text=$8, faq_json=$9, schema_json=$10, seo_score=$11,
        seo_suggestions=$12, seo_generated_by='template', seo_generated_at=NOW()
       WHERE id=$13`,
      [
        seo.seo_title, seo.meta_description, seo.meta_keywords, seo.canonical_url,
        seo.short_description, seo.seo_description, seo.product_highlights,
        seo.image_alt_text, JSON.stringify(seo.faq_json), JSON.stringify(seo.schema_json),
        result.score, result.suggestions, product.id,
      ]
    );
  }
};

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const truncate = (value, max) => {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max + 1);
  return `${sliced.slice(0, sliced.lastIndexOf(' ') > max * 0.65 ? sliced.lastIndexOf(' ') : max).trim()}…`;
};
const unique = (values) => [...new Set(values.map(cleanText).filter(Boolean))];
const asArray = (value) => Array.isArray(value)
  ? value
  : String(value || '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);

const categoryName = (product) => cleanText(
  product.category_name || product.categoryName || product.category_id || product.category || ''
);

const productUrl = (slug) => `${SITE_URL}/products/${slug}`;

const buildSchema = (product, seo) => {
  const images = unique([
    product.thumbnail,
    ...asArray(product.images),
  ]);
  const availability = Number(product.stock || 0) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanText(product.name),
    image: images,
    description: seo.meta_description,
    sku: cleanText(product.sku || product.id || ''),
    brand: {
      '@type': 'Brand',
      name: cleanText(product.brand),
    },
    category: categoryName(product),
    url: seo.canonical_url,
    offers: {
      '@type': 'Offer',
      url: seo.canonical_url,
      priceCurrency: cleanText(product.currency || 'INR'),
      price: Number(product.price || 0).toFixed(2),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
};

const scoreSeo = (seo, product) => {
  let score = 0;
  const suggestions = [];
  const titleLength = cleanText(seo.seo_title).length;
  if (titleLength >= 35 && titleLength <= 60) score += 18;
  else suggestions.push('Keep the SEO title between 35 and 60 characters.');

  const metaLength = cleanText(seo.meta_description).length;
  if (metaLength >= 120 && metaLength <= 160) score += 18;
  else suggestions.push('Keep the meta description between 120 and 160 characters.');

  const keywords = asArray(seo.meta_keywords);
  const searchable = `${seo.seo_title} ${seo.meta_description} ${seo.seo_description}`.toLowerCase();
  if (keywords.length >= 3 && keywords.some(keyword => searchable.includes(keyword.toLowerCase()))) score += 14;
  else suggestions.push('Use at least three relevant keywords and include one in the title or description.');

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seo.slug || '') && (seo.slug || '').length <= 90) score += 12;
  else suggestions.push('Use a short, readable, hyphenated URL slug.');

  if (cleanText(seo.image_alt_text).length >= 10) score += 10;
  else suggestions.push('Add descriptive image alt text.');

  if (cleanText(seo.seo_description).length >= 250) score += 14;
  else suggestions.push('Expand the long SEO description to at least 250 characters.');

  if (seo.schema_json && seo.schema_json['@type'] === 'Product') score += 14;
  else suggestions.push('Generate Product structured data.');

  return { score: Math.min(score, 100), suggestions };
};

const templateSeo = (product) => {
  const name = cleanText(product.name);
  const brand = cleanText(product.brand);
  const category = categoryName(product) || 'Health & Wellness';
  const benefits = unique([
    ...asArray(product.key_benefits),
    ...asArray(product.product_highlights),
  ]).slice(0, 6);
  const features = unique([
    cleanText(product.pack_size),
    cleanText(product.ingredients),
    ...benefits,
  ]).slice(0, 8);
  const slug = slugify(product.slug || `${brand}-${name}`);
  const primaryKeyword = `${name} online`;
  const keywords = unique([
    primaryKeyword,
    name,
    `${brand} ${name}`,
    category,
    `${category} products`,
    ...asArray(product.tags),
    ...benefits,
  ]).slice(0, 12);
  const shortDescription = truncate(
    product.short_description
      || `${name} by ${brand} is a quality ${category.toLowerCase()} product${benefits[0] ? ` designed to ${benefits[0].toLowerCase()}` : ''}.`,
    220
  );
  const sourceDescription = cleanText(product.description);
  const longDescription = sourceDescription.length >= 250
    ? sourceDescription
    : [
        `${name} by ${brand} is designed for customers looking for trusted ${category.toLowerCase()} products.`,
        benefits.length ? `Key benefits include ${benefits.join(', ')}.` : '',
        features.length ? `Product details include ${features.join(', ')}.` : '',
        `Shop ${name} online at YogKart with secure checkout and reliable delivery.`,
      ].filter(Boolean).join(' ');
  const seoTitle = truncate(`${name} by ${brand} | Buy Online at YogKart`, 60);
  const metaDescription = truncate(
    `Buy ${name} by ${brand} online at YogKart. ${benefits.slice(0, 2).join(' and ') || `Explore this ${category.toLowerCase()} product`} with secure checkout and reliable delivery.`,
    158
  );
  const canonicalUrl = productUrl(slug);
  const faq = [
    {
      question: `What is ${name}?`,
      answer: shortDescription,
    },
    {
      question: `What are the key benefits of ${name}?`,
      answer: benefits.length
        ? benefits.join(', ')
        : `Please review the product description and label for the key features of ${name}.`,
    },
    {
      question: `How should I use ${name}?`,
      answer: cleanText(product.dosage)
        || 'Follow the directions on the product label or consult a qualified healthcare professional.',
    },
  ];
  const seo = {
    seo_title: seoTitle,
    meta_description: metaDescription,
    meta_keywords: keywords,
    slug,
    canonical_url: canonicalUrl,
    short_description: shortDescription,
    seo_description: longDescription,
    product_highlights: benefits.length ? benefits : features.slice(0, 5),
    image_alt_text: truncate(`${name} by ${brand} - ${category} product`, 180),
    faq_json: faq,
    product_tags: unique([...asArray(product.tags), ...keywords]).slice(0, 15),
    generated_by: 'template',
  };
  seo.schema_json = buildSchema(product, seo);
  const result = scoreSeo(seo, product);
  seo.seo_score = result.score;
  seo.seo_suggestions = result.suggestions;
  return seo;
};

const parseOpenAiOutput = (response) => {
  if (response.output_text) return JSON.parse(response.output_text);
  const text = response.output
    ?.flatMap(item => item.content || [])
    .find(item => item.type === 'output_text')
    ?.text;
  return text ? JSON.parse(text) : null;
};

const aiSeo = async (product, fallback) => {
  if (!process.env.OPENAI_API_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SEO_AI_TIMEOUT_MS || 8000));
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SEO_MODEL || 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: 'You generate accurate eCommerce SEO JSON. Never invent medical claims, certifications, ingredients, or benefits. Return JSON only.',
          },
          {
            role: 'user',
            content: `Generate SEO for this product. Preserve factual details only.
Product: ${JSON.stringify(product)}
Return keys: seo_title, meta_description, meta_keywords (array), slug, short_description, seo_description, product_highlights (array), image_alt_text, faq_json (array of question/answer), product_tags (array).
SEO title 35-60 chars, meta description 120-160 chars, readable lowercase slug.`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI SEO request failed: ${response.status}`);
    const generated = parseOpenAiOutput(await response.json());
    if (!generated || typeof generated !== 'object') return null;
    return {
      ...fallback,
      ...generated,
      meta_keywords: unique(asArray(generated.meta_keywords)),
      product_highlights: unique(asArray(generated.product_highlights)),
      product_tags: unique(asArray(generated.product_tags)),
      faq_json: Array.isArray(generated.faq_json) ? generated.faq_json : fallback.faq_json,
      generated_by: 'openai',
    };
  } catch (error) {
    console.warn('AI SEO generation unavailable; template fallback used:', error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const applyManualOverrides = (seo, overrides = {}, product = overrides) => {
  const fields = [
    'seo_title', 'meta_description', 'meta_keywords', 'slug', 'canonical_url',
    'short_description', 'seo_description', 'product_highlights',
    'image_alt_text', 'faq_json', 'schema_json', 'product_tags', 'generated_by',
  ];
  const merged = { ...seo };
  for (const field of fields) {
    if (overrides[field] !== undefined && overrides[field] !== null && overrides[field] !== '') {
      merged[field] = ['meta_keywords', 'product_highlights'].includes(field)
        ? unique(asArray(overrides[field]))
        : overrides[field];
    }
  }
  merged.slug = slugify(merged.slug);
  merged.canonical_url = cleanText(merged.canonical_url) || productUrl(merged.slug);
  merged.schema_json = buildSchema({ ...product, slug: merged.slug }, merged);
  const result = scoreSeo(merged, product);
  merged.seo_score = result.score;
  merged.seo_suggestions = result.suggestions;
  return merged;
};

const generateProductSeo = async (product, options = {}) => {
  const fallback = templateSeo(product);
  const generated = options.useAi === false ? null : await aiSeo(product, fallback);
  return applyManualOverrides(generated || fallback, options.overrides || product, product);
};

const ensureUniqueSlug = async (candidate, excludeId = null) => {
  const base = slugify(candidate) || `product-${Date.now()}`;
  for (let suffix = 0; suffix < 100; suffix++) {
    const slug = suffix ? `${base}-${suffix + 1}` : base;
    const result = await query(
      `SELECT 1 FROM products WHERE slug = $1 AND ($2::int IS NULL OR id <> $2::int) LIMIT 1`,
      [slug, excludeId]
    );
    if (!result.rows.length) return slug;
  }
  return `${base}-${Date.now()}`;
};

const notifySearchIndexing = async (product) => {
  if (!process.env.GOOGLE_INDEXING_API_ENDPOINT || !process.env.GOOGLE_INDEXING_API_TOKEN) return;
  try {
    await fetch(process.env.GOOGLE_INDEXING_API_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GOOGLE_INDEXING_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: product.canonical_url || productUrl(product.slug),
        type: 'URL_UPDATED',
      }),
    });
  } catch (error) {
    console.warn('Search indexing notification failed:', error.message);
  }
};

module.exports = {
  SITE_URL,
  ensureProductSeoSchema,
  generateProductSeo,
  ensureUniqueSlug,
  notifySearchIndexing,
  productUrl,
};
