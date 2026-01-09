-- Create study_groups table
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  privacy_type TEXT NOT NULL DEFAULT 'invite_only' CHECK (privacy_type IN ('invite_only', 'request_to_join')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study_group_members table
CREATE TABLE public.study_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  invited_by UUID,
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create study_group_threads table
CREATE TABLE public.study_group_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create study_group_messages table
CREATE TABLE public.study_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.study_group_threads(id) ON DELETE CASCADE,
  user_id UUID,
  parent_id UUID REFERENCES public.study_group_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'approved',
  moderation_reason TEXT,
  moderation_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create study_group_invites table for tracking invitations
CREATE TABLE public.study_group_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, invited_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_study_group_members_user ON public.study_group_members(user_id);
CREATE INDEX idx_study_group_members_group ON public.study_group_members(group_id);
CREATE INDEX idx_study_group_threads_group ON public.study_group_threads(group_id);
CREATE INDEX idx_study_group_messages_thread ON public.study_group_messages(thread_id);
CREATE INDEX idx_study_group_invites_user ON public.study_group_invites(invited_user_id);

-- Enable RLS on all tables
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a member of a group
CREATE OR REPLACE FUNCTION is_group_member(check_user_id UUID, check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE user_id = check_user_id 
    AND group_id = check_group_id 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to check if user is group admin/owner
CREATE OR REPLACE FUNCTION is_group_admin(check_user_id UUID, check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE user_id = check_user_id 
    AND group_id = check_group_id 
    AND status = 'active'
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for study_groups
CREATE POLICY "Members can view their groups"
  ON public.study_groups FOR SELECT
  USING (
    is_group_member(auth.uid(), id)
    OR created_by = auth.uid()
    OR (privacy_type = 'request_to_join' AND is_active = true)
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Authenticated users can create groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Group admins can update their groups"
  ON public.study_groups FOR UPDATE
  USING (is_group_admin(auth.uid(), id) OR is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Group owners can delete their groups"
  ON public.study_groups FOR DELETE
  USING (created_by = auth.uid() OR is_platform_admin_or_higher(auth.uid()));

-- RLS Policies for study_group_members
CREATE POLICY "Members can view group members"
  ON public.study_group_members FOR SELECT
  USING (
    is_group_member(auth.uid(), group_id)
    OR user_id = auth.uid()
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Group admins can manage members"
  ON public.study_group_members FOR INSERT
  WITH CHECK (
    is_group_admin(auth.uid(), group_id)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Group admins can update members"
  ON public.study_group_members FOR UPDATE
  USING (is_group_admin(auth.uid(), group_id) OR is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Group admins can remove members"
  ON public.study_group_members FOR DELETE
  USING (
    is_group_admin(auth.uid(), group_id)
    OR user_id = auth.uid()
    OR is_platform_admin_or_higher(auth.uid())
  );

-- RLS Policies for study_group_threads
CREATE POLICY "Members can view group threads"
  ON public.study_group_threads FOR SELECT
  USING (is_group_member(auth.uid(), group_id) OR is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Members can create threads"
  ON public.study_group_threads FOR INSERT
  WITH CHECK (is_group_member(auth.uid(), group_id) AND created_by = auth.uid());

CREATE POLICY "Thread creators and admins can update"
  ON public.study_group_threads FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_group_admin(auth.uid(), group_id)
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Group admins can delete threads"
  ON public.study_group_threads FOR DELETE
  USING (is_group_admin(auth.uid(), group_id) OR is_platform_admin_or_higher(auth.uid()));

-- RLS Policies for study_group_messages
CREATE POLICY "Members can view group messages"
  ON public.study_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_group_threads t
      WHERE t.id = thread_id AND is_group_member(auth.uid(), t.group_id)
    )
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Members can create messages"
  ON public.study_group_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_group_threads t
      WHERE t.id = thread_id 
      AND is_group_member(auth.uid(), t.group_id)
      AND t.is_locked = false
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Message creators can update"
  ON public.study_group_messages FOR UPDATE
  USING (user_id = auth.uid() OR is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete messages"
  ON public.study_group_messages FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.study_group_threads t
      WHERE t.id = thread_id AND is_group_admin(auth.uid(), t.group_id)
    )
    OR is_platform_admin_or_higher(auth.uid())
  );

-- RLS Policies for study_group_invites
CREATE POLICY "Users can view their invites"
  ON public.study_group_invites FOR SELECT
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_group_admin(auth.uid(), group_id)
    OR is_platform_admin_or_higher(auth.uid())
  );

CREATE POLICY "Group admins can send invites"
  ON public.study_group_invites FOR INSERT
  WITH CHECK (
    is_group_admin(auth.uid(), group_id)
    OR (
      is_group_member(auth.uid(), group_id)
      AND EXISTS (
        SELECT 1 FROM public.study_groups g
        WHERE g.id = group_id AND g.privacy_type = 'invite_only'
      )
    )
  );

CREATE POLICY "Invited users can respond to invites"
  ON public.study_group_invites FOR UPDATE
  USING (invited_user_id = auth.uid() OR is_group_admin(auth.uid(), group_id));

CREATE POLICY "Group admins can delete invites"
  ON public.study_group_invites FOR DELETE
  USING (is_group_admin(auth.uid(), group_id) OR invited_by = auth.uid());

-- Trigger to update last_activity_at on threads
CREATE OR REPLACE FUNCTION update_group_thread_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.study_group_threads
  SET last_activity_at = now(),
      reply_count = reply_count + 1
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_group_message_insert
  AFTER INSERT ON public.study_group_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_group_thread_activity();

-- Trigger to update study_groups updated_at
CREATE OR REPLACE FUNCTION update_study_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_study_group_timestamp();