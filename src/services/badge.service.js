/**
 * Automatic Badge Calculation Service
 * 
 * Rules & Priority (Task 1.5):
 * 1. BEST SELLER (Priority Score 100): Product has at least 5 non-cancelled, delivered order items in the last 90 days.
 * 2. NEW (Priority Score 80): Product created within the last 30 days and is_active = true.
 * 3. DISCOUNT (Priority Score 60): Product has actual discount >= 10%.
 * 4. NULL (NO BADGE, Score 0): None of the above.
 * 
 * Exactly ONE badge per product maximum.
 * BEST SELLER > NEW > DISCOUNT
 */

const BESTSELLER_JOIN = `
  LEFT JOIN (
    SELECT 
      oi.product_id,
      COUNT(oi.id)::int AS total_delivered_items
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id 
      AND o.status = 'delivered' 
      AND o.created_at >= (NOW() - INTERVAL '90 days')
    GROUP BY oi.product_id
    HAVING COUNT(oi.id) >= 5
  ) cb ON cb.product_id = p.id
`;

const BADGE_SELECT_EXPRESSION = `
  CASE
    WHEN cb.product_id IS NOT NULL THEN 'BESTSELLER'
    WHEN (p.is_active = TRUE AND p.created_at >= (NOW() - INTERVAL '30 days')) THEN 'NEW'
    WHEN (
      COALESCE(p.discount, 0) >= 10 
      OR (
        COALESCE(p.original_price, 0) > COALESCE(p.price, 0) 
        AND ((p.original_price - p.price) / NULLIF(p.original_price, 0) * 100) >= 10
      )
    ) THEN 'BEST DISCOUNT'
    ELSE NULL
  END AS badge
`;

/**
 * Pure JS fallback/normalization helper
 * Priority: BEST SELLER (100) > NEW (80) > DISCOUNT (60) > NONE (0)
 */
function computeProductBadge(product, bestsellerProductIds = new Set()) {
  if (!product) return null;

  // Condition 1: BESTSELLER Eligibility (At least 5 delivered items in 90 days)
  const isBestseller = Boolean(bestsellerProductIds && bestsellerProductIds.has(product.id));

  // Condition 2: NEW Eligibility (Active and created within last 30 days)
  const createdAt = product.created_at || product.createdAt ? new Date(product.created_at || product.createdAt) : null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isNew = Boolean(product.is_active && createdAt && !isNaN(createdAt.getTime()) && createdAt >= thirtyDaysAgo);

  // Condition 3: DISCOUNT Eligibility (>= 10%)
  const originalPrice = parseFloat(product.original_price || product.originalPrice || 0);
  const price = parseFloat(product.price || 0);
  const discount = Number(product.discount || 0);
  const calculatedDiscount = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  const isDiscount = discount >= 10 || calculatedDiscount >= 10;

  // Apply Priority Order: BEST SELLER > NEW > DISCOUNT
  if (isBestseller) {
    return 'BESTSELLER';
  }
  if (isNew) {
    return 'NEW';
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

