/**
 * Automatic Badge Calculation Service
 * 
 * Rules & Priority:
 * 1. NEW: Product added within the last 6 months (created_at >= NOW() - INTERVAL '6 months')
 * 2. BESTSELLER: Product is NOT NEW, has Total Orders > 10, and has the HIGHEST orders in its category
 * 3. BEST DISCOUNT: Product is NOT NEW, NOT BESTSELLER, and Discount > 20%
 * 4. NULL (NO BADGE): None of the above
 * 
 * Exactly ONE badge per product.
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
          ORDER BY COALESCE(po.total_orders, 0) DESC, p.id ASC
        ) AS rank
      FROM products p
      JOIN product_orders po ON po.product_id = p.id
      WHERE p.is_active = TRUE
        AND p.category_id IS NOT NULL
        AND p.created_at < (NOW() - INTERVAL '6 months')
        AND po.total_orders > 10
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
 */
function computeProductBadge(product, bestsellerProductIds = new Set()) {
  const createdAt = product.created_at ? new Date(product.created_at) : null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Priority 1: NEW (Added within last 6 months)
  if (createdAt && !isNaN(createdAt.getTime()) && createdAt >= sixMonthsAgo) {
    return 'NEW';
  }

  // Priority 2: BESTSELLER
  if (bestsellerProductIds.has(product.id) || product.is_best_seller_calculated) {
    return 'BESTSELLER';
  }

  // Priority 3: BEST DISCOUNT (> 20%)
  const originalPrice = parseFloat(product.original_price || product.originalPrice || 0);
  const price = parseFloat(product.price || 0);
  const discount = Number(product.discount || 0);
  const calculatedDiscount = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  if (discount > 20 || calculatedDiscount > 20) {
    return 'BEST DISCOUNT';
  }

  return null;
}

module.exports = {
  BESTSELLER_JOIN,
  BADGE_SELECT_EXPRESSION,
  computeProductBadge,
};
