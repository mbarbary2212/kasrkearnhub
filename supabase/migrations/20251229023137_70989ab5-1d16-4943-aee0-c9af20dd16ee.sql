-- =====================================================
-- LEGACY MCQ TABLES - DENY WRITE POLICIES
-- These tables (mcq_sets, mcq_questions, mcq_attempts) are used by Topic/Department views.
-- The newer `mcqs` table is used by Module/Chapter views.
-- Adding deny-write policies to prevent accidental writes to legacy tables.
-- =====================================================

-- Drop existing write policies on mcq_sets (keep SELECT)
DROP POLICY IF EXISTS "Content managers can manage mcq_sets" ON public.mcq_sets;

-- Create deny-write policies for mcq_sets
CREATE POLICY "LEGACY: Deny INSERT on mcq_sets" 
ON public.mcq_sets 
FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "LEGACY: Deny UPDATE on mcq_sets" 
ON public.mcq_sets 
FOR UPDATE 
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "LEGACY: Deny DELETE on mcq_sets" 
ON public.mcq_sets 
FOR DELETE 
TO authenticated
USING (false);

-- Drop existing write policies on mcq_questions (keep SELECT)
DROP POLICY IF EXISTS "Content managers can manage mcq_questions" ON public.mcq_questions;

-- Create deny-write policies for mcq_questions
CREATE POLICY "LEGACY: Deny INSERT on mcq_questions" 
ON public.mcq_questions 
FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "LEGACY: Deny UPDATE on mcq_questions" 
ON public.mcq_questions 
FOR UPDATE 
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "LEGACY: Deny DELETE on mcq_questions" 
ON public.mcq_questions 
FOR DELETE 
TO authenticated
USING (false);

-- mcq_attempts already has no UPDATE/DELETE policies, just add explicit deny for INSERT
DROP POLICY IF EXISTS "Users can create their own attempts" ON public.mcq_attempts;

CREATE POLICY "LEGACY: Deny INSERT on mcq_attempts" 
ON public.mcq_attempts 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Add comments to tables for documentation
COMMENT ON TABLE public.mcq_sets IS 'LEGACY: Used by Topic/Department views. Read-only. For new MCQs, use public.mcqs table.';
COMMENT ON TABLE public.mcq_questions IS 'LEGACY: Questions within mcq_sets. Read-only. For new MCQs, use public.mcqs table.';
COMMENT ON TABLE public.mcq_attempts IS 'LEGACY: Student attempts on mcq_sets. Read-only. For new MCQs, use public.mcqs table.';
COMMENT ON TABLE public.mcqs IS 'PRIMARY: Used by Module/Chapter views for all MCQ operations (add, edit, delete, bulk import).';