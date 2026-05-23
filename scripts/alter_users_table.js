const { pool } = require('../src/config/database');

async function alterTable() {
  const client = await pool.connect();
  try {
    console.log('⏳ Altering users table to add Google login fields...');
    
    // Add columns
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_temporary_data BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT TRUE;
    `);
    
    console.log('✅ Columns google_id, is_temporary_data, is_profile_completed added successfully!');
    
    // Verify columns
    const res = await client.query('SELECT * FROM users LIMIT 1');
    const fields = res.fields.map(f => f.name);
    console.log('Updated users columns:', fields);
  } catch (err) {
    console.error('❌ Failed to alter table:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

alterTable();
