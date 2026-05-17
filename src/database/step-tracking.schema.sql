CREATE TABLE IF NOT EXISTS step_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL,
  total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  calories NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (calories >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tracking_date)
);

CREATE TABLE IF NOT EXISTS daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL,
  total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  calories NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (calories >= 0),
  goal_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, progress_date)
);

CREATE TABLE IF NOT EXISTS weekly_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  total_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_distance_km >= 0),
  total_calories NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_calories >= 0),
  average_steps INTEGER NOT NULL DEFAULT 0 CHECK (average_steps >= 0),
  active_days INTEGER NOT NULL DEFAULT 0 CHECK (active_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(40) NOT NULL CHECK (goal_type IN ('daily_steps', 'weekly_steps', 'weight_loss')),
  target_value NUMERIC(12, 2) NOT NULL CHECK (target_value > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'steps',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fitness_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(60) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_tracking_user_date ON step_tracking(user_id, tracking_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON daily_progress(user_id, progress_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_analytics_user_week ON weekly_analytics(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_active ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fitness_notifications_user_status ON fitness_notifications(user_id, status);
