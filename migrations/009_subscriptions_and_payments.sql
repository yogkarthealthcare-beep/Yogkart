-- Migration 009: Subscriptions and Payments System
-- Defines subscription plans, user subscriptions, and multi-currency payment transactions.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  validity_days INT NOT NULL DEFAULT 30,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast status & user queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  gateway_name VARCHAR(30) NOT NULL DEFAULT 'sandbox'
    CHECK (gateway_name IN ('razorpay', 'paypal', 'cashfree', 'payu', 'sandbox')),
  gateway_payment_id VARCHAR(150),
  gateway_order_id VARCHAR(150),
  transaction_id VARCHAR(150),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR'
    CHECK (currency IN ('INR', 'USD', 'CAD', 'AUD', 'GBP', 'EUR')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('success', 'failed', 'pending', 'cancelled', 'refunded')),
  payment_date TIMESTAMPTZ,
  gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint back to payments for user_subscriptions
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS fk_user_subscriptions_payment;
ALTER TABLE user_subscriptions
  ADD CONSTRAINT fk_user_subscriptions_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway_name);

-- Seed Initial Subscription Plans
INSERT INTO subscription_plans (code, name, description, price_inr, price_usd, validity_days, features)
VALUES 
  (
    'BASIC_LEARNER',
    'Basic Learner Plan',
    'Access fundamental yoga modules, guided meditation sessions and progress tracking.',
    1499.00,
    19.00,
    30,
    '["Access to 50+ Foundation Yoga Sessions", "Basic Progress & Streak Tracking", "Community Forum Access", "Email Support"]'::jsonb
  ),
  (
    'PRO_PRACTITIONER',
    'Pro Yoga Practitioner',
    'Full access to advanced courses, live webinars, disease-specific yoga therapy and health hub.',
    3499.00,
    45.00,
    180,
    '["All Foundation & Advanced Yoga Modules", "Personalized Health & Disease Guidance", "Live Webinar Access & Teacher Q&A", "Downloadable Session Audio & Guides", "Priority Support"]'::jsonb
  ),
  (
    'TEACHER_MASTER',
    'Certified Teacher Master Plan',
    'Verified Yoga Teacher profile, student booking management, certificate generation and directory listing.',
    7999.00,
    99.00,
    365,
    '["Verified Teacher Profile Badge", "Accept Direct Class Bookings", "Automatic QR-verified Certificate Generator", "Listed on Discover Teachers Marketplace", "Bulk Student Communication Tools", "24/7 Dedicated Support"]'::jsonb
  ),
  (
    'INSTITUTE_GOLD',
    'Institute Gold Accreditation',
    'Complete institute suite to manage multiple teachers, accreditation badges, and student certifications.',
    19999.00,
    249.00,
    365,
    '["Official Yoga Institute Accreditation Badge", "Unlimited Teacher & Student Accounts", "Institute Course Directory Listing", "Bulk Certificate Verification & QR System", "Dedicated Account Manager & Marketing Support"]'::jsonb
  )
ON CONFLICT (code) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  validity_days = EXCLUDED.validity_days,
  features = EXCLUDED.features;
