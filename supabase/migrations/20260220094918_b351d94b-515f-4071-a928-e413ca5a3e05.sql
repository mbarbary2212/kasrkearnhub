
-- Add concept_id to flashcards, true_false_questions, lectures
ALTER TABLE public.flashcards
  ADD COLUMN concept_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL;

ALTER TABLE public.true_false_questions
  ADD COLUMN concept_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL;

ALTER TABLE public.lectures
  ADD COLUMN concept_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL;

-- Add concept_auto_assigned (DEFAULT true) to all 8 content tables
ALTER TABLE public.mcqs
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.essays
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.osce_questions
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.matching_questions
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.study_resources
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.flashcards
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.true_false_questions
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

ALTER TABLE public.lectures
  ADD COLUMN concept_auto_assigned boolean DEFAULT true;

-- Create indexes for concept_id on the 3 new tables
CREATE INDEX IF NOT EXISTS idx_flashcards_concept_id ON public.flashcards(concept_id);
CREATE INDEX IF NOT EXISTS idx_true_false_questions_concept_id ON public.true_false_questions(concept_id);
CREATE INDEX IF NOT EXISTS idx_lectures_concept_id ON public.lectures(concept_id);
