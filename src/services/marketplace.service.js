const { query } = require('../config/database');

/** Default Seed Platforms with inline clean SVG icons / asset URLs */
const DEFAULT_PLATFORMS = [
  {
    name: 'Amazon',
    logo: `<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-[#FF9900]"><path d="M15.32 13.56c-.63.46-1.52.69-2.31.69-1.28 0-2.45-.6-2.45-1.92 0-1.7 1.83-2.11 3.52-2.11h.96v-.35c0-.75-.54-1.21-1.39-1.21-.86 0-1.63.36-2.01.62l-.46-1.12c.57-.42 1.63-.77 2.76-.77 1.77 0 2.65.92 2.65 2.62v3.74c0 .77.29 1.15.65 1.54l-1.07.82c-.37-.42-.65-.96-.85-1.55zm-1.28-2.26c-1.15 0-2.28.23-2.28 1.15 0 .61.43.88 1.07.88.75 0 1.54-.42 1.93-.88v-1.15h-.72zm5.72 6.77c-3.79 2.79-9.39 4.24-14.13 2.05-.66-.3-1.67-.93-1.27-1.67.39-.73 1.34-.34 1.94-.06 3.99 1.85 8.78.71 12.01-1.54.49-.34 1.11-.92 1.65-.5.54.42.27 1.32-.2 1.72zm.98-1.57c-.24-.31-.77-.43-1.19-.24-.42.19-.64.67-.43 1.09.28.56.78.89 1.36.89.24 0 .49-.06.71-.19.42-.25.57-.79.32-1.21l-.77-.34z"/></svg>`,
    website_url: 'https://www.amazon.in',
    display_order: 1,
    is_active: true
  },
  {
    name: 'Flipkart',
    logo: `<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-[#2874F0]"><path d="M19.5 3.5h-15C3.12 3.5 2 4.62 2 6v12c0 1.38 1.12 2.5 2.5 2.5h15c1.38 0 2.5-1.12 2.5-2.5V6c0-1.38-1.12-2.5-2.5-2.5zm-3.75 11.25h-2.5v2.5h-2.5v-2.5h-2.5v-2.5h2.5v-2.5h2.5v2.5h2.5v2.5z"/></svg>`,
    website_url: 'https://www.flipkart.com',
    display_order: 2,
    is_active: true
  },
  {
    name: 'Meesho',
    logo: `<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-[#F43397]"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    website_url: 'https://www.meesho.com',
    display_order: 3,
    is_active: true
  },
  {
    name: 'Walmart',
    logo: `<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-[#0071DC]"><path d="M12 2a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-3 0v-3A1.5 1.5 0 0112 2zm6.364 3.636a1.5 1.5 0 010 2.121l-2.121 2.122a1.5 1.5 0 01-2.122-2.122l2.122-2.121a1.5 1.5 0 012.121 0zM22 12a1.5 1.5 0 01-1.5 1.5h-3a1.5 1.5 0 010-3h3A1.5 1.5 0 0122 12zm-3.636 6.364a1.5 1.5 0 01-2.121 0l-2.122-2.121a1.5 1.5 0 012.122-2.122l2.121 2.122a1.5 1.5 0 010 2.121zM12 22a1.5 1.5 0 01-1.5-1.5v-3a1.5 1.5 0 013 0v3A1.5 1.5 0 0112 22zm-6.364-3.636a1.5 1.5 0 010-2.121l2.121-2.122a1.5 1.5 0 012.122 2.122L5.757 18.364a1.5 1.5 0 01-2.121 0zM2 12a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 010 3h-3A1.5 1.5 0 012 12zm3.636-6.364a1.5 1.5 0 012.121 0l2.122 2.121a1.5 1.5 0 01-2.122 2.122L5.636 7.757a1.5 1.5 0 010-2.121z"/></svg>`,
    website_url: 'https://www.walmart.com',
    display_order: 4,
    is_active: true
  }
];

const ensureMarketplaceSchema = async () => {
  try {
    // 1. Create selling_platforms table
    await query(`
      CREATE TABLE IF NOT EXISTS selling_platforms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        logo TEXT,
        website_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create product_marketplace_mappings table with UNIQUE(product_id, platform_id)
    await query(`
      CREATE TABLE IF NOT EXISTS product_marketplace_mappings (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        platform_id INT NOT NULL REFERENCES selling_platforms(id) ON DELETE CASCADE,
        external_product_id VARCHAR(255),
        product_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_product_platform UNIQUE (product_id, platform_id)
      );
    `);

    // 3. Create Indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_pmm_product_id ON product_marketplace_mappings(product_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_pmm_platform_id ON product_marketplace_mappings(platform_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_pmm_status ON product_marketplace_mappings(is_active);`);

    // 4. Seed Default Platforms if empty
    const checkPlatforms = await query(`SELECT COUNT(*) FROM selling_platforms`);
    if (parseInt(checkPlatforms.rows[0]?.count || 0) === 0) {
      for (const p of DEFAULT_PLATFORMS) {
        await query(
          `INSERT INTO selling_platforms (name, logo, website_url, display_order, is_active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO NOTHING`,
          [p.name, p.logo, p.website_url, p.display_order, p.is_active]
        );
      }
    }
  } catch (err) {
    console.error('Error ensuring marketplace schema:', err.message);
  }
};

module.exports = {
  ensureMarketplaceSchema,
  DEFAULT_PLATFORMS
};
