
-- Team credits table for KALM Hub team displayed in sidebar popover
CREATE TABLE IF NOT EXISTS public.team_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  email text,
  photo_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS team_credits_order_idx ON public.team_credits(display_order, name);

ALTER TABLE public.team_credits ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active members
DROP POLICY IF EXISTS "team_credits_read_active" ON public.team_credits;
CREATE POLICY "team_credits_read_active"
ON public.team_credits FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins manage
DROP POLICY IF EXISTS "team_credits_super_admin_insert" ON public.team_credits;
CREATE POLICY "team_credits_super_admin_insert"
ON public.team_credits FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "team_credits_super_admin_update" ON public.team_credits;
CREATE POLICY "team_credits_super_admin_update"
ON public.team_credits FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "team_credits_super_admin_delete" ON public.team_credits;
CREATE POLICY "team_credits_super_admin_delete"
ON public.team_credits FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS team_credits_set_updated_at ON public.team_credits;
CREATE TRIGGER team_credits_set_updated_at
BEFORE UPDATE ON public.team_credits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed current team (idempotent on name)
INSERT INTO public.team_credits (name, role, email, display_order)
VALUES
  ('Dr. Ahmed Mansour', 'Concept & Vision', 'Ymans0995@gmail.com', 10),
  ('Dr. Basma Bahgat', 'Content Management', 'basma.ali@kasralainy.edu.eg', 20),
  ('Dr. Marwa Mostafa', 'Interactive Cases', 'marwamostafa@kasralainy.edu.eg', 30),
  ('Dr. Mohab Anwar', 'UI Design', 'mohabanwar1@gmail.com', 40),
  ('Dr. Mohamed Amro', 'Design, Code Review & Security', 'mohamed_am_aldeeb@students.kasralainy.edu.eg', 50),
  ('Dr. Mohamed Elbarbary', 'Concept & Design Lead', 'mohamed.elbarbary@kasralainy.edu.eg', 60),
  ('Dr. Mohamed Khaled Maslouh', 'MCQ Development', 'mohamed_kh_maslouh@students.kasralainy.edu.eg', 70),
  ('Dr. Mohamed Lotfy', 'Flashcards Development', 'Eriksonlegend1@gmail.com', 80),
  ('Dr. Mohamed Osama', 'Video Sorting', NULL, 90),
  ('Dr. Omar Mohamed Mahmoud', 'Testing & Concept Design', NULL, 100),
  ('Dr. Omar Mofreh', 'Logo Design', 'om.mufreh2022@students.kasralainy.edu.eg', 110),
  ('Dr. Soha Elmorsy', 'Concept & Vision', 'soha.elmorsy@kasralainy.edu.eg', 120)
ON CONFLICT DO NOTHING;
