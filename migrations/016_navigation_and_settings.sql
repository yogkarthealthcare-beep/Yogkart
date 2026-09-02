-- =====================================================
-- Migration 016: Navigation Menus & Site Settings
-- =====================================================

-- 1. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for site_settings
DROP TRIGGER IF EXISTS trg_site_settings_updated ON site_settings;
CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Insert default announcement bar settings
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES (
  'announcement_bar', 
  '{"is_active": true, "text": "Add ₹{{remaining}} more for", "highlight_text": "FREE Shipping", "threshold": 499}', 
  'Configuration for the top announcement bar'
) ON CONFLICT (setting_key) DO NOTHING;


-- 2. Navigation Menus Table
CREATE TABLE IF NOT EXISTS navigation_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  url VARCHAR(255),
  parent_id UUID REFERENCES navigation_menus(id) ON DELETE CASCADE,
  menu_type VARCHAR(20) NOT NULL DEFAULT 'link' CHECK (menu_type IN ('link', 'dropdown')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_menus_parent ON navigation_menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_navigation_menus_order ON navigation_menus(display_order);
CREATE INDEX IF NOT EXISTS idx_navigation_menus_visible ON navigation_menus(is_visible);

-- Trigger for navigation_menus
DROP TRIGGER IF EXISTS trg_navigation_menus_updated ON navigation_menus;
CREATE TRIGGER trg_navigation_menus_updated
  BEFORE UPDATE ON navigation_menus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Insert default root menus
DO $$ 
DECLARE
  cat_id UUID := uuid_generate_v4();
  con_id UUID := uuid_generate_v4();
BEGIN
  -- Clear existing to avoid duplicates if re-run
  IF NOT EXISTS (SELECT 1 FROM navigation_menus) THEN
    INSERT INTO navigation_menus (id, label, url, menu_type, display_order) VALUES 
      (uuid_generate_v4(), 'Home', '/', 'link', 1),
      (cat_id, 'Shop by Category', '/products', 'dropdown', 2),
      (con_id, 'Shop by Concern', '/shop-by-concern', 'dropdown', 3),
      (uuid_generate_v4(), 'Shop by Ingredients', '/products?ingredient=all', 'link', 4),
      (uuid_generate_v4(), 'Best Sellers', '/products?sort=popular', 'link', 5),
      (uuid_generate_v4(), 'New Arrivals', '/products?sort=newest', 'link', 6),
      (uuid_generate_v4(), 'Offers', '/products?tag=offers', 'link', 7),
      (uuid_generate_v4(), 'Gift Sets', '/products?category=gift-sets', 'link', 8),
      (uuid_generate_v4(), 'Blog', '/blog', 'link', 9),
      (uuid_generate_v4(), 'Contact Us', '/contact', 'link', 10);
      
    -- Insert some child menus for 'Shop by Category'
    INSERT INTO navigation_menus (label, url, parent_id, menu_type, display_order) VALUES
      ('Face Serums & Oils', '/products?category=skin-care', cat_id, 'link', 1),
      ('Cleansers & Face Wash', '/products?category=skin-care', cat_id, 'link', 2),
      ('Hair Oils', '/products?category=hair-care', cat_id, 'link', 3),
      ('Shampoos', '/products?category=hair-care', cat_id, 'link', 4);
      
    -- Insert some child menus for 'Shop by Concern'
    INSERT INTO navigation_menus (label, url, parent_id, menu_type, display_order) VALUES
      ('Acne & Clear Skin', '/products?concern=acne-glow', con_id, 'link', 1),
      ('Anti-Aging & Firming', '/products?concern=anti-aging', con_id, 'link', 2),
      ('Hair Fall & Regrowth', '/products?concern=hair-fall', con_id, 'link', 3);
  END IF;
END $$;
