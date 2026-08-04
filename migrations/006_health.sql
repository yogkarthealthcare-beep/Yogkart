-- =====================================================
-- MIGRATION 006: HEALTH & WELLNESS ENGINE
-- =====================================================

-- ── Health Remedies Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS health_remedies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               VARCHAR(200) NOT NULL,
  slug                VARCHAR(200) UNIQUE NOT NULL,
  category            VARCHAR(100) NOT NULL DEFAULT 'General',
  symptoms            TEXT[] DEFAULT '{}',
  ayurvedic_remedy    TEXT NOT NULL,
  herbs               TEXT[] DEFAULT '{}',
  yoga_poses          TEXT[] DEFAULT '{}',
  precautions         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remedies_slug ON health_remedies(slug);
CREATE INDEX IF NOT EXISTS idx_remedies_category ON health_remedies(category);

-- ── Dosha Assessments Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS dosha_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vata_score      INTEGER NOT NULL DEFAULT 0,
  pitta_score     INTEGER NOT NULL DEFAULT 0,
  kapha_score     INTEGER NOT NULL DEFAULT 0,
  primary_dosha   VARCHAR(20) NOT NULL CHECK (primary_dosha IN ('Vata', 'Pitta', 'Kapha', 'Tridoshic')),
  recommendations JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dosha_user ON dosha_assessments(user_id);

-- ── Daily Wellness Logs Table ───────────────────────────
CREATE TABLE IF NOT EXISTS wellness_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  water_intake_ml INTEGER DEFAULT 0 CHECK (water_intake_ml >= 0),
  step_count      INTEGER DEFAULT 0 CHECK (step_count >= 0),
  sleep_hours     DECIMAL(3,1) DEFAULT 0 CHECK (sleep_hours >= 0),
  mood_rating     INTEGER CHECK (mood_rating BETWEEN 1 AND 5), -- 1=Bad, 5=Great
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_wellness_user_date ON wellness_logs(user_id, log_date DESC);

-- ── Seed Initial Remedies Data ───────────────────────────
INSERT INTO health_remedies (title, slug, category, symptoms, ayurvedic_remedy, herbs, yoga_poses, precautions)
VALUES
(
  'Natural Relief for Indigestion & Bloating',
  'indigestion-bloating-remedy',
  'Digestive Health',
  ARRAY['indigestion', 'bloating', 'gas', 'acidity', 'stomach pain'],
  'Sip warm cumin-coriander-fennel (CCF) tea 30 minutes after meals. Avoid cold iced water during eating to preserve Agni (digestive fire).',
  ARRAY['Triphala', 'Cumin', 'Fennel', 'Ajwain', 'Ginger'],
  ARRAY['Pavanmuktasana (Wind Relieving Pose)', 'Vajrasana (Thunderbolt Pose)', 'Paschimottanasana'],
  'Avoid spicy, oily, and heavy fried foods at dinner.'
),
(
  'Ayurvedic Management of Stress & Insomnia',
  'stress-insomnia-remedy',
  'Mental Wellness',
  ARRAY['stress', 'insomnia', 'anxiety', 'sleeplessness', 'restlessness'],
  'Practice warm sesame oil foot massage (Pada Abhyanga) before bedtime. Drink warm nutmeg milk 30 minutes prior to sleep.',
  ARRAY['Ashwagandha', 'Brahmi', 'Jatamansi', 'Nutmeg', 'Chamomile'],
  ARRAY['Shavasana (Corpse Pose)', 'Viparita Karani (Legs up Wall)', 'Anulom Vilom Pranayama'],
  'Limit screen time 1 hour before sleep. Avoid caffeine past 4 PM.'
),
(
  'Natural Solution for Migraine & Tension Headaches',
  'migraine-headache-remedy',
  'Neurological',
  ARRAY['migraine', 'headache', 'head pain', 'stress headache'],
  'Apply cool sandal paste or brahmi oil on temples. Perform 4-5 drops of Anu Taila Nasya (nasal oil drops) in each nostril every morning.',
  ARRAY['Brahmi', 'Shankhpushpi', 'Rose Water', 'Chandan'],
  ARRAY['Balasana (Child Pose)', 'Bhramari Pranayama', 'Adho Mukha Svanasana'],
  'Avoid direct sun exposure during peak afternoon hours and stay hydrated.'
),
(
  'Joint Pain & Stiffness Relief',
  'joint-pain-stiffness-remedy',
  'Musculoskeletal',
  ARRAY['joint pain', 'stiffness', 'arthritis', 'knee pain', 'backache'],
  'Perform warm Mahanarayana Oil massage on affected joints followed by warm water fomentation. Take Guggulu preparations after food.',
  ARRAY['Shallaki (Boswellia)', 'Guggulu', 'Dry Ginger', 'Turmeric'],
  ARRAY['Bhujangasana (Cobra Pose)', 'Tadasana (Mountain Pose)', 'Marjaryasana-Bitilasana (Cat-Cow)'],
  'Avoid cold drafts, air conditioning directly on joints, and sour fermented foods.'
)
ON CONFLICT (slug) DO NOTHING;
