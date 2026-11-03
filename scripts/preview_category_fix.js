const { pool } = require('../src/config/database');

async function preview() {
  const query = `
    SELECT id, name, category_id, is_active
    FROM products
    WHERE name ILIKE '%comb%'
       OR name ILIKE '%soap bar%'
       OR id IN (1, 7, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99)
       OR category_id IS NULL
    ORDER BY id;
  `;
  const res = await pool.query(query);
  console.log(`Found ${res.rows.length} products to check:`);
  res.rows.forEach(r => {
    let target = r.category_id;
    if (r.name.toLowerCase().includes('comb') || [1, 7, 82, 83, 84, 85, 86, 92, 93, 94].includes(r.id) || r.name.toLowerCase().includes('shampoo')) {
      target = 'hair-care';
    } else if (r.name.toLowerCase().includes('soap bar') || [95, 96, 97, 98, 99].includes(r.id)) {
      target = 'body-care';
    } else if (r.id === 89 || r.name.toLowerCase().includes('toothbrush')) {
      target = 'oral-teeth-care';
    } else if (r.id === 87 || r.name.toLowerCase().includes('eye wash')) {
      target = 'eye-care';
    } else if ([88, 91].includes(r.id) || r.name.toLowerCase().includes('bottle')) {
      target = 'home-healthcare-essentials';
    }
    console.log(`ID ${r.id} | active: ${r.is_active} | curr: "${r.category_id}" -> new: "${target}" | ${r.name.slice(0, 45)}`);
  });

  await pool.end();
}

preview().catch(console.error);

