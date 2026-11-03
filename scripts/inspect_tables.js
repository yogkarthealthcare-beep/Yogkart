const { pool } = require('../src/config/database');

async function inspectTables() {
  const couponsCols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='coupons'
    ORDER BY ordinal_position;
  `);
  console.log('Coupons columns:');
  couponsCols.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`));

  const ordersCols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders'
    ORDER BY ordinal_position;
  `);
  console.log('\nOrders columns:');
  ordersCols.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));

  const productsCols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products'
    ORDER BY ordinal_position;
  `);
  console.log('\nProducts columns:');
  productsCols.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));

  await pool.end();
}

inspectTables().catch(console.error);

