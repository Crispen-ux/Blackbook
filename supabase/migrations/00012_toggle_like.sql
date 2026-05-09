-- RPC function to toggle post likes (bypasses PostgREST embed bug)
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS boolean AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = auth.uid()
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = auth.uid();
    RETURN false;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, auth.uid());
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
