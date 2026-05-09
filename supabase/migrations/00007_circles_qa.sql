-- ===================== EXCLUSIVE CIRCLES =====================
CREATE TABLE IF NOT EXISTS public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'application')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_members INT DEFAULT 100,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Circle members (created before RLS policies on circles that reference it)
CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'declined')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view circles"
  ON public.circles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create circles"
  ON public.circles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update circle"
  ON public.circles FOR UPDATE
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM public.circle_members WHERE circle_id = id AND user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Members can view circle members"
  ON public.circle_members FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      status = 'active' OR auth.uid() = user_id
    )
  );

CREATE POLICY "Users can join public circles"
  ON public.circle_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave"
  ON public.circle_members FOR DELETE
  USING (auth.uid() = user_id);

-- Circle posts (posts within a circle)
CREATE TABLE IF NOT EXISTS public.circle_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.circle_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Circle posts visible to members"
  ON public.circle_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_id AND cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

CREATE POLICY "Members can create circle posts"
  ON public.circle_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_id AND cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

CREATE POLICY "Authors can delete own circle posts"
  ON public.circle_posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_circle_posts_circle ON public.circle_posts(circle_id, created_at DESC);

-- ===================== ANONYMOUS Q&A =====================
CREATE TABLE IF NOT EXISTS public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  is_answered BOOLEAN NOT NULL DEFAULT false,
  upvotes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions viewable by authenticated"
  ON public.qa_questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can ask questions"
  ON public.qa_questions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own questions"
  ON public.qa_questions FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own questions"
  ON public.qa_questions FOR DELETE
  USING (auth.uid() = author_id);

-- Q&A answers
CREATE TABLE IF NOT EXISTS public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  upvotes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answers viewable by authenticated"
  ON public.qa_answers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can answer"
  ON public.qa_answers FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own answers"
  ON public.qa_answers FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own answers"
  ON public.qa_answers FOR DELETE
  USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_qa_answers_question ON public.qa_answers(question_id, created_at);

-- Q&A upvotes
CREATE TABLE IF NOT EXISTS public.qa_upvotes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.qa_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upvotes"
  ON public.qa_upvotes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own upvotes"
  ON public.qa_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own upvotes"
  ON public.qa_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Question follow
CREATE TABLE IF NOT EXISTS public.qa_question_follows (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

ALTER TABLE public.qa_question_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own follows"
  ON public.qa_question_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to mark question answered
CREATE OR REPLACE FUNCTION public.handle_qa_answer_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.qa_questions SET is_answered = true WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_qa_answer
  AFTER INSERT ON public.qa_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qa_answer_insert();

-- Trigger to upvote count on questions
CREATE OR REPLACE FUNCTION public.handle_qa_upvote()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'question' THEN
      UPDATE public.qa_questions SET upvotes = upvotes + 1 WHERE id = NEW.target_id;
    ELSE
      UPDATE public.qa_answers SET upvotes = upvotes + 1 WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'question' THEN
      UPDATE public.qa_questions SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.target_id;
    ELSE
      UPDATE public.qa_answers SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.target_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_qa_upvote_insert
  AFTER INSERT ON public.qa_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qa_upvote();

CREATE OR REPLACE TRIGGER on_qa_upvote_delete
  AFTER DELETE ON public.qa_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qa_upvote();
