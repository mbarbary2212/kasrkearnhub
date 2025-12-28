-- Create matching_questions table for the new self-assessment type
CREATE TABLE public.matching_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.module_chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    contributing_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    
    -- Question content
    instruction TEXT NOT NULL DEFAULT 'Match the items in Column A with the correct items in Column B',
    column_a_items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {id, text} objects
    column_b_items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {id, text} objects  
    correct_matches JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of column_a_id -> column_b_id
    
    -- Optional explanation (can be per-question or per-match)
    explanation TEXT,
    show_explanation BOOLEAN NOT NULL DEFAULT true,
    
    -- Admin-only fields
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID
);

-- Add index for efficient queries
CREATE INDEX idx_matching_questions_module ON public.matching_questions(module_id);
CREATE INDEX idx_matching_questions_chapter ON public.matching_questions(chapter_id);
CREATE INDEX idx_matching_questions_not_deleted ON public.matching_questions(is_deleted) WHERE is_deleted = false;

-- Enable Row Level Security
ALTER TABLE public.matching_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view non-deleted matching questions
CREATE POLICY "Anyone can view matching_questions" 
ON public.matching_questions 
FOR SELECT 
USING (is_deleted = false);

-- Content managers can manage matching questions
CREATE POLICY "Content managers can manage matching_questions" 
ON public.matching_questions 
FOR ALL 
USING (
    is_platform_admin_or_higher(auth.uid()) 
    OR has_role(auth.uid(), 'teacher'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_manage_module_content(auth.uid(), module_id)
);