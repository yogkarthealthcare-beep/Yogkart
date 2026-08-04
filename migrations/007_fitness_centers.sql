-- =====================================================
-- MIGRATION 007: FITNESS CENTERS DIRECTORY & LEADS
-- =====================================================

-- ── Fitness Centers Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS fitness_centers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  owner_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  center_type     VARCHAR(50) NOT NULL DEFAULT 'Yoga Studio', -- Gym, Yoga Studio, Wellness Club, Crossfit
  city            VARCHAR(100) NOT NULL,
  address         TEXT NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(150),
  rating_avg      DECIMAL(3,2) DEFAULT 4.8,
  monthly_price   DECIMAL(10,2) DEFAULT 0 CHECK (monthly_price >= 0),
  cover_image_url TEXT,
  description     TEXT,
  facilities      TEXT[] DEFAULT '{}', -- e.g. AC, Shower, Lockers, Personal Training, Steam
  is_verified     BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_centers_slug ON fitness_centers(slug);
CREATE INDEX IF NOT EXISTS idx_fitness_centers_city ON fitness_centers(city);
CREATE INDEX IF NOT EXISTS idx_fitness_centers_type ON fitness_centers(center_type);

-- ── Center Inquiries Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS center_inquiries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id   UUID NOT NULL REFERENCES fitness_centers(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(100) NOT NULL,
  user_phone  VARCHAR(20) NOT NULL,
  user_email  VARCHAR(150),
  message     TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_center ON center_inquiries(center_id);

-- ── Seed Initial Verified Centers Data ────────────────────
INSERT INTO fitness_centers (name, slug, center_type, city, address, phone, rating_avg, monthly_price, cover_image_url, description, facilities)
VALUES
(
  'Urban Flow Fitness & Yoga Studio',
  'urban-flow-fitness-noida',
  'Yoga Studio',
  'Noida',
  'Plot 12, Sector 62, Noida, Uttar Pradesh 201309',
  '+91 9876543210',
  4.8,
  2499.00,
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80',
  'State-of-the-art yoga and functional fitness center offering daily Hatha, Vinyasa and Power Yoga sessions led by certified master trainers.',
  ARRAY['AC', 'Shower', 'Lockers', 'Personal Training', 'Free Parking']
),
(
  'Prana Wellness & Holistic Yoga Club',
  'prana-wellness-delhi',
  'Wellness Club',
  'Delhi',
  'B-45, South Extension Part 2, New Delhi 110049',
  '+91 9811223344',
  4.9,
  3499.00,
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=700&q=80',
  'Premium holistic wellness studio dedicated to authentic yoga, pranayama, meditation, and Ayurvedic body therapies.',
  ARRAY['AC', 'Shower', 'Steam Room', 'Ayurvedic Consultation', 'Mat Provided']
),
(
  'Balance Gym & Yoga Hub',
  'balance-gym-gurugram',
  'Gym',
  'Gurugram',
  'DLF Phase 4, Near Galleria Market, Gurugram, Haryana 122009',
  '+91 9988776655',
  4.7,
  2999.00,
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80',
  'Combined high-performance fitness gym and peaceful yoga studio for holistic strength, endurance and flexibility.',
  ARRAY['AC', 'Shower', 'Lockers', 'Gym Equipment', 'Sauna']
)
ON CONFLICT (slug) DO NOTHING;
