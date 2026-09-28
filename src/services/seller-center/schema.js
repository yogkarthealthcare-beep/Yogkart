const { query } = require('../../config/database');

const SELLER_CENTER_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Seller Marketplaces Provider Registry ─────────
CREATE TABLE IF NOT EXISTS seller_marketplaces (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo TEXT,
  website_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'COMING_SOON',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default marketplace providers
INSERT INTO seller_marketplaces (code, name, status, website_url, display_order, is_active)
VALUES
  ('AMAZON', 'Amazon', 'NOT_CONNECTED', 'https://sellercentral.amazon.in', 1, TRUE),
  ('FLIPKART', 'Flipkart', 'COMING_SOON', 'https://seller.flipkart.com', 2, TRUE),
  ('MEESHO', 'Meesho', 'COMING_SOON', 'https://supplier.meesho.com', 3, TRUE),
  ('WALMART', 'Walmart', 'COMING_SOON', 'https://seller.walmart.com', 4, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Amazon SP-API Credentials & Configuration ─────
CREATE TABLE IF NOT EXISTS amazon_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name VARCHAR(100) NOT NULL DEFAULT 'Amazon India Seller Store',
  client_id_encrypted TEXT,
  client_secret_encrypted TEXT,
  refresh_token_encrypted TEXT,
  marketplace_id VARCHAR(50) NOT NULL DEFAULT 'A21TJRUUN4KGV',
  region VARCHAR(30) NOT NULL DEFAULT 'eu-west-1',
  endpoint TEXT NOT NULL DEFAULT 'https://sellingpartnerapi-eu.amazon.com',
  seller_id VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  connection_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONNECTED',
  last_tested_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error_message TEXT,
  additional_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial row for Amazon integration if none exists
INSERT INTO amazon_integrations (account_name, marketplace_id, region, endpoint, connection_status)
SELECT 'Amazon India Seller Store', 'A21TJRUUN4KGV', 'eu-west-1', 'https://sellingpartnerapi-eu.amazon.com', 'NOT_CONNECTED'
WHERE NOT EXISTS (SELECT 1 FROM amazon_integrations LIMIT 1);

-- ── 3. Amazon Orders Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amazon_order_id VARCHAR(100) UNIQUE NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  last_update_date TIMESTAMPTZ,
  order_status VARCHAR(50) NOT NULL DEFAULT 'Unshipped',
  fulfillment_channel VARCHAR(50) DEFAULT 'MFN',
  sales_channel VARCHAR(50) DEFAULT 'Amazon.in',
  order_channel VARCHAR(50),
  ship_service_level VARCHAR(50),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  number_of_items_shipped INTEGER DEFAULT 0,
  number_of_items_unshipped INTEGER DEFAULT 0,
  payment_method VARCHAR(50),
  payment_method_details TEXT[] DEFAULT '{}',
  marketplace_id VARCHAR(50) DEFAULT 'A21TJRUUN4KGV',
  is_replacement_order BOOLEAN DEFAULT FALSE,
  is_premium_order BOOLEAN DEFAULT FALSE,
  is_prime BOOLEAN DEFAULT FALSE,
  buyer_email VARCHAR(255),
  buyer_name VARCHAR(100),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(10) DEFAULT 'IN',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amazon_orders_order_id ON amazon_orders(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_purchase_date ON amazon_orders(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_status ON amazon_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_fulfillment ON amazon_orders(fulfillment_channel);

-- ── 4. Amazon Order Items Table ────────────────────────
CREATE TABLE IF NOT EXISTS amazon_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amazon_order_id VARCHAR(100) NOT NULL REFERENCES amazon_orders(amazon_order_id) ON DELETE CASCADE,
  order_item_id VARCHAR(100),
  asin VARCHAR(50) NOT NULL,
  seller_sku VARCHAR(100),
  title TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_shipped INTEGER NOT NULL DEFAULT 0,
  item_price_amount DECIMAL(12,2) DEFAULT 0.00,
  item_price_currency VARCHAR(10) DEFAULT 'INR',
  item_tax_amount DECIMAL(12,2) DEFAULT 0.00,
  shipping_price_amount DECIMAL(12,2) DEFAULT 0.00,
  shipping_tax_amount DECIMAL(12,2) DEFAULT 0.00,
  shipping_discount_amount DECIMAL(12,2) DEFAULT 0.00,
  item_discount_amount DECIMAL(12,2) DEFAULT 0.00,
  promotion_discount_amount DECIMAL(12,2) DEFAULT 0.00,
  condition_id VARCHAR(50) DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_amazon_order_item UNIQUE (amazon_order_id, asin, seller_sku)
);

CREATE INDEX IF NOT EXISTS idx_amazon_items_order_id ON amazon_order_items(amazon_order_id);
CREATE INDEX IF NOT EXISTS idx_amazon_items_asin ON amazon_order_items(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_items_sku ON amazon_order_items(seller_sku);

-- ── 5. Amazon Products / Listings Table ────────────────
CREATE TABLE IF NOT EXISTS amazon_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asin VARCHAR(50) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  marketplace_id VARCHAR(50) DEFAULT 'A21TJRUUN4KGV',
  listing_status VARCHAR(30) DEFAULT 'ACTIVE',
  price_amount DECIMAL(12,2) DEFAULT 0.00,
  price_currency VARCHAR(10) DEFAULT 'INR',
  fulfillment_channel VARCHAR(50) DEFAULT 'DEFAULT',
  inventory_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amazon_products_sku ON amazon_products(sku);
CREATE INDEX IF NOT EXISTS idx_amazon_products_asin ON amazon_products(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_products_status ON amazon_products(listing_status);

-- ── 6. Seller Center Sync Logs Table ───────────────────
CREATE TABLE IF NOT EXISTS seller_center_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketplace VARCHAR(50) NOT NULL DEFAULT 'AMAZON',
  sync_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL_FETCH_LIVE_RECORD',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  products_fetched INTEGER DEFAULT 0,
  products_inserted INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  error_message TEXT,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_sync_logs_mkt ON seller_center_sync_logs(marketplace, started_at DESC);
`;

const ensureSellerCenterSchema = async () => {
  try {
    await query(SELLER_CENTER_SCHEMA_SQL);
    console.log('✅ Seller Center & Amazon SP-API schema ensured.');
  } catch (err) {
    console.error('❌ Error ensuring Seller Center schema:', err.message);
  }
};

module.exports = {
  ensureSellerCenterSchema,
  SELLER_CENTER_SCHEMA_SQL,
};
