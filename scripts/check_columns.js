const { pool } = require('../src/config/database');

async function checkColumns() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM users LIMIT 1');
    if (res.rows.length === 0) {
      console.log('Table users is empty, but let\'s check fields:');
      const fields = res.fields.map(f => f.name);
      console.log('Columns:', fields);
    } else {
      console.log('Columns:', Object.keys(res.rows[0]));
    }
  } catch (err) {
    console.error('Error fetching columns:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkColumns();
