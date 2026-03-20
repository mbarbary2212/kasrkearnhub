-- Enforce only one default prompt per prompt_type
CREATE UNIQUE INDEX idx_mind_map_prompts_one_default_per_type
  ON public.mind_map_prompts (prompt_type)
  WHERE is_default = true;