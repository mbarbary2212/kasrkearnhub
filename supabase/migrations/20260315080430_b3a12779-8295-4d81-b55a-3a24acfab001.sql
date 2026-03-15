-- Backdate all pending scheduled reviews to yesterday for testing
UPDATE scheduled_reviews SET due_date = CURRENT_DATE - INTERVAL '1 day' WHERE is_completed = false;