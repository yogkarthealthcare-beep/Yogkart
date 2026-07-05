require('dotenv').config();
const { pool } = require('../src/config/database');

(async () => {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (
        table_name ILIKE '%review%'
        OR table_name IN ('users', 'products', 'orders', 'order_items')
      )
    ORDER BY table_name
  `);
  const columns = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        table_name ILIKE '%review%'
        OR table_name IN ('users', 'products', 'orders', 'order_items')
      )
    ORDER BY table_name, ordinal_position
  `);
  const constraints = await pool.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND (
        tc.table_name ILIKE '%review%'
        OR tc.table_name IN ('users', 'products', 'orders', 'order_items')
      )
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
  `);
  console.log(JSON.stringify({
    tables: tables.rows,
    columns: columns.rows,
    constraints: constraints.rows,
  }, null, 2));
})()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
