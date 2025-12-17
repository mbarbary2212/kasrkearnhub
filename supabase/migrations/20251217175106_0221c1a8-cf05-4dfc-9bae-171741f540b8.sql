-- =============================================
-- REFACTOR: Department-based to Module-based curriculum
-- =============================================

-- 1. Create years table (replaces hardcoded years)
CREATE TABLE public.years (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT,
    subtitle TEXT,
    description TEXT,
    color TEXT DEFAULT 'bg-primary',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create modules table (replaces topics as the main navigation unit)
CREATE TABLE public.modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(year_id, slug)
);

-- 3. Create module_departments junction table (many-to-many)
CREATE TABLE public.module_departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(module_id, department_id)
);

-- 4. Create module_admins table (assign admins to specific modules)
CREATE TABLE public.module_admins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    assigned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, module_id)
);

-- 5. Add contributing_department_id to content tables
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.mcq_sets ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.mcq_sets ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.practicals ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.practicals ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

ALTER TABLE public.clinical_cases ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.clinical_cases ADD COLUMN IF NOT EXISTS contributing_department_id UUID REFERENCES public.departments(id);

-- 6. Update feedback tables to support module-based feedback
ALTER TABLE public.feedback_topics ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id);
ALTER TABLE public.student_feedback ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id);

-- 7. Create updated_at trigger for modules
CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- 8. Enable RLS on new tables
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_admins ENABLE ROW LEVEL SECURITY;

-- 9. Create helper function to check if user is module admin
CREATE OR REPLACE FUNCTION public.is_module_admin(_user_id UUID, _module_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.module_admins
    WHERE user_id = _user_id AND module_id = _module_id
  )
$$;

-- 10. Create helper function to check content management permission
CREATE OR REPLACE FUNCTION public.can_manage_module_content(_user_id UUID, _module_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Super admin or platform admin
    is_platform_admin_or_higher(_user_id)
    OR
    -- Module admin
    is_module_admin(_user_id, _module_id)
    OR
    -- Teacher or admin role
    has_role(_user_id, 'teacher') OR has_role(_user_id, 'admin')
  )
$$;

-- =============================================
-- RLS POLICIES FOR YEARS
-- =============================================
CREATE POLICY "Anyone can view active years"
ON public.years FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage years"
ON public.years FOR ALL
USING (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR MODULES
-- =============================================
CREATE POLICY "Anyone can view published modules"
ON public.modules FOR SELECT
USING (is_published = true OR is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Super admins can manage modules"
ON public.modules FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Platform admins can manage modules"
ON public.modules FOR ALL
USING (is_platform_admin_or_higher(auth.uid()));

-- =============================================
-- RLS POLICIES FOR MODULE_DEPARTMENTS
-- =============================================
CREATE POLICY "Anyone can view module departments"
ON public.module_departments FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage module departments"
ON public.module_departments FOR ALL
USING (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR MODULE_ADMINS
-- =============================================
CREATE POLICY "Module admins can view their assignments"
ON public.module_admins FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all module admins"
ON public.module_admins FOR SELECT
USING (is_platform_admin_or_higher(auth.uid()));

CREATE POLICY "Super admins can manage module admins"
ON public.module_admins FOR ALL
USING (is_super_admin(auth.uid()));

-- =============================================
-- INSERT DEFAULT YEARS DATA
-- =============================================
INSERT INTO public.years (number, name, name_ar, subtitle, color, display_order) VALUES
(1, 'Year 1', 'السنة الأولى', 'Foundation', 'bg-medical-blue', 1),
(2, 'Year 2', 'السنة الثانية', 'Pre-Clinical', 'bg-medical-teal', 2),
(3, 'Year 3', 'السنة الثالثة', 'Clinical I', 'bg-medical-green', 3),
(4, 'Year 4', 'السنة الرابعة', 'Clinical II', 'bg-medical-orange', 4),
(5, 'Year 5', 'السنة الخامسة', 'Final Year', 'bg-medical-purple', 5)
ON CONFLICT (number) DO NOTHING;