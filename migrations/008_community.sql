-- =====================================================
-- MIGRATION 008: COMMUNITY BUILDING ENGINE
-- =====================================================

-- ── Community Posts Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  image_url       TEXT,
  category        VARCHAR(50) NOT NULL DEFAULT 'General', -- Yoga, Meditation, Nutrition, General
  likes_count     INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  comments_count  INTEGER DEFAULT 0 CHECK (comments_count >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);

-- ── Community Post Likes Table ───────────────────────────
CREATE TABLE IF NOT EXISTS community_post_likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON community_post_likes(post_id);

-- ── Community Comments Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS community_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id);

-- ── Wellness Challenges Table ────────────────────────────
CREATE TABLE IF NOT EXISTS wellness_challenges (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title              VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) UNIQUE NOT NULL,
  description        TEXT NOT NULL,
  duration_days      INTEGER NOT NULL DEFAULT 21,
  banner_url         TEXT,
  participants_count INTEGER DEFAULT 0 CHECK (participants_count >= 0),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_slug ON wellness_challenges(slug);

-- ── Seed Initial Wellness Challenge ──────────────────────
INSERT INTO wellness_challenges (title, slug, description, duration_days, banner_url, participants_count)
VALUES
(
  '21-Day Morning Yoga & Mindfulness Challenge',
  '21-day-morning-yoga-challenge',
  'Transform your morning routine with 21 days of 15-minute daily yoga practice, pranayama breathwork, and mindfulness reflections.',
  21,
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  1250
)
ON CONFLICT (slug) DO NOTHING;
