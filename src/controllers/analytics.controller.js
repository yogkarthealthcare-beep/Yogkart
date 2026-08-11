const { query } = require('../config/database');
const { success, error } = require('../utils/response');

// Ensure tables exist asynchronously
const ensureAnalyticsTables = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_name      VARCHAR(50) NOT NULL,
        session_id      VARCHAR(100),
        user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
        page_url        TEXT,
        product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
        search_keyword  VARCHAR(255),
        device_type     VARCHAR(20) DEFAULT 'desktop',
        browser         VARCHAR(50),
        os              VARCHAR(50),
        referrer        TEXT,
        ip_address      VARCHAR(50),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

      CREATE TABLE IF NOT EXISTS analytics_settings (
        id                  SERIAL PRIMARY KEY,
        ga4_measurement_id  VARCHAR(100) DEFAULT '',
        gsc_property_url    VARCHAR(255) DEFAULT '',
        enable_telemetry    BOOLEAN DEFAULT TRUE,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO analytics_settings (id, ga4_measurement_id, gsc_property_url, enable_telemetry)
      VALUES (1, '', '', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    // Non-blocking catch
  }
};

ensureAnalyticsTables();

// POST /api/analytics/event
const logEvent = async (req, res) => {
  try {
    const {
      event_name,
      session_id,
      page_url,
      product_id,
      search_keyword,
      device_type,
      browser,
      os,
      referrer,
    } = req.body;

    if (!event_name) {
      return error(res, 'event_name is required', 400);
    }

    const userId = req.user ? req.user.id : null;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    await query(
      `INSERT INTO analytics_events
        (event_name, session_id, user_id, page_url, product_id, search_keyword, device_type, browser, os, referrer, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event_name,
        session_id || null,
        userId,
        page_url || null,
        product_id ? parseInt(product_id) : null,
        search_keyword || null,
        device_type || 'desktop',
        browser || null,
        os || null,
        referrer || null,
        ip,
      ]
    );

    return success(res, { logged: true });
  } catch (err) {
    // Silent recovery for logging
    return success(res, { logged: false });
  }
};

module.exports = { logEvent };
