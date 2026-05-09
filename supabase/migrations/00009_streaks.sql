-- ===================== STREAKS =====================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Daily activity log for streaks
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON public.daily_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activities"
  ON public.daily_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Streak calculation function
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_active_date)
  VALUES (
    NEW.user_id,
    1,
    1,
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN user_streaks.last_active_date = yesterday THEN user_streaks.current_streak + 1
      WHEN user_streaks.last_active_date = CURRENT_DATE THEN user_streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      user_streaks.longest_streak,
      CASE
        WHEN user_streaks.last_active_date = yesterday THEN user_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_active_date = CURRENT_DATE,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_daily_activity
  AFTER INSERT ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streak();

-- ===================== ACHIEVEMENTS / BADGES =====================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'social', 'learning', 'events', 'mentorship')),
  criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by authenticated"
  ON public.achievements FOR SELECT
  USING (auth.role() = 'authenticated');

-- User earned achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "System can award achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Default achievements
INSERT INTO public.achievements (key, name, description, icon, category) VALUES
  ('first_post', 'First Post', 'Created your first post', '📝', 'social'),
  ('first_like', 'Getting Noticed', 'Received your first like', '❤️', 'social'),
  ('first_comment', 'Conversation Starter', 'Left your first comment', '💬', 'social'),
  ('first_event', 'Event Goer', 'Attended your first event', '🎫', 'events'),
  ('host_event', 'Event Host', 'Created your first event', '🎪', 'events'),
  ('first_session', 'Mentorship Journey', 'Completed your first mentorship session', '🎓', 'mentorship'),
  ('mentor_three', 'Mentor Star', 'Mentored 3 different mentees', '⭐', 'mentorship'),
  ('streak_7', 'Week Warrior', 'Maintained a 7-day streak', '🔥', 'general'),
  ('streak_30', 'Monthly Champion', 'Maintained a 30-day streak', '💪', 'general'),
  ('profile_complete', 'All Set', 'Completed your profile', '✅', 'general'),
  ('network_10', 'Networker', 'Connected with 10 members', '🌐', 'social'),
  ('first_circle', 'Circle In', 'Joined your first circle', '⭕', 'social');

-- Achievement check function
CREATE OR REPLACE FUNCTION public.check_and_award_achievement(
  p_user_id UUID,
  p_achievement_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_achievement_id UUID;
BEGIN
  SELECT id INTO v_achievement_id FROM public.achievements WHERE key = p_achievement_key;
  IF v_achievement_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_achievement_id)
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== CALENDAR SYNC TOKENS =====================
CREATE TABLE IF NOT EXISTS public.calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar tokens"
  ON public.calendar_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===================== FUNCTION: Log daily activity =====================
CREATE OR REPLACE FUNCTION public.log_daily_activity(p_actions JSONB DEFAULT '{}')
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.daily_activities (user_id, activity_date, actions)
  VALUES (auth.uid(), CURRENT_DATE, p_actions)
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    actions = daily_activities.actions || p_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== FUNCTION: Get user achievements with progress =====================
CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  key TEXT,
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  earned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.key, a.name, a.description, a.icon, a.category, ua.earned_at
  FROM public.achievements a
  LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
  ORDER BY ua.earned_at NULLS LAST, a.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
