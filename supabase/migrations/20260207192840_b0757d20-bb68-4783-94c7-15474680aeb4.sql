-- Phase 1.1: Add topic_id to study_resources
ALTER TABLE study_resources 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

-- Phase 1.2: Make chapter_id nullable for topic-based resources
ALTER TABLE study_resources 
  ALTER COLUMN chapter_id DROP NOT NULL;

-- Phase 1.3: Add CHECK constraint for mutual exclusivity
ALTER TABLE study_resources 
  ADD CONSTRAINT study_resources_chapter_or_topic_check 
  CHECK (
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR 
    (chapter_id IS NULL AND topic_id IS NOT NULL)
  );

-- Phase 1.4: Add index for topic_id
CREATE INDEX idx_study_resources_topic_id ON study_resources(topic_id);

-- Phase 1.5: Add topic_id to question_attempts
ALTER TABLE question_attempts 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_question_attempts_topic_id ON question_attempts(topic_id);

-- Phase 1.6: Add topic_id to user_flashcard_stars
ALTER TABLE user_flashcard_stars 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_user_flashcard_stars_topic_id ON user_flashcard_stars(topic_id);

-- Phase 1.7: Data backfill - Fix study_resources where chapter_id is actually a topic_id
UPDATE study_resources sr
SET 
  topic_id = sr.chapter_id,
  chapter_id = NULL
WHERE EXISTS (
  SELECT 1 FROM topics t WHERE t.id = sr.chapter_id
);

-- Phase 1.8: Data backfill - Fix user_flashcard_stars where chapter_id is actually a topic_id
UPDATE user_flashcard_stars ufs
SET 
  topic_id = ufs.chapter_id,
  chapter_id = NULL
WHERE EXISTS (
  SELECT 1 FROM topics t WHERE t.id = ufs.chapter_id
);

-- Phase 1.9: Add RLS policies for topic-based study_resources
CREATE POLICY "Topic admins can manage topic study resources"
ON study_resources FOR ALL
USING (
  topic_id IN (
    SELECT topic_id FROM topic_admins WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM topics t
    JOIN modules m ON m.id = t.module_id
    JOIN module_admins ma ON ma.module_id = m.id
    WHERE t.id = study_resources.topic_id AND ma.user_id = auth.uid()
  )
);

-- Phase 1.10: Add RLS policies for topic-based question_attempts
CREATE POLICY "Users can manage their own topic question attempts"
ON question_attempts FOR ALL
USING (
  user_id = auth.uid()
);

-- Phase 1.11: Add RLS policies for topic-based user_flashcard_stars
CREATE POLICY "Users can manage their own topic flashcard stars"
ON user_flashcard_stars FOR ALL
USING (
  user_id = auth.uid()
);