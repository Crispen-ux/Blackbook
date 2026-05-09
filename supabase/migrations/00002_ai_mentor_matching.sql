ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS industry TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_mentee_profile TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mentee_goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_hours JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completed_sessions INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_industry ON public.mentor_profiles USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_expertise ON public.mentor_profiles USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON public.profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON public.profiles(industry);

-- AI match score function (computes similarity between mentee and mentor)
CREATE OR REPLACE FUNCTION public.calculate_mentor_match_score(
  mentee_id UUID,
  mentor_id UUID
) RETURNS FLOAT AS $$
DECLARE
  mentee_profile RECORD;
  mentor_profile RECORD;
  score FLOAT := 0;
  max_score FLOAT := 100;
  industry_match BOOLEAN;
  skill_overlap INT;
  common_goals INT;
BEGIN
  SELECT * INTO mentee_profile FROM public.profiles WHERE id = mentee_id;
  SELECT * INTO mentor_profile FROM public.mentor_profiles WHERE user_id = mentor_id;

  IF mentor_profile IS NULL THEN
    RETURN 0;
  END IF;

  -- Industry match (+25 points)
  IF mentee_profile.industry IS NOT NULL AND mentor_profile.industry IS NOT NULL THEN
    SELECT COUNT(*) > 0 INTO industry_match
    FROM unnest(mentor_profile.industry) AS mi
    WHERE LOWER(mi) = LOWER(mentee_profile.industry);
    IF industry_match THEN score := score + 25; END IF;
  END IF;

  -- Skill overlap (+30 points)
  IF mentee_profile.skills IS NOT NULL AND mentor_profile.expertise IS NOT NULL THEN
    SELECT COUNT(*) INTO skill_overlap
    FROM unnest(mentee_profile.skills) AS ms
    WHERE LOWER(ms) IN (SELECT LOWER(e) FROM unnest(mentor_profile.expertise) AS e);
    score := score + LEAST(skill_overlap * 10, 30);
  END IF;

  -- Experience seniority (+15 points for mentor being more senior)
  IF mentee_profile.years_experience IS NOT NULL AND mentor_profile.years_experience IS NOT NULL THEN
    IF mentor_profile.years_experience > mentee_profile.years_experience THEN
      score := score + LEAST((mentor_profile.years_experience - mentee_profile.years_experience) * 3, 15);
    END IF;
  END IF;

  -- Career goal alignment (+20 points)
  IF mentee_profile.career_goals IS NOT NULL AND mentor_profile.mentee_goals IS NOT NULL THEN
    SELECT COUNT(*) INTO common_goals
    FROM unnest(mentee_profile.career_goals) AS g
    WHERE LOWER(g) IN (SELECT LOWER(mg) FROM unnest(mentor_profile.mentee_goals) AS mg);
    score := score + LEAST(common_goals * 10, 20);
  END IF;

  -- Session history bonus (+10 points for mentors with good track record)
  IF mentor_profile.completed_sessions > 0 THEN
    score := score + LEAST(mentor_profile.completed_sessions * 2, 10);
  END IF;

  RETURN LEAST(score, max_score) / max_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top mentor matches for a user
CREATE OR REPLACE FUNCTION public.get_mentor_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  "position" TEXT,
  company TEXT,
  avatar_url TEXT,
  bio TEXT,
  expertise TEXT[],
  industry TEXT[],
  hourly_rate DECIMAL,
  currency TEXT,
  rating DECIMAL,
  session_count INTEGER,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.user_id,
    p.full_name,
    p.position,
    p.company,
    p.avatar_url,
    mp.bio,
    mp.expertise,
    mp.industry,
    mp.hourly_rate,
    mp.currency,
    mp.rating,
    mp.completed_sessions,
    public.calculate_mentor_match_score(p_user_id, mp.user_id) AS match_score
  FROM public.mentor_profiles mp
  JOIN public.profiles p ON p.id = mp.user_id
  WHERE mp.is_available = true
    AND mp.user_id != p_user_id
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
