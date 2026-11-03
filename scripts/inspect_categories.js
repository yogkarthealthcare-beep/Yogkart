const { pool } = require('../src/config/database');

async function inspect() {
  const catRes = await pool.query('SELECT id, name, parent_id, is_active FROM categories ORDER BY id;');
  console.log('All Categories:');
  catRes.rows.forEach(c => console.log(`${c.id} | ${c.name} | parent: ${c.parent_id} | active: ${c.is_active}`));

  // Check specific products
  const productsToCheck = await pool.query(`
    SELECT id, name, category_id, is_active, is_best_seller, is_new
    FROM products
    WHERE id IN (1, 7, 82, 83, 84, 85, 86, 87, 88, 89, 91, 94, 96, 97, 98, 99)
       OR name ILIKE '%comb%'
       OR name ILIKE '%soap bar%'
    ORDER BY id;
  `);
  console.log('\nTarget products for category hygiene:');
  productsToCheck.rows.forEach(p => console.log(`[${p.id}] ${p.name.slice(0, 40)} -> cat: ${p.category_id}`));

  await pool.end();
}

inspect().catch(console.error);
