-- =====================================================
-- MIGRATION 004: TEACHER MARKETPLACE & BOOKING ENGINE
-- =====================================================

-- ── Teachers Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio                 TEXT,
  city                VARCHAR(100) NOT NULL,
  specialization      TEXT[] DEFAULT '{}',
  years_exp           INTEGER DEFAULT 0 CHECK (years_exp >= 0),
  profile_photo_url   TEXT,
  hourly_rate         DECIMAL(10,2) DEFAULT 0 CHECK (hourly_rate >= 0),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rating_avg          DECIMAL(3,2) DEFAULT 0,
  review_count        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teachers_city ON teachers(city);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(verification_status);
CREATE INDEX IF NOT EXISTS idx_teachers_rating ON teachers(rating_avg DESC);

-- ── Teacher Qualifications ────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_qualifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  institute   VARCHAR(200) NOT NULL,
  year        INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qualifications_teacher ON teacher_qualifications(teacher_id);

-- ── Teacher Documents (for Verification) ─────────────────
CREATE TABLE IF NOT EXISTS teacher_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  doc_type      VARCHAR(50) NOT NULL, -- e.g., 'identity', 'certificate', 'degree'
  file_url      TEXT NOT NULL,
  verified_by   UUID REFERENCES admins(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_teacher ON teacher_documents(teacher_id);

-- ── Teacher Slots (Weekly Schedule) ──────────────────────
CREATE TABLE IF NOT EXISTS teacher_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_teacher_day ON teacher_slots(teacher_id, day_of_week);

-- ── Teacher Bookings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  slot_id       UUID REFERENCES teacher_slots(id) ON DELETE SET NULL,
  booking_date  DATE NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_student ON teacher_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON teacher_bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON teacher_bookings(booking_date);

-- ── Teacher Reviews ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID REFERENCES teacher_bookings(id) ON DELETE SET NULL,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON teacher_reviews(teacher_id);
