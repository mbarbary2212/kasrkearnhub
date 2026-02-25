
-- ============================================
-- Consequence & Patient State System Migration
-- ============================================

-- 1. virtual_patient_cases: add case_type, feedback_timing, status_panel, initial_state
ALTER TABLE public.virtual_patient_cases
  ADD COLUMN IF NOT EXISTS case_type TEXT NOT NULL DEFAULT 'guided',
  ADD COLUMN IF NOT EXISTS feedback_timing TEXT NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS status_panel_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS initial_state_json JSONB NULL;

-- 2. virtual_patient_stages: add consequence_text, state_delta_json
ALTER TABLE public.virtual_patient_stages
  ADD COLUMN IF NOT EXISTS consequence_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS state_delta_json JSONB NULL;

-- 3. interactive_algorithms: add reveal_mode, include_consequences, initial_state_json
ALTER TABLE public.interactive_algorithms
  ADD COLUMN IF NOT EXISTS reveal_mode TEXT NOT NULL DEFAULT 'node_by_node',
  ADD COLUMN IF NOT EXISTS include_consequences BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS initial_state_json JSONB NULL;
