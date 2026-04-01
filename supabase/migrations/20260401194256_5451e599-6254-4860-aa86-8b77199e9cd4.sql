
-- Create material_reactions table
CREATE TABLE public.material_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  material_type text NOT NULL,
  material_id uuid NOT NULL,
  chapter_id uuid REFERENCES public.module_chapters(id) ON DELETE SET NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('up', 'down')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_reactions_unique UNIQUE (user_id, material_type, material_id)
);

-- Index for aggregation queries
CREATE INDEX idx_material_reactions_material ON public.material_reactions (material_type, material_id);
CREATE INDEX idx_material_reactions_chapter ON public.material_reactions (chapter_id) WHERE chapter_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.material_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view reactions"
  ON public.material_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.material_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.material_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.material_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_material_reactions_updated_at
  BEFORE UPDATE ON public.material_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
