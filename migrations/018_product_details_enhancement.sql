-- =====================================================
-- Migration 018: Product Details Enhancement
-- Additive & Backward-Compatible
-- =====================================================

-- Add repeatable structured columns to products table if not already present
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS how_to_use JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ingredients_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS precautions TEXT;

-- Ensure site_settings table exists and seed default product_page_settings
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default product page settings if not present
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
  'Global configuration for all product detail pages (trust badges, delivery, global FAQs)'
)
ON CONFLICT (setting_key) DO NOTHING;
