
-- BMS-103 Cleanup: Delete placeholder videos
-- IDEMPOTENT: Safe to run multiple times
-- Only deletes videos where title matches chapter title AND video_url is NULL

DELETE FROM lectures
WHERE id IN (
  SELECT l.id
  FROM lectures l
  JOIN module_chapters mc ON l.chapter_id = mc.id
  WHERE mc.module_id = '77bc6e57-25d5-4396-8d42-2e69a7441316'
    AND l.is_deleted = false
    AND l.title = mc.title
    AND (l.video_url IS NULL OR l.video_url = '' OR l.video_url LIKE '%placeholder%')
);
