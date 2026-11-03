const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/controllers/product.controller.js');
let code = fs.readFileSync(filePath, 'utf8');

// Replace getHomepageProducts
const startMarker = '// ── GET /api/products/homepage ─────────────────────────';
const endMarker = '// ── GET /api/products/banners ──────────────────────────';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers for getHomepageProducts');
  process.exit(1);
}

const newGetHomepageProducts = `// ── GET /api/products/homepage ─────────────────────────
// Curation via show_on_home = true and home_order ASC (Task 2.9)
const getHomepageProducts = async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit) || 8);

    const curatedRes = await query(
      \`SELECT \${PRODUCT_FIELDS}
       FROM products p
       \${ACTIVE_CATEGORY_JOIN}
       \${BESTSELLER_JOIN}
       WHERE p.is_active = TRUE
         AND p.show_on_home = TRUE
         AND (p.stock > 0 OR p.stock IS NULL)
         AND \${ACTIVE_CATEGORY_CONDITION}
         AND \${PUBLIC_CATEGORY_CONDITION}
       ORDER BY p.home_order ASC, p.name ASC\`
    );

    const allCurated = curatedRes.rows;
    const featured = allCurated.slice(0, limit);
    const trending = allCurated.slice(0, limit);
    const deals = allCurated.filter(p => {
      const disc = Number(p.discount || 0);
      const orig = Number(p.original_price || 0);
      const pr = Number(p.price || 0);
      const calcDisc = orig > pr ? Math.round(((orig - pr) / orig) * 100) : 0;
      return disc >= 10 || calcDisc >= 10;
    }).slice(0, limit);

    return success(res, {
      featured,
      trending,
      ourPicks: trending,
      deals
    });
  } catch (err) {
    console.error('getHomepageProducts fatal error:', err);
    return error(res, 'Failed to fetch homepage products');
  }
};

`;

code = code.slice(0, startIndex) + newGetHomepageProducts + code.slice(endIndex);

// Add getReviewsSummary and getFeaturedTestimonials before module.exports
const moduleExportsMarker = 'module.exports = {';
const exportIndex = code.indexOf(moduleExportsMarker);

if (exportIndex === -1) {
  console.error('Could not find module.exports marker');
  process.exit(1);
}

const newReviewEndpoints = `// ── GET /api/products/reviews/summary (Task 1.1) ───────────
const getReviewsSummary = async (req, res) => {
  try {
    const statsRes = await query(\`
      SELECT 
        COUNT(*)::int AS total_reviews, 
        COALESCE(AVG(rating)::numeric(3,1), 0) AS average_rating
      FROM product_reviews
      WHERE is_approved = TRUE AND is_verified_buyer = TRUE;
    \`);
    const totalReviews = statsRes.rows[0]?.total_reviews || 0;
    const averageRating = parseFloat(statsRes.rows[0]?.average_rating || 0);
    return success(res, {
      totalReviews,
      averageRating,
      eligibleForDisplay: totalReviews >= 10
    });
  } catch (err) {
    console.error('getReviewsSummary error:', err);
    return error(res, 'Failed to fetch review summary');
  }
};

// ── GET /api/products/reviews/testimonials (Task 1.2) ─────
const getFeaturedTestimonials = async (req, res) => {
  try {
    const testRes = await query(\`
      SELECT pr.id, pr.rating, pr.title, pr.comment AS text, pr.user_name AS name,
             pr.created_at, p.name AS product, p.slug AS product_slug
      FROM product_reviews pr
      JOIN products p ON p.id = pr.product_id
      WHERE pr.is_approved = TRUE AND pr.is_verified_buyer = TRUE
      ORDER BY pr.rating DESC, pr.created_at DESC
      LIMIT 6;
    \`);
    return success(res, {
      reviews: testRes.rows,
      eligibleForDisplay: testRes.rows.length >= 3
    });
  } catch (err) {
    console.error('getFeaturedTestimonials error:', err);
    return error(res, 'Failed to fetch testimonials');
  }
};

`;

code = code.slice(0, exportIndex) + newReviewEndpoints + code.slice(exportIndex);

// Update module.exports list
code = code.replace(
  'addProductReview\n};',
  'addProductReview,\n  getReviewsSummary,\n  getFeaturedTestimonials\n};'
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Successfully updated product.controller.js');

