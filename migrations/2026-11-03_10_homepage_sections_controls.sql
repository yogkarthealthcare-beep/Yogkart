-- Migration: 2026-11-03_10_homepage_sections_controls.sql
-- Description: Add homepage_sections configuration into site_settings table for dynamic title/badge/visibility controls

BEGIN;

INSERT INTO site_settings (setting_key, setting_value, description)
VALUES (
  'homepage_sections',
  '[
    {
      "id": "shop_by_category",
      "name": "Shop by Category",
      "title": "Shop by Category",
      "badge": "CURATED SELECTIONS",
      "subtitle": "",
      "is_active": true,
      "display_order": 1
    },
    {
      "id": "featured_products",
      "name": "Featured Products",
      "title": "Featured Products",
      "badge": "ORGANIC HIGHLIGHTS",
      "subtitle": "",
      "is_active": true,
      "display_order": 2
    },
    {
      "id": "our_picks",
      "name": "Our Picks (Trending)",
      "title": "Our Picks",
      "badge": "MOST WANTED",
      "subtitle": "",
      "is_active": true,
      "display_order": 3
    },
    {
      "id": "special_prices",
      "name": "Special Prices (Deals)",
      "title": "Special Prices",
      "badge": "FLASH SALE",
      "subtitle": "",
      "is_active": true,
      "display_order": 4
    },
    {
      "id": "recently_viewed",
      "name": "Recently Viewed Products",
      "title": "Recently Viewed Products",
      "badge": "YOUR BROWSING HISTORY",
      "subtitle": "",
      "is_active": true,
      "display_order": 5
    },
    {
      "id": "shop_by_concern",
      "name": "Shop by Health & Skin Concern",
      "title": "Shop by Health & Skin Concern",
      "badge": "TARGETED SOLUTIONS",
      "subtitle": "",
      "is_active": true,
      "display_order": 6
    },
    {
      "id": "shop_by_wellness_goal",
      "name": "Shop by Wellness Goal",
      "title": "Shop by Wellness Goal",
      "badge": "WELLNESS FOR EVERYDAY LIFE",
      "subtitle": "Discover natural wellness products made to fit your everyday care routine.",
      "is_active": true,
      "display_order": 7
    }
  ]'::jsonb,
  'Visibility and heading configuration for homepage sections'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  updated_at = NOW();

COMMIT;

