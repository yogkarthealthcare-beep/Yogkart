-- =====================================================
-- Migration 015: Analytics Event Tracking & Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name      VARCHAR(50) NOT NULL, -- page_view, product_view, add_to_cart, checkout_start, search, wishlist_add
  session_id      VARCHAR(100),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  page_url        TEXT,
  product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
  search_keyword  VARCHAR(255),
  device_type     VARCHAR(20) DEFAULT 'desktop', -- mobile, desktop, tablet
  browser         VARCHAR(50),
  os              VARCHAR(50),
  referrer        TEXT,
  ip_address      VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_search ON analytics_events(search_keyword);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

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
