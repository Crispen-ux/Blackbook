-- ===================== NOTIFICATION TRIGGERS =====================

-- 1. Like notification
CREATE OR REPLACE FUNCTION public.handle_post_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    p.author_id,
    'like',
    'New like',
    (SELECT full_name FROM public.profiles WHERE id = NEW.user_id) || ' liked your post',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id)
  WHERE p.author_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_like_notification();

-- 2. Comment notification
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    p.author_id,
    'comment',
    'New comment',
    (SELECT full_name FROM public.profiles WHERE id = NEW.author_id) || ' commented on your post',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'commenter_id', NEW.author_id)
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.author_id != NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();

-- 3. New message notification
CREATE OR REPLACE FUNCTION public.handle_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    cm.user_id,
    'message',
    'New message',
    (SELECT full_name FROM public.profiles WHERE id = NEW.sender_id) || ' sent you a message',
    jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id)
  FROM public.chat_members cm
  WHERE cm.chat_id = NEW.chat_id AND cm.user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_notification();

-- 4. Mentorship session notification (to mentor)
CREATE OR REPLACE FUNCTION public.handle_session_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.mentor_id,
    'mentorship',
    'New mentorship request',
    (SELECT full_name FROM public.profiles WHERE id = NEW.mentee_id) || ' has requested a mentorship session',
    jsonb_build_object('session_id', NEW.id, 'mentee_id', NEW.mentee_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_session_request
  AFTER INSERT ON public.mentorship_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_request_notification();

-- 5. Session status change notification (to mentee)
CREATE OR REPLACE FUNCTION public.handle_session_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.mentee_id,
      'mentorship',
      'Session ' || NEW.status,
      'Your mentorship session has been ' || NEW.status,
      jsonb_build_object('session_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_session_status_change
  AFTER UPDATE ON public.mentorship_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_status_notification();

-- 6. Event registration notification (to organizer)
CREATE OR REPLACE FUNCTION public.handle_event_registration_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    e.created_by,
    'event',
    'New event registration',
    (SELECT full_name FROM public.profiles WHERE id = NEW.user_id) || ' registered for ' || e.title,
    jsonb_build_object('event_id', NEW.event_id, 'registrant_id', NEW.user_id)
  FROM public.events e
  WHERE e.id = NEW.event_id AND e.created_by != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_event_registration
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_event_registration_notification();

-- 7. Payment notification
CREATE OR REPLACE FUNCTION public.handle_payment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'payment',
    'Payment ' || NEW.status,
    CASE
      WHEN NEW.status = 'completed' THEN 'Your payment of ' || NEW.amount || ' ' || NEW.currency || ' was successful'
      ELSE 'Your payment of ' || NEW.amount || ' ' || NEW.currency || ' is ' || NEW.status
    END,
    jsonb_build_object('payment_id', NEW.id, 'type', NEW.type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_notification();

-- ===================== FUNCTION: Mark notifications as read =====================
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== PUSH TOKENS TABLE =====================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===================== FUNCTION: Get unread count =====================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM public.notifications
  WHERE user_id = auth.uid() AND is_read = false;
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
