-- =====================================================
-- MIGRATION 005: LMS COURSES & QR CERTIFICATE ENGINE
-- =====================================================

-- ── Courses Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  description     TEXT,
  category        VARCHAR(100) NOT NULL DEFAULT 'General',
  level           VARCHAR(50) NOT NULL DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
  is_free         BOOLEAN NOT NULL DEFAULT FALSE,
  price           DECIMAL(10,2) DEFAULT 0 CHECK (price >= 0),
  thumbnail_url   TEXT,
  duration_hours  INTEGER DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- ── Lessons Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  video_url       TEXT NOT NULL,
  sequence_order  INTEGER NOT NULL DEFAULT 1,
  duration_sec    INTEGER DEFAULT 0,
  is_preview      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_order ON lessons(course_id, sequence_order);

-- ── Lesson Progress Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  watched_seconds INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);

-- ── Quizzes Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  pass_percentage INTEGER NOT NULL DEFAULT 60 CHECK (pass_percentage BETWEEN 1 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Quiz Questions Table ───────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id               UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text         TEXT NOT NULL,
  options               JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of string options
  correct_option_index  INTEGER NOT NULL CHECK (correct_option_index >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Quiz Attempts Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id           UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score_percentage  INTEGER NOT NULL CHECK (score_percentage BETWEEN 0 AND 100),
  passed            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);

-- ── Certificates Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_uid VARCHAR(64) UNIQUE NOT NULL, -- Non-guessable UUID
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_name       VARCHAR(150) NOT NULL,
  course_name     VARCHAR(255) NOT NULL,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_code_url     TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_uid ON certificates(certificate_uid);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
