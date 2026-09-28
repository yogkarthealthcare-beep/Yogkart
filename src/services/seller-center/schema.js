const fs = require('fs');
const path = require('path');
const { query } = require('../../config/database');

const ensureSellerCenterSchema = async () => {
  try {
    const migrationPath = path.resolve(__dirname, '../../../migrations/020_seller_center_amazon.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await query(sql);
      console.log('✅ Seller Center & Amazon SP-API schema ensured.');
    }
  } catch (err) {
    console.error('❌ Error ensuring Seller Center schema:', err.message);
  }
};

module.exports = { ensureSellerCenterSchema };
