const { pool } = require('../src/config/database');

async function runPriceReport() {
  const res = await pool.query(`
    SELECT id, name, price, original_price, discount,
           ROUND(((original_price - price) / NULLIF(original_price, 0)) * 100) AS calculated_discount
    FROM products
    WHERE is_active = true
      AND (
        discount >= 50 OR discount <= 5
        OR (ROUND(((original_price - price) / NULLIF(original_price, 0)) * 100) >= 50)
        OR (ROUND(((original_price - price) / NULLIF(original_price, 0)) * 100) <= 5)
      )
    ORDER BY discount DESC, id ASC;
  `);

  console.log(`Found ${res.rows.length} active products with discount >= 50% or <= 5%:\n`);
  console.log('| ID | Product Name | Selling Price (₹) | MRP (₹) | DB Discount | Calculated Discount |');
  console.log('|---|---|---|---|---|---|');
  res.rows.forEach(r => {
    console.log(`| ${r.id} | ${r.name.replace(/\|/g, '-').slice(0, 50)} | ₹${r.price} | ₹${r.original_price} | ${r.discount}% | ${r.calculated_discount}% |`);
  });

  await pool.end();
}

runPriceReport().catch(console.error);

