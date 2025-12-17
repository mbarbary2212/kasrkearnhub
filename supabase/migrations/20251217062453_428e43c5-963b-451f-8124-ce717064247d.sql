-- 1. Create department_admins table to track which departments each department admin manages
CREATE TABLE IF NOT EXISTS public.department_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, department_id)
);

ALTER TABLE public.department_admins ENABLE ROW LEVEL SECURITY;

-- 2. Create feedback_topics table for categorizing feedback
CREATE TABLE IF NOT EXISTS public.feedback_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  description text,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedback_topics ENABLE ROW LEVEL SECURITY;

-- 3. Create student_feedback table (anonymous by design - NO user_id column)
CREATE TABLE IF NOT EXISTS public.student_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_topic_id uuid NOT NULL REFERENCES public.feedback_topics(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id),
  -- Rating fields (1-5 scale)
  content_quality integer CHECK (content_quality >= 1 AND content_quality <= 5),
  teaching_effectiveness integer CHECK (teaching_effectiveness >= 1 AND teaching_effectiveness <= 5),
  resource_availability integer CHECK (resource_availability >= 1 AND resource_availability <= 5),
  overall_satisfaction integer CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
  -- Open-ended feedback
  comments text,
  suggestions text,
  -- Metadata (NO user_id to ensure anonymity)
  academic_year integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- 4. Create helper functions for role checking

-- Check if user is a department admin for a specific department
CREATE OR REPLACE FUNCTION public.is_department_admin(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.department_admins da ON da.user_id = ur.user_id
    WHERE ur.user_id = _user_id 
      AND ur.role = 'department_admin'
      AND da.department_id = _department_id
  )
$$;

-- Check if user is platform admin or higher
CREATE OR REPLACE FUNCTION public.is_platform_admin_or_higher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role IN ('platform_admin', 'super_admin')
  )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = 'super_admin'
  )
$$;

-- Get user's admin level (for hierarchy checks)
CREATE OR REPLACE FUNCTION public.get_admin_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE role
      WHEN 'super_admin' THEN 100
      WHEN 'platform_admin' THEN 75
      WHEN 'department_admin' THEN 50
      WHEN 'admin' THEN 50
      WHEN 'teacher' THEN 25
      WHEN 'student' THEN 10
      ELSE 0
    END
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1),
    0
  )
$$;

-- 5. RLS Policies for department_admins table
CREATE POLICY "Super admins can manage department_admins"
ON public.department_admins
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Department admins can view their own assignments"
ON public.department_admins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all department admins"
ON public.department_admins
FOR SELECT
USING (public.is_platform_admin_or_higher(auth.uid()));

-- 6. RLS Policies for feedback_topics table
CREATE POLICY "Anyone can view active feedback topics"
ON public.feedback_topics
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage feedback topics"
ON public.feedback_topics
FOR ALL
USING (public.is_platform_admin_or_higher(auth.uid()));

-- 7. RLS Policies for student_feedback table
-- Students can submit feedback (no user_id stored for anonymity)
CREATE POLICY "Authenticated users can submit feedback"
ON public.student_feedback
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Individual records never visible to anyone (anonymity protection)
-- Only aggregates can be accessed
CREATE POLICY "No one can view individual feedback"
ON public.student_feedback
FOR SELECT
USING (false);

-- 8. Update content table RLS policies for hierarchical access

-- Update lectures RLS
DROP POLICY IF EXISTS "Teachers and admins can manage lectures" ON public.lectures;
CREATE POLICY "Content managers can manage lectures"
ON public.lectures
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = lectures.topic_id AND da.user_id = auth.uid()
  )
);

-- Update resources RLS
DROP POLICY IF EXISTS "Teachers and admins can manage resources" ON public.resources;
CREATE POLICY "Content managers can manage resources"
ON public.resources
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = resources.topic_id AND da.user_id = auth.uid()
  )
);

-- Update mcq_sets RLS
DROP POLICY IF EXISTS "Teachers and admins can manage mcq_sets" ON public.mcq_sets;
CREATE POLICY "Content managers can manage mcq_sets"
ON public.mcq_sets
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = mcq_sets.topic_id AND da.user_id = auth.uid()
  )
);

-- Update mcq_questions RLS
DROP POLICY IF EXISTS "Teachers and admins can manage mcq_questions" ON public.mcq_questions;
CREATE POLICY "Content managers can manage mcq_questions"
ON public.mcq_questions
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.mcq_sets ms
    JOIN public.topics t ON t.id = ms.topic_id
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE ms.id = mcq_questions.mcq_set_id AND da.user_id = auth.uid()
  )
);

-- Update essays RLS
DROP POLICY IF EXISTS "Teachers and admins can manage essays" ON public.essays;
CREATE POLICY "Content managers can manage essays"
ON public.essays
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = essays.topic_id AND da.user_id = auth.uid()
  )
);

-- Update practicals RLS
DROP POLICY IF EXISTS "Teachers and admins can manage practicals" ON public.practicals;
CREATE POLICY "Content managers can manage practicals"
ON public.practicals
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = practicals.topic_id AND da.user_id = auth.uid()
  )
);

-- Update clinical_cases RLS
DROP POLICY IF EXISTS "Teachers and admins can manage clinical_cases" ON public.clinical_cases;
CREATE POLICY "Content managers can manage clinical_cases"
ON public.clinical_cases
FOR ALL
USING (
  public.is_platform_admin_or_higher(auth.uid())
  OR public.has_role(auth.uid(), 'teacher')
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.topics t
    JOIN public.department_admins da ON da.department_id = t.department_id
    WHERE t.id = clinical_cases.topic_id AND da.user_id = auth.uid()
  )
);

-- 9. Update departments and topics RLS for super admin only structure changes
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Super admins can manage departments"
ON public.departments
FOR ALL
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and teachers can manage topics" ON public.topics;
CREATE POLICY "Super admins can manage topics"
ON public.topics
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- 10. Update user_roles policies for hierarchical management
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Platform admins can view roles"
ON public.user_roles
FOR SELECT
USING (public.is_platform_admin_or_higher(auth.uid()));