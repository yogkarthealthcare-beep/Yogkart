const { query } = require('../config/database');

// ── Schema SQL ─────────────────────────────────────────────
const SETTINGS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS site_settings (
  id            SERIAL PRIMARY KEY,
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
`;

// ── Default seed settings ─────────────────────────────────
const DEFAULT_SETTINGS = [
  {
    setting_key: 'announcement_bar',
    setting_value: {
      is_active: true,
      text: 'Add ₹{{remaining}} more for',
      highlight_text: 'FREE Shipping',
      threshold: 499
    },
    description: 'Header announcement / free shipping progress bar settings'
  }
];

const ensureSettingsSchema = async () => {
  try {
    console.log('⏳ Ensuring site_settings schema...');
    await query(SETTINGS_SCHEMA_SQL);

    // Seed defaults only for keys that don't exist yet
    for (const s of DEFAULT_SETTINGS) {
      await query(
        `INSERT INTO site_settings (setting_key, setting_value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (setting_key) DO NOTHING`,
        [s.setting_key, JSON.stringify(s.setting_value), s.description]
      );
    }
    console.log('✅ site_settings schema verified and seeded.');
  } catch (err) {
    console.error('❌ Failed to ensure site_settings schema:', err.message);
  }
};

module.exports = { ensureSettingsSchema };
