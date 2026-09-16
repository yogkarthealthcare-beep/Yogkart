/**
 * Script: update_product_descriptions.js
 * Purpose: Execute migration 019 to permanently clean up mismatched descriptions in PostgreSQL.
 */
const { pool } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const sqlPath = path.resolve(__dirname, '../migrations/019_fix_mismatched_product_descriptions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('⏳ Running migration 019: Fix Mismatched Product Descriptions...');
    await pool.query(sql);
    console.log('✅ Successfully updated product descriptions and details in database.');
  } catch (err) {
    console.error('❌ Failed to update product descriptions:', err.message);
  } finally {
    await pool.end();
  }
})();
