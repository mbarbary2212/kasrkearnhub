-- ── MCQ FSRS state table (mirrors flashcard_states) ──────────────

CREATE TABLE mcq_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mcq_id uuid NOT NULL,
  due timestamptz DEFAULT now() NOT NULL,
  stability float DEFAULT 0 NOT NULL,
  difficulty float DEFAULT 0 NOT NULL,
  elapsed_days integer DEFAULT 0 NOT NULL,
  scheduled_days integer DEFAULT 0 NOT NULL,
  reps integer DEFAULT 0 NOT NULL,
  lapses integer DEFAULT 0 NOT NULL,
  state text DEFAULT 'New' NOT NULL,
  last_review timestamptz,
  learning_steps integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, mcq_id)
);

-- ── MCQ review log (audit trail of every rating) ─────────────────

CREATE TABLE mcq_review_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mcq_id uuid NOT NULL,
  rating text NOT NULL,
  scheduled_days integer NOT NULL,
  elapsed_days integer NOT NULL,
  reviewed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ── Row Level Security ────────────────────────────────────────────

ALTER TABLE mcq_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mcq states"
  ON mcq_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE mcq_review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mcq logs"
  ON mcq_review_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Indexes for fast due-card queries ─────────────────────────────

CREATE INDEX mcq_states_user_due_idx ON mcq_states(user_id, due);
CREATE INDEX mcq_states_user_mcq_idx ON mcq_states(user_id, mcq_id);