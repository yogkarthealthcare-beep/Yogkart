const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runAudit() {
  console.log('=== CATEGORIES SCHEMA ===');
  const catCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    ORDER BY ordinal_position;
  `);
  console.log('Categories columns:', catCols.rows);

  console.log('\n=== 4. CATEGORIES & ACTIVE PRODUCT COUNTS ===');
  const catRes = await pool.query(`
    SELECT 
      c.id, c.name, c.is_active,
      COUNT(p.id) FILTER (WHERE p.is_active = TRUE)::int AS active_product_count,
      COUNT(p.id)::int AS total_product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name, c.is_active
    ORDER BY active_product_count DESC, c.name ASC;
  `);
  console.table(catRes.rows);

  console.log('\n=== 5. BADGES LOGIC IN BACKEND ===');
  const newComputedRes = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= (NOW() - INTERVAL '6 months'))::int AS new_by_date,
      COUNT(*) FILTER (WHERE is_new = TRUE)::int AS new_by_column_flag
    FROM products;
  `);
  console.log('New computed stats:', newComputedRes.rows[0]);

  // Check orders table
  const orderCountRes = await pool.query(`SELECT COUNT(*)::int AS total_orders FROM orders;`);
  console.log('Total orders in DB:', orderCountRes.rows[0].total_orders);

  console.log('\n=== 6. PRODUCTS WITH NAME LENGTH > 90 CHARACTERS ===');
  const longNames = await pool.query(`
    SELECT id, name, LENGTH(name) AS len, category_id
    FROM products
    WHERE LENGTH(name) > 90
    ORDER BY len DESC;
  `);
  console.log('Total products with name > 90 chars:', longNames.rows.length);
  console.log('Top 10 longest names:');
  console.table(longNames.rows.slice(0, 10));

  console.log('\n=== 7. DISCOUNT AUDIT (>= 50% or <= 5%) ===');
  const discountSamples = await pool.query(`
    SELECT id, name, price, original_price, discount,
           ROUND(((original_price - price)*100.0 / NULLIF(original_price, 0))::numeric, 1) AS calculated_discount
    FROM products
    WHERE discount >= 50 OR discount <= 5
    ORDER BY discount DESC
    LIMIT 20;
  `);
  console.table(discountSamples.rows);

  console.log('\n=== 8. RECENTLY INSERTED AI PRODUCTS CHECK ===');
  const aiProds = await pool.query(`
    SELECT COUNT(*)::int AS total_ai,
           COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive_count,
           COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_count,
           MIN(stock) AS min_stock,
           MAX(stock) AS max_stock,
           COUNT(*) FILTER (WHERE price IS NULL OR original_price IS NULL)::int AS null_prices
    FROM products
    WHERE seo_generated_by = 'ai' OR seo_generated_by = 'claude';
  `);
  console.log('AI inserted products audit:', aiProds.rows[0]);

  console.log('\n=== 9. SUSPECTED TESTIMONIAL PRODUCTS EXISTENCE IN DB ===');
  const testProds = await pool.query(`
    SELECT id, name, slug, is_active FROM products 
    WHERE name ILIKE '%Kumkumadi%' OR name ILIKE '%Bhringraj%' OR name ILIKE '%Chyawanprash%';
  `);
  console.log('Matching products in DB for testimonials:');
  console.table(testProds.rows);

  console.log('\n=== 10. SUSPECTED COMBO PRODUCTS EXISTENCE IN DB ===');
  const comboProds = await pool.query(`
    SELECT id, name, slug, is_active FROM products 
    WHERE name ILIKE '%Glowing Skin%' OR name ILIKE '%Hair Fall Control%' OR name ILIKE '%Immunity Boost%'
       OR name ILIKE '%Trio%' OR name ILIKE '%Combo%';
  `);
  console.log('Matching products in DB for combos:');
  console.table(comboProds.rows);

  console.log('\n=== 11. INCONSISTENT CATEGORY_ID EXAMPLES ===');
  // Check what products are in which categories
  const catMappingSamples = await pool.query(`
    SELECT p.id, p.name, p.category_id, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.category_id IS NULL 
       OR (p.name ILIKE '%comb%' AND p.category_id NOT ILIKE '%hair%')
       OR (p.name ILIKE '%soap%' AND p.category_id NOT ILIKE '%body%')
       OR (p.name ILIKE '%shampoo%' AND p.category_id NOT ILIKE '%hair%')
       OR (p.name ILIKE '%brush%' AND p.category_id NOT ILIKE '%dental%' AND p.category_id NOT ILIKE '%oral%')
       OR (p.name ILIKE '%bottle%' AND p.category_id NOT ILIKE '%wellness%')
    LIMIT 25;
  `);
  console.log('Inconsistent category samples count:', catMappingSamples.rows.length);
  console.table(catMappingSamples.rows);

  await pool.end();
}

runAudit().catch(console.error);
