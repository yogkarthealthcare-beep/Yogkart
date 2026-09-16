/**
 * Automatic Badge Calculation Service
 * 
 * Rules & Priority:
 * 1. NEW (Priority Score 100): Product created within the last 6 months (created_at >= NOW() - INTERVAL '6 months').
 * 2. BEST SELLER (Priority Score 80): Product has total orders > 0 and the highest orders in its category.
 * 3. DISCOUNT (Priority Score 60): Product has actual discount > 20%.
 * 4. NULL (NO BADGE, Score 0): None of the above.
 * 
 * Exactly ONE badge per product.
 * NEW > BEST SELLER > DISCOUNT
 */

const BESTSELLER_JOIN = `
  LEFT JOIN (
    WITH product_orders AS (
      SELECT 
        oi.product_id,
        COUNT(DISTINCT oi.order_id)::int AS total_orders
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY oi.product_id
    ),
    ranked AS (
      SELECT 
        p.id AS product_id,
        p.category_id,
        COALESCE(po.total_orders, 0) AS total_orders,
        ROW_NUMBER() OVER (
          PARTITION BY p.category_id 
          ORDER BY COALESCE(po.total_orders, 0) DESC, p.review_count DESC, p.id ASC
        ) AS rank
      FROM products p
      JOIN product_orders po ON po.product_id = p.id
      WHERE p.is_active = TRUE
        AND p.category_id IS NOT NULL
        AND po.total_orders > 0
    )
    SELECT product_id, category_id, total_orders
    FROM ranked
    WHERE rank = 1
  ) cb ON cb.product_id = p.id
`;

const BADGE_SELECT_EXPRESSION = `
  CASE
    WHEN p.created_at >= (NOW() - INTERVAL '6 months') THEN 'NEW'
    WHEN cb.product_id IS NOT NULL THEN 'BESTSELLER'
    WHEN (
      COALESCE(p.discount, 0) > 20 
      OR (
        COALESCE(p.original_price, 0) > COALESCE(p.price, 0) 
        AND ((p.original_price - p.price) / NULLIF(p.original_price, 0) * 100) > 20
      )
    ) THEN 'BEST DISCOUNT'
    ELSE NULL
  END AS badge
`;

/**
 * Pure JS fallback/normalization helper
 * Priority: NEW (100) > BEST SELLER (80) > DISCOUNT (60) > NONE (0)
 */
function computeProductBadge(product, bestsellerProductIds = new Set()) {
  if (!product) return null;

  // Condition 1: NEW Eligibility (Created within last 6 months)
  const createdAt = product.created_at || product.createdAt ? new Date(product.created_at || product.createdAt) : null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const isNew = Boolean(createdAt && !isNaN(createdAt.getTime()) && createdAt >= sixMonthsAgo);

  // Condition 2: BESTSELLER Eligibility
  const isBestseller = Boolean(
    (bestsellerProductIds && bestsellerProductIds.has(product.id)) ||
    product.is_best_seller ||
    product.isBestSeller ||
    product.is_best_seller_calculated
  );

  // Condition 3: DISCOUNT Eligibility (> 20%)
  const originalPrice = parseFloat(product.original_price || product.originalPrice || 0);
  const price = parseFloat(product.price || 0);
  const discount = Number(product.discount || 0);
  const calculatedDiscount = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const isDiscount = discount > 20 || calculatedDiscount > 20;

  // Apply Priority Order: NEW > BEST SELLER > DISCOUNT
  if (isNew) {
    return 'NEW';
  }
  if (isBestseller) {
    return 'BESTSELLER';
  }
  if (isDiscount) {
    return 'BEST DISCOUNT';
  }

  return null;
}

module.exports = {
  BESTSELLER_JOIN,
  BADGE_SELECT_EXPRESSION,
  computeProductBadge,
};

