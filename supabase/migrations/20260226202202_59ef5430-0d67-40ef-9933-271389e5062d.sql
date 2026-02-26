
-- Add AI-driven case columns to virtual_patient_cases
ALTER TABLE virtual_patient_cases
  ADD COLUMN IF NOT EXISTS learning_objectives text,
  ADD COLUMN IF NOT EXISTS is_ai_driven boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_turns integer DEFAULT 10;

-- Mark existing advanced cases as AI-driven
UPDATE virtual_patient_cases SET is_ai_driven = true WHERE case_type = 'advanced';

-- Add AI tracking columns to virtual_patient_attempts
ALTER TABLE virtual_patient_attempts
  ADD COLUMN IF NOT EXISTS flag_for_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;

-- Create ai_case_messages table for conversation history
CREATE TABLE IF NOT EXISTS ai_case_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid        NOT NULL REFERENCES virtual_patient_attempts(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content         text        NOT NULL,
  structured_data jsonb,
  turn_number     integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_case_messages_attempt_id_idx
  ON ai_case_messages (attempt_id, turn_number);

ALTER TABLE ai_case_messages ENABLE ROW LEVEL SECURITY;

-- Students can read messages from their own attempts
CREATE POLICY "Students can read own attempt messages"
  ON ai_case_messages FOR SELECT
  USING (attempt_id IN (
    SELECT id FROM virtual_patient_attempts WHERE user_id = auth.uid()
  ));

-- Students can insert messages for their own attempts
CREATE POLICY "Students can insert own attempt messages"
  ON ai_case_messages FOR INSERT
  WITH CHECK (attempt_id IN (
    SELECT id FROM virtual_patient_attempts WHERE user_id = auth.uid()
  ));

-- Platform admins and super admins can read all messages
CREATE POLICY "Admins can read all messages"
  ON ai_case_messages FOR SELECT
  USING (is_platform_admin_or_higher(auth.uid()));

-- Service role (edge functions) can insert messages
CREATE POLICY "Service role can manage messages"
  ON ai_case_messages FOR ALL
  USING (auth.role() = 'service_role');
