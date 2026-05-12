// =====================================================
// Insert Admin User into Database
// Run: node insert-admin.js
// =====================================================
const { query } = require('./src/config/database');

const adminEmail = 'superadmin@yogkart.com';
const passwordHash = '$2a$12$XxO1dc7.3ZoxfWOrXSEJX.0xpyOWYlLp0nd/eJNLZNvY0vrl8K4JG';

(async () => {
  try {
    // Check if admin already exists
    const existing = await query(
      `SELECT id FROM admins WHERE email = $1`,
      [adminEmail]
    );

    if (existing.rows.length > 0) {
      console.log('✅ Admin already exists');
      process.exit(0);
    }

    // Insert admin
    const result = await query(
      `INSERT INTO admins (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      ['Super Admin', adminEmail, passwordHash, 'super_admin', true]
    );

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('\n✅ Admin created successfully!');
      console.log('─'.repeat(60));
      console.log(`ID:    ${admin.id}`);
      console.log(`Name:  ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role:  ${admin.role}`);
      console.log('─'.repeat(60));
      console.log('\n🔓 Login Credentials:');
      console.log(`Email:    ${adminEmail}`);
      console.log(`Password: Yogkart#2025\n`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
