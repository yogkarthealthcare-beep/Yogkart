const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  // Check triggers
  const trigRes = await pool.query(`
    SELECT trigger_name, event_manipulation, action_statement, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'products';
  `);
  console.log('Triggers on products:', trigRes.rows);

  // Check all foreign keys where products is referenced
  const fkRes = await pool.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      rc.delete_rule
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name='products';
  `);
  console.log('Foreign keys referencing products:');
  console.table(fkRes.rows);

  // Check other tables that have product_id column without foreign key
  const colRes = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE column_name = 'product_id' AND table_schema = 'public';
  `);
  console.log('Tables with product_id column:');
  console.table(colRes.rows);

  await pool.end();
}
run();
