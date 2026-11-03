-- Migration: 2026-11-03_08_navigation_menu_bar_controls.sql
-- Description: Add badge column, master menu_bar setting, and populate exact 9 navbar items matching live store header
BEGIN;

-- 1. Add badge column to navigation_menus if it doesn't exist
ALTER TABLE navigation_menus ADD COLUMN IF NOT EXISTS badge VARCHAR(50);

-- 2. Master menu_bar setting in site_settings
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES ('menu_bar', '{"is_active": true}', 'Master toggle and display settings for header navigation menu bar')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Reset and seed canonical menu items matching user header screenshot
DELETE FROM navigation_menus WHERE parent_id IS NOT NULL;
DELETE FROM navigation_menus;

-- Top-level Menu Items
INSERT INTO navigation_menus (id, label, url, parent_id, menu_type, display_order, is_visible, is_active, open_in_new_tab, icon, badge)
VALUES
(1, 'Home', '/', NULL, 'link', 1, TRUE, TRUE, FALSE, 'home', NULL),
(2, 'Shop by Category', '/products', NULL, 'dropdown', 2, TRUE, TRUE, FALSE, NULL, NULL),
(3, 'Shop by Concern', '/products', NULL, 'dropdown', 3, TRUE, TRUE, FALSE, NULL, NULL),
(4, 'Best Sellers', '/products?sort=rating', NULL, 'link', 4, TRUE, TRUE, FALSE, NULL, NULL),
(5, 'New Arrivals', '/products?sort=newest', NULL, 'link', 5, TRUE, TRUE, FALSE, NULL, NULL),
(6, 'Offers', '/products?featured=true', NULL, 'link', 6, TRUE, TRUE, FALSE, NULL, 'HOT'),
(7, 'Gift Sets', '/products?category=gift-sets', NULL, 'link', 7, TRUE, TRUE, FALSE, NULL, NULL),
(8, 'Blog', '/blog', NULL, 'link', 8, TRUE, TRUE, FALSE, NULL, NULL),
(9, 'Contact Us', '/contact', NULL, 'link', 9, TRUE, TRUE, FALSE, NULL, NULL);

-- Submenu for Shop by Category (parent_id = 2)
INSERT INTO navigation_menus (id, label, url, parent_id, menu_type, display_order, is_visible, is_active, open_in_new_tab, icon, badge)
VALUES
(101, 'Skin Care', '/products?category=skin-care', 2, 'link', 1, TRUE, TRUE, FALSE, NULL, NULL),
(102, 'Hair Care', '/products?category=hair-care', 2, 'link', 2, TRUE, TRUE, FALSE, NULL, NULL),
(103, 'Body Care', '/products?category=body-care', 2, 'link', 3, TRUE, TRUE, FALSE, NULL, NULL),
(104, 'Eye Care', '/products?category=eye-care', 2, 'link', 4, TRUE, TRUE, FALSE, NULL, NULL),
(105, 'Oral & Teeth Care', '/products?category=oral-teeth-care', 2, 'link', 5, TRUE, TRUE, FALSE, NULL, NULL),
(106, 'Baby Care', '/products?category=baby-care', 2, 'link', 6, TRUE, TRUE, FALSE, NULL, NULL);

-- Submenu for Shop by Concern (parent_id = 3)
INSERT INTO navigation_menus (id, label, url, parent_id, menu_type, display_order, is_visible, is_active, open_in_new_tab, icon, badge)
VALUES
(201, 'Acne & Clear Glow', '/products?concern=acne-glow', 3, 'link', 1, TRUE, TRUE, FALSE, NULL, NULL),
(202, 'Hair Fall & Regrowth', '/products?concern=hair-fall', 3, 'link', 2, TRUE, TRUE, FALSE, NULL, NULL),
(203, 'Anti-Aging & Firming', '/products?concern=anti-aging', 3, 'link', 3, TRUE, TRUE, FALSE, NULL, NULL),
(204, 'Immunity & Stamina', '/products?concern=immunity', 3, 'link', 4, TRUE, TRUE, FALSE, NULL, NULL),
(205, 'Stress & Sleep Care', '/products?concern=stress', 3, 'link', 5, TRUE, TRUE, FALSE, NULL, NULL),
(206, 'Detox & Digestion', '/products?concern=digestion', 3, 'link', 6, TRUE, TRUE, FALSE, NULL, NULL);

-- Update sequence if table has serial id
SELECT setval(pg_get_serial_sequence('navigation_menus', 'id'), COALESCE((SELECT MAX(id) FROM navigation_menus), 1));

COMMIT;
