
-- Chapter Questions table
CREATE TABLE public.chapter_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text text NOT NULL CHECK (char_length(question_text) <= 500),
  is_answered boolean NOT NULL DEFAULT false,
  answer_text text,
  answered_by uuid REFERENCES auth.users(id),
  answered_at timestamptz,
  upvote_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chapter Question Upvotes table
CREATE TABLE public.chapter_question_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.chapter_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

-- Indexes
CREATE INDEX idx_chapter_questions_chapter ON public.chapter_questions(chapter_id);
CREATE INDEX idx_chapter_questions_module ON public.chapter_questions(module_id);
CREATE INDEX idx_chapter_questions_upvotes ON public.chapter_questions(upvote_count DESC);
CREATE INDEX idx_chapter_question_upvotes_question ON public.chapter_question_upvotes(question_id);

-- Enable RLS
ALTER TABLE public.chapter_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_question_upvotes ENABLE ROW LEVEL SECURITY;

-- RLS: chapter_questions
CREATE POLICY "Students can read non-hidden questions"
  ON public.chapter_questions FOR SELECT
  TO authenticated
  USING (is_hidden = false);

CREATE POLICY "Admins can read all questions"
  ON public.chapter_questions FOR SELECT
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Authenticated users can insert their own questions"
  ON public.chapter_questions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update questions"
  ON public.chapter_questions FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()) OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- RLS: chapter_question_upvotes
CREATE POLICY "Users can read upvotes"
  ON public.chapter_question_upvotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own upvotes"
  ON public.chapter_question_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own upvotes"
  ON public.chapter_question_upvotes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to update upvote_count
CREATE OR REPLACE FUNCTION public.update_question_upvote_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chapter_questions SET upvote_count = upvote_count + 1 WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chapter_questions SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.question_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_question_upvote_count
  AFTER INSERT OR DELETE ON public.chapter_question_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_question_upvote_count();
