const { query } = require('../config/database');

const CORE_SCHEMA_PATCHES = `
-- 1. Ensure Products table columns exist
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_benefits TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prescription BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS product_highlights TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_alt_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_suggestions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_generated_by VARCHAR(20) DEFAULT 'template',
  ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS how_to_use JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ingredients_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS precautions TEXT,
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 2. Ensure Site Settings table
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings seed
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES (
  'announcement_bar',
  '{"is_active": true, "text": "Add ₹{{remaining}} more for", "highlight_text": "FREE Shipping", "threshold": 499}'::jsonb,
  'Configuration for top announcement bar'
) ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO site_settings (setting_key, setting_value, description)
VALUES (
  'product_page_settings',
  '{
    "trust_badges": [
      { "icon": "verified", "title": "Authentic Product", "subtitle": "100% Genuine & Pure" },
      { "icon": "local_shipping", "title": "Free Delivery", "subtitle": "On orders ₹499+" },
      { "icon": "published_with_changes", "title": "7-Day Return", "subtitle": "Easy replacement" },
      { "icon": "lock", "title": "Secure Payments", "subtitle": "100% Protected" }
    ],
    "shipping_message": "Free Shipping on orders above ₹499",
    "return_policy_message": "7-Day hassle-free return or replacement for damaged items",
    "secure_payment_message": "Safe & Encrypted Transactions with UPI, Cards, NetBanking & COD",
    "free_shipping_threshold": 499,
    "delivery_estimate_days": 4,
    "global_faqs": [
      {
        "question": "How can I place an order on YogKart?",
        "answer": "Browse your favorite natural products, click ''Add to Cart'' or ''Buy Now'', enter your delivery address at checkout, and complete payment via UPI, Debit/Credit Card, Net Banking, or Cash on Delivery (COD)."
      },
      {
        "question": "What payment methods are accepted?",
        "answer": "We support all major payment options including UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and Cash on Delivery (COD)."
      },
      {
        "question": "How do I track my order?",
        "answer": "Once your order is shipped, you will receive real-time tracking updates via SMS and WhatsApp. You can also track your shipment anytime from your YogKart account under Profile > Orders."
      },
      {
        "question": "What is the return and replacement policy?",
        "answer": "We offer a 7-day hassle-free replacement or refund policy if the product arrives damaged, defective, or incorrect. Simply reach out through our Contact page or WhatsApp support."
      }
    ]
  }'::jsonb,
  'Global configuration for product detail pages'
) ON CONFLICT (setting_key) DO NOTHING;
`;

let schemaChecked = false;

const ensureDatabaseSchema = async () => {
  if (schemaChecked) return;
  try {
    await query(CORE_SCHEMA_PATCHES);
    schemaChecked = true;
    console.log('✅ Core database schema & product columns verified');
  } catch (err) {
    console.error('⚠️ Database schema verification error:', err.message);
  }
};

module.exports = { ensureDatabaseSchema };
