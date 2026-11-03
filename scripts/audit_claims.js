const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const words = [
  'cure', 'cures', 'treat', 'treatment', 'treats', 'heal', 'heals',
  'reduces hair fall', 'hair growth', 'regrowth', 'fights dandruff',
  'anti-aging', 'detox', 'immunity', 'boost', 'clinically', 'proven',
  'guaranteed', '100% organic', 'certified', 'lab tested', 'GMP',
  'dermatologist', 'ayurvedic', 'before/after'
];

async function scanDb() {
  console.log('=== EXACT WORD BOUNDARY CLAIMS SCAN IN DATABASE (TABLE: products) ===');
  for (const w of words) {
    const escaped = w.replace(/%/g, '\\%').replace(/-/g, '[-\\s]');
    const pattern = `\\y${escaped}\\y`;
    const res = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE (name ~* $1 
         OR description ~* $1 
         OR short_description ~* $1 
         OR key_benefits::text ~* $1
         OR seo_title ~* $1
         OR meta_description ~* $1);
    `, [pattern]);
    if (res.rows[0].count > 0) {
      console.log(`Keyword "${w}": found in ${res.rows[0].count} products`);
      if (res.rows[0].count <= 5) {
        const samples = await pool.query(`
          SELECT id, name FROM products
          WHERE (name ~* $1 OR description ~* $1 OR short_description ~* $1 OR key_benefits::text ~* $1)
          LIMIT 3;
        `, [pattern]);
        samples.rows.forEach(s => console.log(`   Sample: ID ${s.id} - ${s.name.slice(0, 60)}...`));
      }
    }
  }
  await pool.end();
}

scanDb().catch(console.error);
