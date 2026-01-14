-- Make image_url optional for OSCE questions
ALTER TABLE osce_questions ALTER COLUMN image_url DROP NOT NULL;