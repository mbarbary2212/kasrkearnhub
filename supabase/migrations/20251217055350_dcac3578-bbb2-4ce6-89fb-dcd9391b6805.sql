-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- Create enum for department category
CREATE TYPE public.department_category AS ENUM ('basic', 'clinical');

-- Create enum for content type
CREATE TYPE public.content_type AS ENUM ('lecture', 'resource', 'mcq', 'essay', 'practical');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- USER ROLES TABLE (separate for security)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- DEPARTMENTS TABLE
-- ============================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  years INTEGER[] NOT NULL,
  category department_category NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TOPICS TABLE
-- ============================================
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (department_id, slug)
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage topics" ON public.topics FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- LECTURES (Video Lessons)
-- ============================================
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  video_url TEXT,
  duration TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lectures" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage lectures" ON public.lectures FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- RESOURCES (PDFs, links, files)
-- ============================================
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  resource_type TEXT DEFAULT 'pdf',
  file_url TEXT,
  external_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage resources" ON public.resources FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- MCQs (Multiple Choice Questions)
-- ============================================
CREATE TABLE public.mcq_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  time_limit_minutes INTEGER,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcq_set_id UUID NOT NULL REFERENCES public.mcq_sets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_ar TEXT,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  explanation_ar TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mcq_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mcq_sets" ON public.mcq_sets FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage mcq_sets" ON public.mcq_sets FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Anyone can view mcq_questions" ON public.mcq_questions FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage mcq_questions" ON public.mcq_questions FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- ESSAYS
-- ============================================
CREATE TABLE public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  question TEXT NOT NULL,
  question_ar TEXT,
  model_answer TEXT,
  model_answer_ar TEXT,
  keywords TEXT[],
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view essays" ON public.essays FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage essays" ON public.essays FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- PRACTICALS
-- ============================================
CREATE TABLE public.practicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  objectives TEXT[],
  equipment TEXT[],
  procedure TEXT,
  procedure_ar TEXT,
  video_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.practicals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view practicals" ON public.practicals FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage practicals" ON public.practicals FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- CLINICAL CASES
-- ============================================
CREATE TABLE public.clinical_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  presentation TEXT NOT NULL,
  history TEXT,
  examination TEXT,
  investigations TEXT,
  differential_diagnosis TEXT[],
  final_diagnosis TEXT,
  management TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clinical_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view clinical_cases" ON public.clinical_cases FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can manage clinical_cases" ON public.clinical_cases FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- ============================================
-- USER PROGRESS TRACKING
-- ============================================
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own progress" ON public.user_progress FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student progress" ON public.user_progress FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- MCQ ATTEMPTS
-- ============================================
CREATE TABLE public.mcq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mcq_set_id UUID NOT NULL REFERENCES public.mcq_sets(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attempts" ON public.mcq_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attempts" ON public.mcq_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view all attempts" ON public.mcq_attempts FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON public.lectures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INSERT ALL DEPARTMENTS
-- ============================================
INSERT INTO public.departments (slug, name, description, icon, years, category, display_order) VALUES
-- Basic Sciences (Years 1-3)
('anatomy', 'Anatomy', 'Study of the structure of the human body', 'Bone', ARRAY[1, 2], 'basic', 1),
('physiology', 'Physiology', 'Study of the functions of living organisms', 'Heart', ARRAY[1, 2], 'basic', 2),
('biochemistry', 'Biochemistry', 'Chemical processes within living organisms', 'FlaskConical', ARRAY[1, 2], 'basic', 3),
('histology', 'Histology', 'Study of microscopic anatomy of cells and tissues', 'Microscope', ARRAY[1, 2], 'basic', 4),
('embryology', 'Embryology', 'Study of prenatal development', 'Baby', ARRAY[1], 'basic', 5),
('pathology', 'Pathology', 'Study of disease causes and effects', 'Microscope', ARRAY[2, 3], 'basic', 6),
('pharmacology', 'Pharmacology', 'Study of drugs and their effects', 'Pill', ARRAY[2, 3], 'basic', 7),
('microbiology', 'Microbiology', 'Study of microorganisms', 'Bug', ARRAY[2, 3], 'basic', 8),
('parasitology', 'Parasitology', 'Study of parasites and parasitic diseases', 'Bug', ARRAY[2, 3], 'basic', 9),
('immunology', 'Immunology', 'Study of the immune system', 'Shield', ARRAY[2, 3], 'basic', 10),
('community-medicine', 'Community Medicine', 'Public health and preventive medicine', 'Users', ARRAY[1, 2, 3, 4, 5], 'basic', 11),
('forensic-medicine', 'Forensic Medicine', 'Medical jurisprudence and toxicology', 'Scale', ARRAY[3, 4], 'basic', 12),
('medical-ethics', 'Medical Ethics', 'Ethics and professionalism in medicine', 'Heart', ARRAY[1, 2, 3, 4, 5], 'basic', 13),

-- Clinical Departments (Years 3-5)
('internal-medicine', 'Internal Medicine', 'Diagnosis and treatment of adult diseases', 'Stethoscope', ARRAY[3, 4, 5], 'clinical', 14),
('surgery', 'Surgery', 'Operative treatment of diseases and injuries', 'Scissors', ARRAY[3, 4, 5], 'clinical', 15),
('pediatrics', 'Pediatrics', 'Medical care of infants and children', 'Baby', ARRAY[4, 5], 'clinical', 16),
('obstetrics-gynecology', 'Obstetrics & Gynecology', 'Pregnancy, childbirth, and female reproductive health', 'Baby', ARRAY[4, 5], 'clinical', 17),
('orthopedics', 'Orthopedics', 'Musculoskeletal system disorders', 'Bone', ARRAY[4, 5], 'clinical', 18),
('ophthalmology', 'Ophthalmology', 'Eye diseases and disorders', 'Eye', ARRAY[4, 5], 'clinical', 19),
('ent', 'ENT', 'Ear, Nose, and Throat disorders', 'Ear', ARRAY[4, 5], 'clinical', 20),
('dermatology', 'Dermatology', 'Skin diseases and disorders', 'Layers', ARRAY[4, 5], 'clinical', 21),
('psychiatry', 'Psychiatry', 'Mental health disorders', 'Brain', ARRAY[4, 5], 'clinical', 22),
('radiology', 'Radiology', 'Medical imaging and diagnostics', 'Scan', ARRAY[3, 4, 5], 'clinical', 23),
('anesthesiology', 'Anesthesiology', 'Anesthesia and perioperative medicine', 'Syringe', ARRAY[4, 5], 'clinical', 24),
('emergency-medicine', 'Emergency Medicine', 'Acute care and emergency management', 'Ambulance', ARRAY[4, 5], 'clinical', 25),
('neurology', 'Neurology', 'Nervous system disorders', 'Brain', ARRAY[4, 5], 'clinical', 26),
('cardiology', 'Cardiology', 'Heart and cardiovascular diseases', 'Heart', ARRAY[4, 5], 'clinical', 27),
('nephrology', 'Nephrology', 'Kidney diseases and disorders', 'Droplet', ARRAY[4, 5], 'clinical', 28),
('gastroenterology', 'Gastroenterology', 'Digestive system disorders', 'Activity', ARRAY[4, 5], 'clinical', 29),
('pulmonology', 'Pulmonology', 'Respiratory system disorders', 'Wind', ARRAY[4, 5], 'clinical', 30),
('endocrinology', 'Endocrinology', 'Hormone and metabolic disorders', 'Activity', ARRAY[4, 5], 'clinical', 31),
('urology', 'Urology', 'Urinary tract and male reproductive disorders', 'Droplet', ARRAY[4, 5], 'clinical', 32),
('oncology', 'Oncology', 'Cancer diagnosis and treatment', 'Activity', ARRAY[4, 5], 'clinical', 33),
('hematology', 'Hematology', 'Blood disorders', 'Droplet', ARRAY[3, 4, 5], 'clinical', 34),
('rheumatology', 'Rheumatology', 'Autoimmune and musculoskeletal diseases', 'Bone', ARRAY[4, 5], 'clinical', 35),
('infectious-diseases', 'Infectious Diseases', 'Infections and tropical medicine', 'Bug', ARRAY[4, 5], 'clinical', 36),
('family-medicine', 'Family Medicine', 'Primary care and family health', 'Home', ARRAY[5], 'clinical', 37),
('plastic-surgery', 'Plastic Surgery', 'Reconstructive and cosmetic surgery', 'Scissors', ARRAY[5], 'clinical', 38),
('neurosurgery', 'Neurosurgery', 'Surgical treatment of nervous system', 'Brain', ARRAY[5], 'clinical', 39),
('cardiothoracic-surgery', 'Cardiothoracic Surgery', 'Heart and chest surgery', 'Heart', ARRAY[5], 'clinical', 40),
('vascular-surgery', 'Vascular Surgery', 'Blood vessel surgery', 'Activity', ARRAY[5], 'clinical', 41);

-- ============================================
-- INSERT SAMPLE TOPICS FOR EACH DEPARTMENT
-- ============================================

-- Anatomy Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('upper-limb', 'Upper Limb', 'Anatomy of the arm, forearm, and hand', 1),
  ('lower-limb', 'Lower Limb', 'Anatomy of the thigh, leg, and foot', 2),
  ('thorax', 'Thorax', 'Anatomy of the chest cavity', 3),
  ('abdomen', 'Abdomen', 'Anatomy of the abdominal cavity', 4),
  ('pelvis', 'Pelvis & Perineum', 'Anatomy of the pelvic region', 5),
  ('head-neck', 'Head & Neck', 'Anatomy of the head and neck region', 6),
  ('neuroanatomy', 'Neuroanatomy', 'Anatomy of the nervous system', 7),
  ('back', 'Back & Vertebral Column', 'Anatomy of the spine and back muscles', 8)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'anatomy';

-- Physiology Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('general-physiology', 'General Physiology', 'Cell physiology and membrane transport', 1),
  ('cardiovascular-physiology', 'Cardiovascular System', 'Heart and blood vessel function', 2),
  ('respiratory-physiology', 'Respiratory System', 'Breathing and gas exchange', 3),
  ('renal-physiology', 'Renal System', 'Kidney function and fluid balance', 4),
  ('neurophysiology', 'Neurophysiology', 'Nervous system function', 5),
  ('gi-physiology', 'GI Physiology', 'Digestive system function', 6),
  ('endocrine-physiology', 'Endocrine System', 'Hormone regulation', 7),
  ('muscle-physiology', 'Muscle Physiology', 'Skeletal and smooth muscle function', 8),
  ('blood-physiology', 'Blood & Body Fluids', 'Hematology and fluid compartments', 9)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'physiology';

-- Biochemistry Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('carbohydrate-metabolism', 'Carbohydrate Metabolism', 'Glucose and glycogen metabolism', 1),
  ('lipid-metabolism', 'Lipid Metabolism', 'Fat metabolism and cholesterol', 2),
  ('protein-metabolism', 'Protein Metabolism', 'Amino acids and protein synthesis', 3),
  ('nucleotide-metabolism', 'Nucleotide Metabolism', 'DNA and RNA building blocks', 4),
  ('enzymes', 'Enzymes', 'Enzyme kinetics and regulation', 5),
  ('vitamins', 'Vitamins & Coenzymes', 'Water and fat-soluble vitamins', 6),
  ('molecular-biology', 'Molecular Biology', 'DNA replication, transcription, translation', 7),
  ('clinical-biochemistry', 'Clinical Biochemistry', 'Laboratory tests and interpretation', 8)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'biochemistry';

-- Pathology Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('cell-injury', 'Cell Injury & Adaptation', 'Cellular responses to stress', 1),
  ('inflammation', 'Inflammation', 'Acute and chronic inflammation', 2),
  ('hemodynamics', 'Hemodynamic Disorders', 'Thrombosis, embolism, shock', 3),
  ('neoplasia', 'Neoplasia', 'Tumor biology and cancer', 4),
  ('immunopathology', 'Immunopathology', 'Immune-mediated diseases', 5),
  ('genetic-disorders', 'Genetic Disorders', 'Inherited diseases', 6),
  ('systemic-pathology', 'Systemic Pathology', 'Organ-specific pathology', 7)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'pathology';

-- Pharmacology Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('general-pharmacology', 'General Pharmacology', 'Pharmacokinetics and pharmacodynamics', 1),
  ('autonomic-pharmacology', 'Autonomic Pharmacology', 'Drugs affecting ANS', 2),
  ('cardiovascular-drugs', 'Cardiovascular Drugs', 'Drugs for heart and BP', 3),
  ('cns-drugs', 'CNS Pharmacology', 'Drugs affecting the brain', 4),
  ('antimicrobials', 'Antimicrobial Agents', 'Antibiotics and antifungals', 5),
  ('anti-inflammatory', 'Anti-inflammatory Drugs', 'NSAIDs and steroids', 6),
  ('endocrine-drugs', 'Endocrine Pharmacology', 'Hormones and antidiabetics', 7),
  ('chemotherapy', 'Chemotherapy', 'Anticancer drugs', 8)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'pharmacology';

-- Microbiology Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('general-microbiology', 'General Microbiology', 'Basic concepts and lab techniques', 1),
  ('bacteriology', 'Bacteriology', 'Study of bacteria', 2),
  ('virology', 'Virology', 'Study of viruses', 3),
  ('mycology', 'Mycology', 'Study of fungi', 4),
  ('sterilization', 'Sterilization & Disinfection', 'Infection control', 5),
  ('clinical-microbiology', 'Clinical Microbiology', 'Diagnostic microbiology', 6)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'microbiology';

-- Surgery Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('surgical-principles', 'Surgical Principles', 'Basic surgical concepts', 1),
  ('trauma', 'Trauma Surgery', 'Management of injuries', 2),
  ('gi-surgery', 'GI Surgery', 'Abdominal surgical conditions', 3),
  ('breast-surgery', 'Breast Surgery', 'Breast diseases', 4),
  ('thyroid-surgery', 'Thyroid & Parathyroid', 'Endocrine surgery', 5),
  ('vascular-surgery', 'Vascular Surgery', 'Blood vessel conditions', 6),
  ('hernia', 'Hernia', 'Abdominal wall defects', 7),
  ('surgical-oncology', 'Surgical Oncology', 'Cancer surgery', 8)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'surgery';

-- Internal Medicine Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('cardiology-im', 'Cardiology', 'Heart diseases', 1),
  ('pulmonology-im', 'Pulmonology', 'Respiratory diseases', 2),
  ('gastroenterology-im', 'Gastroenterology', 'Digestive diseases', 3),
  ('nephrology-im', 'Nephrology', 'Kidney diseases', 4),
  ('endocrinology-im', 'Endocrinology', 'Metabolic disorders', 5),
  ('hematology-im', 'Hematology', 'Blood disorders', 6),
  ('rheumatology-im', 'Rheumatology', 'Joint diseases', 7),
  ('infectious-im', 'Infectious Diseases', 'Infections', 8),
  ('neurology-im', 'Neurology', 'Neurological disorders', 9)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'internal-medicine';

-- Community Medicine Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('epidemiology', 'Epidemiology', 'Disease patterns in populations', 1),
  ('biostatistics', 'Biostatistics', 'Statistical methods in medicine', 2),
  ('health-education', 'Health Education', 'Health promotion', 3),
  ('nutrition', 'Nutrition', 'Nutritional disorders and diet', 4),
  ('maternal-child-health', 'MCH', 'Maternal and child health', 5),
  ('occupational-health', 'Occupational Health', 'Work-related diseases', 6),
  ('environmental-health', 'Environmental Health', 'Environmental hazards', 7),
  ('communicable-diseases', 'Communicable Diseases', 'Infectious disease control', 8),
  ('healthcare-management', 'Healthcare Management', 'Health systems', 9)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'community-medicine';

-- Pediatrics Topics  
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('neonatology', 'Neonatology', 'Newborn care', 1),
  ('growth-development', 'Growth & Development', 'Child development', 2),
  ('pediatric-nutrition', 'Pediatric Nutrition', 'Infant feeding', 3),
  ('pediatric-infections', 'Pediatric Infections', 'Childhood infections', 4),
  ('pediatric-cardiology', 'Pediatric Cardiology', 'Heart diseases in children', 5),
  ('pediatric-respiratory', 'Pediatric Respiratory', 'Lung diseases in children', 6),
  ('pediatric-gi', 'Pediatric GI', 'GI disorders in children', 7),
  ('pediatric-neurology', 'Pediatric Neurology', 'Neurological disorders', 8),
  ('pediatric-emergencies', 'Pediatric Emergencies', 'Emergency care', 9)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'pediatrics';

-- OB/GYN Topics
INSERT INTO public.topics (department_id, slug, name, description, display_order)
SELECT d.id, t.slug, t.name, t.description, t.display_order
FROM public.departments d
CROSS JOIN (VALUES
  ('normal-pregnancy', 'Normal Pregnancy', 'Physiological changes', 1),
  ('antenatal-care', 'Antenatal Care', 'Prenatal monitoring', 2),
  ('labor-delivery', 'Labor & Delivery', 'Childbirth management', 3),
  ('high-risk-pregnancy', 'High-Risk Pregnancy', 'Pregnancy complications', 4),
  ('postpartum', 'Postpartum Care', 'After delivery care', 5),
  ('gynecology', 'Gynecology', 'Female reproductive disorders', 6),
  ('family-planning', 'Family Planning', 'Contraception', 7),
  ('gyn-oncology', 'Gynecologic Oncology', 'Female cancers', 8),
  ('infertility', 'Infertility', 'Reproductive medicine', 9)
) AS t(slug, name, description, display_order)
WHERE d.slug = 'obstetrics-gynecology';