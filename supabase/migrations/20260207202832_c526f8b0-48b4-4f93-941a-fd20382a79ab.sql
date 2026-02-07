-- Fix flashcards table to support topic-based modules (like Pharmacology)

-- Step 1: Make chapter_id nullable (currently NOT NULL, which breaks topic-based modules)
ALTER TABLE public.flashcards 
  ALTER COLUMN chapter_id DROP NOT NULL;

-- Step 2: Add topic_id column
ALTER TABLE public.flashcards 
  ADD COLUMN topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Step 3: Add CHECK constraint for mutual exclusivity
-- Either chapter_id OR topic_id must be set, but not both, and not neither
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_chapter_topic_exclusive 
  CHECK (
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR 
    (chapter_id IS NULL AND topic_id IS NOT NULL)
  );

-- Step 4: Create index for topic_id lookups
CREATE INDEX idx_flashcards_topic_id ON public.flashcards(topic_id) WHERE topic_id IS NOT NULL;

-- Step 5: Update RLS policies to support topic-based access
-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Admins can manage flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Admins can delete flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Admins can insert flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Admins can update flashcards" ON public.flashcards;

-- Create comprehensive policies supporting both chapter and topic access
CREATE POLICY "Admins can manage flashcards" ON public.flashcards
  FOR ALL
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR can_manage_module_content(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
    OR (topic_id IS NOT NULL AND can_manage_topic_content(auth.uid(), topic_id))
  )
  WITH CHECK (
    is_platform_admin_or_higher(auth.uid())
    OR can_manage_module_content(auth.uid(), module_id)
    OR (chapter_id IS NOT NULL AND can_manage_chapter_content(auth.uid(), chapter_id))
    OR (topic_id IS NOT NULL AND can_manage_topic_content(auth.uid(), topic_id))
  );