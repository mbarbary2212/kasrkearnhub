-- 1. examiner_avatars table
CREATE TABLE public.examiner_avatars (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examiner_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active avatars"
  ON public.examiner_avatars FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can manage avatars"
  ON public.examiner_avatars FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Seed with existing 4 avatars
INSERT INTO public.examiner_avatars (id, name, image_url, display_order) VALUES
  (1, 'Dr. Sarah', '/examiner-avatars/examiner-1.png', 1),
  (2, 'Dr. Laylah', '/examiner-avatars/examiner-2.png', 2),
  (3, 'Dr. Omar', '/examiner-avatars/examiner-3.png', 3),
  (4, 'Dr. Hani', '/examiner-avatars/examiner-4.png', 4);

-- Reset sequence to avoid conflicts with future inserts
SELECT setval('examiner_avatars_id_seq', 4);

-- 2. Add history_interaction_mode to virtual_patient_cases
ALTER TABLE public.virtual_patient_cases
  ADD COLUMN history_interaction_mode TEXT NOT NULL DEFAULT 'text'
  CONSTRAINT chk_history_interaction_mode CHECK (history_interaction_mode IN ('voice', 'text'));