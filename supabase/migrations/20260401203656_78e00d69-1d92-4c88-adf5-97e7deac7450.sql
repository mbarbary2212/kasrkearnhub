-- Create content review notes table for admin actions on content items
CREATE TABLE public.content_review_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_type TEXT NOT NULL,
  material_id UUID NOT NULL,
  chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  review_status TEXT NOT NULL DEFAULT 'new' CHECK (review_status IN ('new', 'in_review', 'resolved')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_type, material_id)
);

ALTER TABLE public.content_review_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view review notes"
ON public.content_review_notes FOR SELECT
TO authenticated
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.is_any_module_admin(auth.uid())
);

CREATE POLICY "Admins can insert review notes"
ON public.content_review_notes FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.is_any_module_admin(auth.uid())
);

CREATE POLICY "Admins can update review notes"
ON public.content_review_notes FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.is_any_module_admin(auth.uid())
);

CREATE TRIGGER update_content_review_notes_updated_at
BEFORE UPDATE ON public.content_review_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();