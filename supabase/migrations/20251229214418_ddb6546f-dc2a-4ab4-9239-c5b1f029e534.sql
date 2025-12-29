-- Create announcements table
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'module', 'year')),
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  year_id uuid REFERENCES public.years(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create announcement reads table to track dismissals
CREATE TABLE public.announcement_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
-- Anyone can view active announcements (students need to see them)
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Platform admins can manage all announcements
CREATE POLICY "Platform admins can manage all announcements"
ON public.announcements
FOR ALL
USING (is_platform_admin_or_higher(auth.uid()))
WITH CHECK (is_platform_admin_or_higher(auth.uid()));

-- Module admins can manage their module announcements
CREATE POLICY "Module admins can manage module announcements"
ON public.announcements
FOR ALL
USING (
  module_id IS NOT NULL 
  AND is_module_admin(auth.uid(), module_id)
)
WITH CHECK (
  module_id IS NOT NULL 
  AND is_module_admin(auth.uid(), module_id)
);

-- RLS policies for announcement_reads
-- Users can view their own reads
CREATE POLICY "Users can view their own reads"
ON public.announcement_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reads
CREATE POLICY "Users can insert their own reads"
ON public.announcement_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();