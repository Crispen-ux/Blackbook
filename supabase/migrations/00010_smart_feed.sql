-- ===================== SMART FEED CURATION =====================

-- Post engagement stats (updated by triggers)
CREATE TABLE IF NOT EXISTS public.post_engagement (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  last_engagement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view engagement"
  ON public.post_engagement FOR SELECT
  USING (auth.role() = 'authenticated');

-- User interest signals (what topics they engage with)
CREATE TABLE IF NOT EXISTS public.user_interest_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  weight FLOAT NOT NULL DEFAULT 1.0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

ALTER TABLE public.user_interest_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own signals"
  ON public.user_interest_signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update engagement counts via triggers
CREATE OR REPLACE FUNCTION public.update_post_engagement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'post_likes' THEN
    INSERT INTO public.post_engagement (post_id, like_count, last_engagement_at, updated_at)
    VALUES (NEW.post_id, 1, now(), now())
    ON CONFLICT (post_id) DO UPDATE SET
      like_count = post_engagement.like_count + 1,
      last_engagement_at = now(),
      updated_at = now();
  ELSIF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'post_likes' THEN
    UPDATE public.post_engagement SET
      like_count = GREATEST(like_count - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.post_id;
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'comments' THEN
    INSERT INTO public.post_engagement (post_id, comment_count, last_engagement_at, updated_at)
    VALUES (NEW.post_id, 1, now(), now())
    ON CONFLICT (post_id) DO UPDATE SET
      comment_count = post_engagement.comment_count + 1,
      last_engagement_at = now(),
      updated_at = now();
  ELSIF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'comments' THEN
    UPDATE public.post_engagement SET
      comment_count = GREATEST(comment_count - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_like_engagement
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_engagement();

CREATE OR REPLACE TRIGGER on_comment_engagement
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_engagement();

-- ===================== RANKED FEED FUNCTION =====================
CREATE OR REPLACE FUNCTION public.get_ranked_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  author_full_name TEXT,
  author_avatar_url TEXT,
  author_position TEXT,
  author_company TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  is_liked BOOLEAN,
  relevance_score FLOAT
) AS $$
DECLARE
  user_industry TEXT;
  user_skills TEXT[];
  user_interests TEXT[];
BEGIN
  -- Get user profile for matching
  SELECT p.industry, p.skills, p.interests
  INTO user_industry, user_skills, user_interests
  FROM public.profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  WITH scored_posts AS (
    SELECT
      po.id,
      po.author_id,
      po.content,
      po.image_url,
      po.created_at,
      prof.full_name AS author_full_name,
      prof.avatar_url AS author_avatar_url,
      prof.position AS author_position,
      prof.company AS author_company,
      COALESCE(pe.like_count, 0)::BIGINT AS like_count,
      COALESCE(pe.comment_count, 0)::BIGINT AS comment_count,
      EXISTS (SELECT 1 FROM public.post_likes pl WHERE pl.post_id = po.id AND pl.user_id = p_user_id) AS is_liked,
      -- Relevance score algorithm
      (
        -- Recency factor (higher for newer posts)
        LEAST(EXTRACT(EPOCH FROM (now() - po.created_at)) / 86400.0, 7.0) * -0.3 +
        -- Engagement factor
        LEAST(COALESCE(pe.like_count, 0) * 0.5 + COALESCE(pe.comment_count, 0) * 0.8, 10.0) +
        -- Author connection factor (higher if in same industry or connections)
        CASE WHEN prof.industry = user_industry THEN 3.0 ELSE 0.0 END +
        -- Skill relevance (match post content with user skills/interests)
        CASE
          WHEN user_skills IS NOT NULL AND array_length(user_skills, 1) > 0 THEN
            (
              SELECT COUNT(*) * 1.5
              FROM unnest(user_skills) AS s
              WHERE LOWER(po.content) LIKE '%' || LOWER(s) || '%'
            )
          ELSE 0.0
        END
      )::FLOAT AS relevance_score
    FROM public.posts po
    JOIN public.profiles prof ON prof.id = po.author_id
    LEFT JOIN public.post_engagement pe ON pe.post_id = po.id
    WHERE po.author_id != p_user_id  -- exclude own posts for variety
  )
  SELECT * FROM scored_posts
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
