// =====================================================
// Admin password ka bcrypt hash generate karne ke liye
// Run: node generate-admin-hash.js
// =====================================================
const bcrypt = require('bcryptjs');

const password = 'Yogkart#2025';  // ← Apna password yahan likho

bcrypt.hash(password, 12).then(hash => {
  console.log('\n✅ Bcrypt Hash Generated:');
  console.log('─'.repeat(70));
  console.log(hash);
  console.log('─'.repeat(70));
  console.log('\n📋 SQL mein use karo:');
  console.log(`INSERT INTO admins (name, email, password_hash, role)`);
  console.log(`VALUES ('Super Admin', 'superadmin@yogkart.com', '${hash}', 'super_admin')`);
  console.log(`ON CONFLICT (email) DO NOTHING;\n`);
});