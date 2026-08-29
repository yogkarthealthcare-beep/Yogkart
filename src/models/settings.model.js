const { query } = require('../config/database');

class SettingsModel {
  static async getSetting(key) {
    const sql = `SELECT setting_value FROM site_settings WHERE setting_key = $1`;
    const result = await query(sql, [key]);
    return result.rows.length ? result.rows[0].setting_value : null;
  }

  static async getAllSettings() {
    const sql = `SELECT setting_key, setting_value, description FROM site_settings`;
    const result = await query(sql);
    const settings = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  static async updateSetting(key, value, description = null) {
    const sql = `
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = EXCLUDED.setting_value, description = COALESCE(EXCLUDED.description, site_settings.description), updated_at = NOW()
      RETURNING *
    `;
    const result = await query(sql, [key, value, description]);
    return result.rows[0];
  }
}

module.exports = SettingsModel;
