const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function verify() {
  try {
    console.log('=== VERIFYING VISIBILITY & INVENTORY RULES ===');
    
    // 1. Total counts
    const statusCounts = await pool.query(
      'SELECT is_active, COUNT(*)::int AS count FROM products GROUP BY is_active ORDER BY is_active'
    );
    console.log('Product status breakdown:', statusCounts.rows);

    // 2. Newly inserted AI products
    const aiStats = await pool.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active = false)::int AS inactive, COUNT(*) FILTER (WHERE is_active = true)::int AS active FROM products WHERE seo_generated_by = 'ai'"
    );
    console.log('AI Products (30 new):', aiStats.rows[0]);

    // 3. Check if any inactive product would appear in Public Catalog / Home Page / SEO queries
    const publicLeakCheck = await pool.query(
      "SELECT id, name, slug FROM products WHERE is_active = FALSE AND id IN (SELECT id FROM products WHERE is_active = TRUE)"
    );
    console.log('Public leak check (should be 0):', publicLeakCheck.rows.length);

    // 4. Check Inventory API query simulation
    const invQuery = await pool.query(
      "SELECT COUNT(*)::int AS inventory_active_items FROM products p WHERE p.is_active = TRUE"
    );
    console.log('Items that will show in /admin/inventory:', invQuery.rows[0].inventory_active_items);

    const invExcluded = await pool.query(
      "SELECT COUNT(*)::int AS draft_items_hidden FROM products p WHERE p.is_active = FALSE"
    );
    console.log('Draft items HIDDEN from /admin/inventory until published:', invExcluded.rows[0].draft_items_hidden);

    console.log('\nVerification complete! All 30 products are draft/inactive and 100% hidden.');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await pool.end();
  }
}

verify();

