// =====================================================
// Update Admin Password Hash
// Run: node update-admin-hash.js
// =====================================================
const { query } = require('./src/config/database');

const adminEmail = 'superadmin@yogkart.com';
const newPasswordHash = '$2a$12$XxO1dc7.3ZoxfWOrXSEJX.0xpyOWYlLp0nd/eJNLZNvY0vrl8K4JG';

(async () => {
  try {
    const result = await query(
      `UPDATE admins 
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, name, email, role`,
      [newPasswordHash, adminEmail]
    );

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('\n✅ Admin password updated successfully!');
      console.log('─'.repeat(60));
      console.log(`Name:  ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role:  ${admin.role}`);
      console.log('─'.repeat(60));
      console.log('\n🔓 Login Credentials:');
      console.log(`Email:    ${adminEmail}`);
      console.log(`Password: Yogkart#2025\n`);
    } else {
      console.log('❌ Admin not found');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
