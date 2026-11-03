-- Migration: 2026-11-03_04_homepage_curation_and_notification_log.sql
-- Description:
-- 1. Add show_on_home and home_order columns to products (Task 2.9)
-- 2. Curate initial homepage products (home_order 5, 10, 20, 30) and set show_on_home = true (Task 2.9)
-- 3. Create notification_log table for order emails/notifications (Task 2.2)
-- 4. Add UTM tracking columns to orders table (Task 2.4)
-- 5. Ensure deal_settings exists in site_settings (Task 1.6)

BEGIN;

-- 1. Add columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS home_order INTEGER NOT NULL DEFAULT 100;

-- Reset all products to show_on_home = false first
UPDATE public.products SET show_on_home = false, home_order = 100;

-- 2. Curate initial homepage products per Task 2.9
-- home_order = 5: Neem hair care sets/combos (IDs 92, 93, 94)
UPDATE public.products
SET show_on_home = true, home_order = 5
WHERE id IN (92, 93, 94);

-- home_order = 10: Neem wood combs (IDs 1, 82, 83, 84, 85, 86)
UPDATE public.products
SET show_on_home = true, home_order = 10
WHERE id IN (1, 82, 83, 84, 85, 86) OR (name ILIKE '%neem wood%comb%' AND id NOT IN (92, 93, 94));

-- home_order = 20: Soap bars (IDs 95, 96, 97, 98, 99)
UPDATE public.products
SET show_on_home = true, home_order = 20
WHERE id IN (95, 96, 97, 98, 99) OR name ILIKE '%soap bar%';

-- home_order = 30: Bamboo toothbrushes (ID 89)
UPDATE public.products
SET show_on_home = true, home_order = 30
WHERE id = 89 OR name ILIKE '%bamboo toothbrush%';

-- 3. Create notification_log table
CREATE TABLE IF NOT EXISTS public.notification_log (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(100),
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add UTM & Ad Click tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_content VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_term VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gclid VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fbclid VARCHAR(255);

-- 5. Add deal_settings to site_settings (disabled / null deal_end_at by default per Task 1.6)
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES (
  'deal_settings',
  '{"is_active": false, "deal_end_at": null, "title": "Special Prices"}'::jsonb,
  'Flash sale and limited time deals countdown timer configuration'
)
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;

