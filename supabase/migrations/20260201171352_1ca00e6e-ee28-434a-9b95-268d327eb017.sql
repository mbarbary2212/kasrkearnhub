-- =====================================================
-- AI Content Factory: Database Migrations
-- =====================================================

-- 1. Change section_number from INTEGER to TEXT for hierarchical numbering (e.g., "3.1", "3.10")
ALTER TABLE sections 
ALTER COLUMN section_number TYPE TEXT 
USING section_number::TEXT;

COMMENT ON COLUMN sections.section_number IS 
  'Section identifier matching PDF structure (e.g., "3.1", "3.2", "3.10"). Used for AI content tagging.';

-- 2. Create ai_settings table for Super Admin configuration
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Only super/platform admins can manage AI settings
CREATE POLICY "Super admins can manage ai_settings" ON ai_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- All authenticated users can read AI settings (needed to check if factory is enabled)
CREATE POLICY "Authenticated users can read ai_settings" ON ai_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert default AI settings
INSERT INTO ai_settings (key, value, description) VALUES
  ('ai_provider', '"lovable"', 'AI provider: "lovable" or "gemini"'),
  ('gemini_model', '"gemini-1.5-flash"', 'Gemini model when using direct API'),
  ('lovable_model', '"google/gemini-3-flash-preview"', 'Lovable gateway model'),
  ('ai_content_factory_enabled', 'true', 'Enable/disable AI content generation from PDFs'),
  ('ai_content_factory_disabled_message', '"AI content generation is currently disabled by the administrator."', 
   'Message shown when factory is disabled');

-- 3. Create ai_batch_jobs table for resumable batch processing
CREATE TABLE ai_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES admin_documents(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  module_id UUID REFERENCES modules(id) NOT NULL,
  chapter_id UUID REFERENCES module_chapters(id) ON DELETE SET NULL,
  content_types JSONB NOT NULL DEFAULT '[]',
  quantities JSONB NOT NULL DEFAULT '{}',
  per_section BOOLEAN DEFAULT false,
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed', 'cancelled')),
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  job_ids JSONB DEFAULT '[]',
  duplicate_stats JSONB DEFAULT '{}',
  error_message TEXT,
  additional_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE ai_batch_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own batch jobs
CREATE POLICY "Admins can manage own batch jobs" ON ai_batch_jobs
  FOR ALL USING (auth.uid() = admin_id);

-- Super/platform admins can manage all batch jobs
CREATE POLICY "Super admins can manage all batch jobs" ON ai_batch_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin')
    )
  );

-- Indexes for common queries
CREATE INDEX idx_ai_batch_jobs_status ON ai_batch_jobs(status);
CREATE INDEX idx_ai_batch_jobs_admin ON ai_batch_jobs(admin_id);
CREATE INDEX idx_ai_batch_jobs_module ON ai_batch_jobs(module_id);
CREATE INDEX idx_ai_batch_jobs_created ON ai_batch_jobs(created_at DESC);