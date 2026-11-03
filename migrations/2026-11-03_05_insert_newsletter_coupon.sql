-- Migration: 2026-11-03_05_insert_newsletter_coupon.sql
-- Description:
-- Insert newsletter welcome coupon YOGKART15 (15%, min order 299, 1 use per user, expires 365 days, max discount 150) (Task 2.3)

BEGIN;

INSERT INTO public.coupons (
  id,
  code,
  description,
  discount_type,
  discount_value,
  max_discount_value,
  min_order_value,
  max_uses,
  used_count,
  current_uses,
  usage_per_user,
  expires_at,
  is_active,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'YOGKART15',
  'Welcome Newsletter Discount - 15% OFF (Up to ₹150, min order ₹299)',
  'percent',
  15.00,
  150.00,
  299.00,
  NULL,
  0,
  0,
  1,
  NOW() + INTERVAL '365 days',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.coupons WHERE code = 'YOGKART15'
);

COMMIT;

