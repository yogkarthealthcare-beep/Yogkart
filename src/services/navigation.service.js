const { query } = require('../config/database');

// ── Schema SQL ─────────────────────────────────────────────
const NAVIGATION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS navigation_menus (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  url         VARCHAR(255),
  parent_id   INTEGER REFERENCES navigation_menus(id) ON DELETE CASCADE,
  menu_type   VARCHAR(20) NOT NULL DEFAULT 'link' CHECK (menu_type IN ('link', 'dropdown')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible  BOOLEAN DEFAULT TRUE,
  is_active   BOOLEAN DEFAULT TRUE,
  open_in_new_tab BOOLEAN DEFAULT FALSE,
  icon        VARCHAR(60),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
`;

// ── Default seed menus ─────────────────────────────────────
const DEFAULT_MENUS = [
  { label: 'Home',            url: '/',                    menu_type: 'link',     display_order: 1,  icon: 'home' },
  { label: 'Products',        url: '/products',            menu_type: 'dropdown', display_order: 2,  icon: 'inventory_2' },
  { label: 'Shop by Concern', url: '/shop-by-concern',     menu_type: 'link',     display_order: 3,  icon: 'health_and_safety' },
  { label: 'Blog',            url: '/blog',                menu_type: 'link',     display_order: 4,  icon: 'article' },
  { label: 'About Us',        url: '/about',               menu_type: 'link',     display_order: 5,  icon: 'info' },
  { label: 'Contact',         url: '/contact',             menu_type: 'link',     display_order: 6,  icon: 'support_agent' },
];

const ensureNavigationSchema = async () => {
  try {
    console.log('⏳ Ensuring navigation_menus schema...');
    await query(NAVIGATION_SCHEMA_SQL);

    // Idempotent column additions in case table already existed without them
    await query(`ALTER TABLE navigation_menus ADD COLUMN IF NOT EXISTS icon VARCHAR(60)`);
    await query(`ALTER TABLE navigation_menus ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE navigation_menus ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);

    // Seed defaults only if table is empty
    const check = await query('SELECT COUNT(*)::integer AS cnt FROM navigation_menus');
    const count = parseInt(check.rows[0].cnt, 10);

    if (count === 0) {
      console.log('🌱 Seeding default navigation menus...');
      for (const m of DEFAULT_MENUS) {
        await query(
          `INSERT INTO navigation_menus (label, url, menu_type, display_order, icon, is_visible, is_active, open_in_new_tab)
           VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, FALSE)`,
          [m.label, m.url, m.menu_type, m.display_order, m.icon || null]
        );
      }
      console.log('✅ Default navigation menus seeded.');
    } else {
      console.log(`✅ navigation_menus schema verified. ${count} menus exist.`);
    }
  } catch (err) {
    console.error('❌ Failed to ensure navigation_menus schema:', err.message);
  }
};

module.exports = { ensureNavigationSchema };
