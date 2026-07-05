const { pool, query } = require('../src/config/database');

const run = async () => {
  await query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0`);
  await query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS usage_per_user INTEGER DEFAULT 1`);
  await query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)`);
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders (UPPER(coupon_code)) WHERE coupon_code IS NOT NULL`);
  await query(`
    CREATE TABLE IF NOT EXISTS database_backup_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      status VARCHAR(20) NOT NULL,
      file_name TEXT,
      file_size_bytes BIGINT DEFAULT 0,
      message TEXT,
      created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_database_backup_history_created
    ON database_backup_history (created_at DESC)
  `);
  await query(`
    INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active, description)
    VALUES ('AMANSPECIAL20', 'percent', 20, 0, NULL, TRUE, 'Marketing partner coupon for Aman commission tracking')
    ON CONFLICT (code) DO UPDATE SET
      discount_type = EXCLUDED.discount_type,
      discount_value = EXCLUDED.discount_value,
      is_active = TRUE,
      description = EXCLUDED.description,
      updated_at = NOW()
  `);
  console.log('Coupon/database management migration applied');
};

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
