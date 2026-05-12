// =====================================================
// Check Admin in Database
// Run: node check-admin.js
// =====================================================
const { query } = require('./src/config/database');

(async () => {
  try {
    const result = await query(`SELECT * FROM admins`);
    console.log('\n✅ Admins in database:');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
