-- Discussion threads (can be tied to module, chapter, or both)
CREATE TABLE public.discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual messages/posts
CREATE TABLE public.discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.discussion_threads(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.discussion_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'flagged', 'removed')),
  moderation_reason TEXT,
  moderation_scores JSONB,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User reports of inappropriate content
CREATE TABLE public.discussion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.discussion_messages(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, reported_by)
);

-- Track user warnings for repeated violations
CREATE TABLE public.discussion_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.discussion_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_warnings ENABLE ROW LEVEL SECURITY;

-- Threads: Everyone can read, authenticated users can create
CREATE POLICY "Anyone can view threads" ON public.discussion_threads
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.discussion_threads
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND NOT is_user_banned(auth.uid())
  );

CREATE POLICY "Users can update own threads" ON public.discussion_threads
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all threads" ON public.discussion_threads
  FOR ALL USING (is_platform_admin_or_higher(auth.uid()));

-- Messages: Everyone can read approved, users can create/update own
CREATE POLICY "Anyone can view approved messages" ON public.discussion_messages
  FOR SELECT USING (
    moderation_status = 'approved' 
    OR user_id = auth.uid()
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Authenticated users can create messages" ON public.discussion_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND NOT is_user_banned(auth.uid())
  );

CREATE POLICY "Users can update own messages" ON public.discussion_messages
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Admins can delete messages" ON public.discussion_messages
  FOR DELETE USING (is_platform_admin_or_higher(auth.uid()));

-- Reports: Users can create, admins can view/manage
CREATE POLICY "Users can create reports" ON public.discussion_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND reported_by = auth.uid()
  );

CREATE POLICY "Users can view own reports" ON public.discussion_reports
  FOR SELECT USING (
    reported_by = auth.uid() 
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Admins can manage reports" ON public.discussion_reports
  FOR UPDATE USING (is_platform_admin_or_higher(auth.uid()));

-- Warnings: Only admins can view/manage
CREATE POLICY "Admins can view warnings" ON public.discussion_warnings
  FOR SELECT USING (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can create warnings" ON public.discussion_warnings
  FOR INSERT WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- Function to count user warnings
CREATE OR REPLACE FUNCTION public.get_user_warning_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.discussion_warnings WHERE user_id = _user_id;
$$;

-- Function to update thread reply count and last activity
CREATE OR REPLACE FUNCTION public.update_thread_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.discussion_threads 
    SET reply_count = reply_count + 1, last_activity_at = now()
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.discussion_threads 
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_thread_stats_trigger
AFTER INSERT OR DELETE ON public.discussion_messages
FOR EACH ROW EXECUTE FUNCTION public.update_thread_stats();

-- Trigger for updated_at on messages
CREATE TRIGGER update_discussion_messages_updated_at
BEFORE UPDATE ON public.discussion_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_discussion_threads_module ON public.discussion_threads(module_id);
CREATE INDEX idx_discussion_threads_chapter ON public.discussion_threads(chapter_id);
CREATE INDEX idx_discussion_threads_last_activity ON public.discussion_threads(last_activity_at DESC);
CREATE INDEX idx_discussion_messages_thread ON public.discussion_messages(thread_id);
CREATE INDEX idx_discussion_messages_parent ON public.discussion_messages(parent_id);
CREATE INDEX idx_discussion_messages_status ON public.discussion_messages(moderation_status);
CREATE INDEX idx_discussion_reports_status ON public.discussion_reports(status);
CREATE INDEX idx_discussion_warnings_user ON public.discussion_warnings(user_id);