
-- ============================================================
-- SECTION 1: Add PDF + case_count columns to module_chapters
-- ============================================================
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS pdf_text TEXT;
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS pdf_pages INTEGER DEFAULT 0;
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS pdf_uploaded_at TIMESTAMPTZ;
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS case_count INTEGER DEFAULT 0;
ALTER TABLE module_chapters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================
-- SECTION 2: Add structured case columns to virtual_patient_cases
-- ============================================================
ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS history_mode TEXT DEFAULT 'full_conversation'
  CHECK (history_mode IN ('full_conversation', 'paramedic_handover', 'triage_note', 'witness_account', 'no_history'));

ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'practice'
  CHECK (delivery_mode IN ('practice', 'exam'));

ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS patient_language TEXT DEFAULT 'en'
  CHECK (patient_language IN ('en', 'ar_eg'));

ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS additional_instructions TEXT;
ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS active_sections TEXT[];
ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS section_question_counts JSONB;
ALTER TABLE virtual_patient_cases ADD COLUMN IF NOT EXISTS generated_case_data JSONB;

-- FIX 1: Safe idempotent FK for module_id
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'virtual_patient_cases'::regclass
    AND contype = 'f'
    AND conkey = ARRAY(
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'virtual_patient_cases'::regclass
        AND attname = 'module_id'
    );

  IF _constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE virtual_patient_cases DROP CONSTRAINT '
            || quote_ident(_constraint_name);
  END IF;

  ALTER TABLE virtual_patient_cases
    ADD CONSTRAINT fk_cases_module_id
    FOREIGN KEY (module_id) REFERENCES modules(id);
END $$;

-- FIX 1: Safe idempotent FK for chapter_id
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'virtual_patient_cases'::regclass
    AND contype = 'f'
    AND conkey = ARRAY(
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'virtual_patient_cases'::regclass
        AND attname = 'chapter_id'
    );

  IF _constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE virtual_patient_cases DROP CONSTRAINT '
            || quote_ident(_constraint_name);
  END IF;

  ALTER TABLE virtual_patient_cases
    ADD CONSTRAINT fk_cases_chapter_id
    FOREIGN KEY (chapter_id) REFERENCES module_chapters(id);
END $$;

-- ============================================================
-- SECTION 3: Create case_reference_documents table
-- ============================================================
CREATE TABLE case_reference_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES virtual_patient_cases(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES module_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  doc_category TEXT NOT NULL DEFAULT 'general'
    CHECK (doc_category IN ('checklist', 'lecture', 'guideline', 'general')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- XOR constraint: linked to case OR chapter, never both, never neither
  CONSTRAINT case_or_chapter_not_both CHECK (
    (case_id IS NOT NULL AND chapter_id IS NULL)
    OR (case_id IS NULL AND chapter_id IS NOT NULL)
  )
);

ALTER TABLE case_reference_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view reference docs
CREATE POLICY "Authenticated users can view reference docs"
  ON case_reference_documents FOR SELECT TO authenticated
  USING (true);

-- Admins/teachers can manage reference docs
CREATE POLICY "Admins can manage reference docs"
  ON case_reference_documents FOR ALL TO authenticated
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- SECTION 4: Create case_section_answers table
-- ============================================================
CREATE TABLE case_section_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES virtual_patient_attempts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'history_taking', 'physical_examination', 'investigations_labs',
    'investigations_imaging', 'diagnosis', 'medical_management',
    'surgical_management', 'monitoring_followup',
    'patient_family_advice', 'conclusion'
  )),
  student_answer JSONB,
  score NUMERIC,
  max_score NUMERIC,
  ai_feedback TEXT,
  is_scored BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- One answer per section per attempt
  UNIQUE (attempt_id, section_type)
);

ALTER TABLE case_section_answers ENABLE ROW LEVEL SECURITY;

-- Students can insert their own section answers (via attempt ownership)
CREATE POLICY "Students can insert own section answers"
  ON case_section_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM virtual_patient_attempts
      WHERE id = attempt_id AND user_id = auth.uid()
    )
  );

-- Students can view own, admins can view all
CREATE POLICY "Students can view own section answers"
  ON case_section_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM virtual_patient_attempts
      WHERE id = attempt_id AND user_id = auth.uid()
    )
    OR is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  );

-- FIX 2: Note about edge function bypass
-- Note: the score-case-answers edge function uses service_role key
-- and therefore bypasses RLS to write AI scores. This policy covers
-- manual admin corrections via the dashboard only.
CREATE POLICY "Admins can update section answers"
  ON case_section_answers FOR UPDATE TO authenticated
  USING (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    is_platform_admin_or_higher(auth.uid())
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- SECTION 5: Trigger to update module_chapters.case_count
-- Handles INSERT, UPDATE, and DELETE on virtual_patient_cases
-- ============================================================
CREATE OR REPLACE FUNCTION update_chapter_case_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _chapter_id UUID;
BEGIN
  -- Determine which chapter_id to update
  IF TG_OP = 'DELETE' THEN
    _chapter_id := OLD.chapter_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new chapter if changed
    IF OLD.chapter_id IS DISTINCT FROM NEW.chapter_id THEN
      -- Update old chapter count
      IF OLD.chapter_id IS NOT NULL THEN
        UPDATE module_chapters SET case_count = (
          SELECT COUNT(*) FROM virtual_patient_cases
          WHERE chapter_id = OLD.chapter_id
            AND is_published = true AND is_deleted = false
        ) WHERE id = OLD.chapter_id;
      END IF;
    END IF;
    _chapter_id := NEW.chapter_id;
  ELSE
    _chapter_id := NEW.chapter_id;
  END IF;

  -- Update the target chapter count
  IF _chapter_id IS NOT NULL THEN
    UPDATE module_chapters SET case_count = (
      SELECT COUNT(*) FROM virtual_patient_cases
      WHERE chapter_id = _chapter_id
        AND is_published = true AND is_deleted = false
    ) WHERE id = _chapter_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_chapter_case_count
  AFTER INSERT OR UPDATE OF is_published, is_deleted, chapter_id
  OR DELETE ON virtual_patient_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_case_count();
