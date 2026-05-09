-- ===================== ENDORSEMENTS =====================
CREATE TABLE IF NOT EXISTS public.endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endorsed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(endorser_id, endorsed_user_id, skill)
);

ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Endorsements are viewable by authenticated"
  ON public.endorsements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can endorse others"
  ON public.endorsements FOR INSERT
  WITH CHECK (auth.uid() = endorser_id AND endorser_id != endorsed_user_id);

CREATE POLICY "Endorsers can delete own endorsements"
  ON public.endorsements FOR DELETE
  USING (auth.uid() = endorser_id);

CREATE INDEX IF NOT EXISTS idx_endorsements_user ON public.endorsements(endorsed_user_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_skill ON public.endorsements(endorsed_user_id, skill);

-- ===================== RECOMMENDATIONS =====================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 20 AND char_length(content) <= 2000),
  relationship TEXT NOT NULL DEFAULT 'colleague' CHECK (relationship IN ('mentor', 'mentee', 'colleague', 'manager', 'client', 'other')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published recommendations are viewable by authenticated"
  ON public.recommendations FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_published = true OR auth.uid() IN (author_id, recipient_id)));

CREATE POLICY "Users can write recommendations"
  ON public.recommendations FOR INSERT
  WITH CHECK (auth.uid() = author_id AND author_id != recipient_id);

CREATE POLICY "Recipient can manage recommendation visibility"
  ON public.recommendations FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Author can delete own recommendations"
  ON public.recommendations FOR DELETE
  USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_recipient ON public.recommendations(recipient_id);

-- ===================== VERIFICATION FUNCTIONS =====================
CREATE OR REPLACE FUNCTION public.admin_verify_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can verify users';
  END IF;

  UPDATE public.profiles SET is_verified = true WHERE id = p_user_id;

  PERFORM public.log_audit(auth.uid(), 'verify_user', 'profile', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_unverify_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can unverify users';
  END IF;

  UPDATE public.profiles SET is_verified = false WHERE id = p_user_id;

  PERFORM public.log_audit(auth.uid(), 'unverify_user', 'profile', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== GET ENDORSEMENTS WITH COUNTS =====================
CREATE OR REPLACE FUNCTION public.get_endorsements_with_counts(p_user_id UUID)
RETURNS TABLE (
  skill TEXT,
  count BIGINT,
  endorsers JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.skill,
    COUNT(*)::BIGINT,
    jsonb_agg(jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url))
  FROM public.endorsements e
  JOIN public.profiles p ON p.id = e.endorser_id
  WHERE e.endorsed_user_id = p_user_id
  GROUP BY e.skill
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===================== ENDORSE SKILL FUNCTION =====================
CREATE OR REPLACE FUNCTION public.endorse_skill(
  p_endorsed_user_id UUID,
  p_skill TEXT
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() = p_endorsed_user_id THEN
    RAISE EXCEPTION 'Cannot endorse yourself';
  END IF;

  INSERT INTO public.endorsements (endorser_id, endorsed_user_id, skill)
  VALUES (auth.uid(), p_endorsed_user_id, p_skill)
  ON CONFLICT (endorser_id, endorsed_user_id, skill) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
