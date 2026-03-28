-- Add weight_mode column to assessment_structures
ALTER TABLE public.assessment_structures 
  ADD COLUMN IF NOT EXISTS weight_mode text NOT NULL DEFAULT 'percent' 
  CHECK (weight_mode IN ('percent', 'marks'));

-- Add unique index on topic_exam_weights for matrix upsert pattern
CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_exam_weights_matrix 
  ON public.topic_exam_weights (assessment_id, component_id, chapter_id) 
  WHERE component_id IS NOT NULL AND chapter_id IS NOT NULL;