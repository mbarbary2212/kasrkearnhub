-- Phase 1: Add Assignment and Tracking Fields

-- 1.1 Add columns to inquiries table
ALTER TABLE inquiries 
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_team TEXT CHECK (assigned_team IN ('platform', 'module', 'chapter', 'teacher')),
  ADD COLUMN IF NOT EXISTS seen_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_viewed_by UUID REFERENCES auth.users(id);

-- 1.2 Add columns to item_feedback table
ALTER TABLE item_feedback 
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_team TEXT CHECK (assigned_team IN ('platform', 'module', 'chapter', 'teacher')),
  ADD COLUMN IF NOT EXISTS seen_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_viewed_by UUID REFERENCES auth.users(id);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_team ON inquiries(assigned_team) WHERE assigned_team IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_seen ON inquiries(seen_by_admin);

CREATE INDEX IF NOT EXISTS idx_item_feedback_assigned_to ON item_feedback(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_feedback_assigned_team ON item_feedback(assigned_team) WHERE assigned_team IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_item_feedback_seen ON item_feedback(seen_by_admin);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Module admins can assign inquiries" ON inquiries;
DROP POLICY IF EXISTS "Module admins can assign item_feedback" ON item_feedback;

-- RLS Policy: Allow module admins to update assignment fields
CREATE POLICY "Module admins can assign inquiries"
ON inquiries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  )
  OR EXISTS (
    SELECT 1 FROM module_admins WHERE user_id = auth.uid() AND module_id = inquiries.module_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  )
  OR EXISTS (
    SELECT 1 FROM module_admins WHERE user_id = auth.uid() AND module_id = inquiries.module_id
  )
);

CREATE POLICY "Module admins can assign item_feedback"
ON item_feedback FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  )
  OR EXISTS (
    SELECT 1 FROM module_admins WHERE user_id = auth.uid() AND module_id = item_feedback.module_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  )
  OR EXISTS (
    SELECT 1 FROM module_admins WHERE user_id = auth.uid() AND module_id = item_feedback.module_id
  )
);