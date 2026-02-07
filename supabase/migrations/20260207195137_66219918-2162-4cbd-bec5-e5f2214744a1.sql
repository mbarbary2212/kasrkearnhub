-- Add topic_id to inquiries table
ALTER TABLE inquiries 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_inquiries_topic_id ON inquiries(topic_id);

-- Add topic_id to item_feedback table
ALTER TABLE item_feedback 
  ADD COLUMN topic_id UUID REFERENCES topics(id);

CREATE INDEX idx_item_feedback_topic_id ON item_feedback(topic_id);

-- Add RLS policy for topic admins to view inquiries for their topics
CREATE POLICY "Topic admins can view inquiries for their topics" 
ON inquiries FOR SELECT
USING (
  topic_id IN (
    SELECT t.id FROM topics t
    JOIN topic_admins ta ON ta.topic_id = t.id
    WHERE ta.user_id = auth.uid()
  )
);

-- Add RLS policy for topic admins to view item_feedback for their topics
CREATE POLICY "Topic admins can view item_feedback for their topics" 
ON item_feedback FOR SELECT
USING (
  topic_id IN (
    SELECT t.id FROM topics t
    JOIN topic_admins ta ON ta.topic_id = t.id
    WHERE ta.user_id = auth.uid()
  )
);