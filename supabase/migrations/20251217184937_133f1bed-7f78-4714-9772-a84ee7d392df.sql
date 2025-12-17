-- Create module_chapters table
CREATE TABLE public.module_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  title text NOT NULL,
  order_index int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module_id, chapter_number),
  UNIQUE(module_id, order_index)
);

-- Create index for fast lookups
CREATE INDEX idx_module_chapters_module_id ON public.module_chapters(module_id);

-- Enable RLS
ALTER TABLE public.module_chapters ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_chapters
CREATE POLICY "Anyone can view chapters" 
ON public.module_chapters 
FOR SELECT 
USING (true);

CREATE POLICY "Platform admins can manage chapters" 
ON public.module_chapters 
FOR ALL 
USING (is_platform_admin_or_higher(auth.uid()));

-- Add chapter_id to content tables
ALTER TABLE public.lectures ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.resources ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.mcq_sets ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.essays ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.practicals ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.clinical_cases ADD COLUMN chapter_id uuid REFERENCES module_chapters(id) ON DELETE SET NULL;

-- Create indexes for fast filtering
CREATE INDEX idx_lectures_chapter_id ON public.lectures(chapter_id);
CREATE INDEX idx_resources_chapter_id ON public.resources(chapter_id);
CREATE INDEX idx_mcq_sets_chapter_id ON public.mcq_sets(chapter_id);
CREATE INDEX idx_essays_chapter_id ON public.essays(chapter_id);
CREATE INDEX idx_practicals_chapter_id ON public.practicals(chapter_id);
CREATE INDEX idx_clinical_cases_chapter_id ON public.clinical_cases(chapter_id);

-- Seed SUR-423 chapters (module_id: 153318ba-32b9-4f8e-9cbc-bdd8df9b9b10)
INSERT INTO public.module_chapters (module_id, chapter_number, title, order_index) VALUES
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 1, 'Wound Healing and Management', 1),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 2, 'Fluid and Electrolyte Balance in Surgical Patients', 2),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 3, 'Principles of Surgical Infection and Infection Control', 3),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 4, 'Burns: Classification, Emergency Care, and Fluid Resuscitation', 4),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 5, 'Perioperative Assessment and Management', 5),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 6, 'Resuscitation: CPR and Basic Life Support (BLS)', 6),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 7, 'Acute hemorrhage and blood transfusion', 7),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 8, 'Haemostasis', 8),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 9, 'Major trauma and the multiple-injury patient', 9),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 10, 'Surgical Nutrition', 10),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 11, 'Tumors', 11),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 12, 'Shock', 12),
('153318ba-32b9-4f8e-9cbc-bdd8df9b9b10', 13, 'Principles of organ Transplantation', 13);