-- ===================== ROLE-BASED ACCESS CONTROL =====================

-- Add 'moderator' to role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'moderator', 'member', 'mentor'));

-- ===================== AUDIT LOG =====================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')));

-- Auto-log function
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== ADMIN FUNCTIONS =====================

-- Promote/demote user role (admin only)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  IF p_new_role NOT IN ('admin', 'moderator', 'member', 'mentor') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET role = p_new_role WHERE id = p_target_user_id;

  PERFORM public.log_audit(
    auth.uid(),
    'change_role',
    'profile',
    p_target_user_id,
    jsonb_build_object('new_role', p_new_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Moderate content: delete post
CREATE OR REPLACE FUNCTION public.moderator_delete_post(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')) THEN
    RAISE EXCEPTION 'Only admins and moderators can delete posts';
  END IF;

  DELETE FROM public.posts WHERE id = p_post_id;

  PERFORM public.log_audit(
    auth.uid(),
    'delete_post',
    'post',
    p_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Moderate content: delete comment
CREATE OR REPLACE FUNCTION public.moderator_delete_comment(p_comment_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')) THEN
    RAISE EXCEPTION 'Only admins and moderators can delete comments';
  END IF;

  DELETE FROM public.comments WHERE id = p_comment_id;

  PERFORM public.log_audit(
    auth.uid(),
    'delete_comment',
    'comment',
    p_comment_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user stats (admin)
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_today BIGINT,
  mentors_count BIGINT,
  events_count BIGINT,
  posts_count BIGINT,
  messages_count BIGINT
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can view stats';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.profiles WHERE last_active > now() - interval '24 hours')::BIGINT,
    (SELECT COUNT(*) FROM public.mentor_profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.events)::BIGINT,
    (SELECT COUNT(*) FROM public.posts)::BIGINT,
    (SELECT COUNT(*) FROM public.messages)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- List users with role filter (admin)
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_role TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS SETOF public.profiles AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.profiles
  WHERE (p_role IS NULL OR role = p_role)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== GDPR: Delete user data =====================
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  PERFORM public.log_audit(auth.uid(), 'delete_user', 'profile', p_user_id);

  -- Delete in correct order to respect FKs
  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.event_registrations WHERE user_id = p_user_id;
  DELETE FROM public.mentorship_sessions WHERE mentor_id = p_user_id OR mentee_id = p_user_id;
  DELETE FROM public.mentor_profiles WHERE user_id = p_user_id;
  DELETE FROM public.post_likes WHERE user_id = p_user_id;
  DELETE FROM public.comments WHERE author_id = p_user_id;
  DELETE FROM public.posts WHERE author_id = p_user_id;
  DELETE FROM public.payments WHERE user_id = p_user_id;
  DELETE FROM public.chat_members WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
