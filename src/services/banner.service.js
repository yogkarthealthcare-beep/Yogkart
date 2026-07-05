const { query } = require('../config/database');

const BANNERS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('product', 'festival', 'coupon')),
  title VARCHAR(150) NOT NULL,
  subtitle VARCHAR(255),
  badge VARCHAR(100),
  bg_color VARCHAR(30) DEFAULT '#064e3b',
  image TEXT,
  cta_text VARCHAR(50) DEFAULT 'Shop Now',
  cta_link VARCHAR(255) DEFAULT '/products',
  product_id INTEGER,
  product_name VARCHAR(150),
  product_price NUMERIC,
  product_image TEXT,
  coupon_code VARCHAR(50),
  coupon_discount VARCHAR(100),
  coupon_expiry DATE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  image_fit VARCHAR(20) DEFAULT 'cover',
  image_opacity NUMERIC DEFAULT 0.2,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const DEFAULT_BANNERS = [
  {
    type: 'festival',
    title: 'Dhanvantari Jayanti Special',
    subtitle: 'Premium Ayurvedic & Healthcare Products',
    badge: 'Upto 40% OFF',
    bg_color: '#064e3b',
    image: 'https://images.pexels.com/photos/3735149/pexels-photo-3735149.jpeg?w=1200',
    cta_text: 'Shop Now',
    cta_link: '/products',
    sort_order: 1,
    is_active: true
  },
  {
    type: 'product',
    title: 'Boost Your Immunity Naturally',
    subtitle: 'Handpicked Herbs & Supplements',
    badge: 'New Arrivals',
    bg_color: '#1e3a5f',
    image: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?w=1200',
    cta_text: 'Explore',
    cta_link: '/products?category=supplements',
    sort_order: 2,
    is_active: true
  },
  {
    type: 'coupon',
    title: 'Exclusive Members Offer',
    subtitle: 'Use code & save on your first order',
    badge: 'Limited Time',
    bg_color: '#7c2d12',
    image: 'https://images.pexels.com/photos/3683053/pexels-photo-3683053.jpeg?w=1200',
    cta_text: 'Claim Offer',
    cta_link: '/products',
    coupon_code: 'YOGKART20',
    coupon_discount: '20% OFF',
    sort_order: 3,
    is_active: true
  }
];

const ensureBannersSchema = async () => {
  try {
    console.log('⏳ Ensuring banners schema...');
    await query(BANNERS_SCHEMA_SQL);
    
    // Add columns if they do not exist
    await query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_fit VARCHAR(20) DEFAULT 'cover'`);
    await query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_opacity NUMERIC DEFAULT 0.2`);
    await query(`ALTER TABLE banners ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb`);
    
    // Check if banners table is empty
    const checkRes = await query('SELECT COUNT(*)::integer FROM banners');
    const count = checkRes.rows[0].count;
    
    if (count === 0) {
      console.log('🌱 Seeding default banners...');
      for (const b of DEFAULT_BANNERS) {
        await query(
          `INSERT INTO banners
            (type, title, subtitle, badge, bg_color, image, cta_text, cta_link, sort_order, is_active,
             coupon_code, coupon_discount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            b.type, b.title, b.subtitle, b.badge, b.bg_color, b.image,
            b.cta_text, b.cta_link, b.sort_order, b.is_active,
            b.coupon_code || null, b.coupon_discount || null
          ]
        );
      }
      console.log('✅ Default banners seeded.');
    } else {
      console.log(`✅ Banners schema verified. ${count} banners exist.`);
    }
  } catch (err) {
    console.error('❌ Failed to ensure banners schema:', err);
  }
};

module.exports = { ensureBannersSchema };
