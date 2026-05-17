CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120),
  phone VARCHAR(30),
  email VARCHAR(160) UNIQUE,
  preferred_language VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_key VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  recovery_estimate VARCHAR(120),
  severity_level VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disease_symptom_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL CHECK (weight > 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (disease_id, symptom_id)
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID REFERENCES diseases(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  avoid_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yoga_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id UUID REFERENCES diseases(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  precautions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID REFERENCES diseases(id) ON DELETE SET NULL,
  reminder_type VARCHAR(60) NOT NULL,
  scheduled_time TIME NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(40) NOT NULL DEFAULT 'in_app',
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(80) NOT NULL,
  activity_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS water_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  disease_id UUID REFERENCES diseases(id) ON DELETE SET NULL,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity_score INTEGER CHECK (severity_score BETWEEN 1 AND 10),
  notes TEXT,
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_symptoms_symptom_key ON symptoms(symptom_key);
CREATE INDEX IF NOT EXISTS idx_disease_symptom_mapping_disease ON disease_symptom_mapping(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_symptom_mapping_symptom ON disease_symptom_mapping(symptom_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user_active ON reminder_schedules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled ON notifications(status, scheduled_at);
