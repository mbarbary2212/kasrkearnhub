-- BMS-103 Data Migration: Create individual lecture chapters from video titles
-- This is IDEMPOTENT - safe to run multiple times
-- Uses module-wide unique order_index to avoid constraint violations

DO $$
DECLARE
  bms103_module_id UUID := '77bc6e57-25d5-4396-8d42-2e69a7441316';
  dept_record RECORD;
  lecture_record RECORD;
  new_chapter_id UUID;
  global_order_index INT;
  placeholder_chapter_id UUID;
BEGIN
  -- Get the max order_index across ALL chapters in this module (for unique constraint)
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO global_order_index
  FROM module_chapters
  WHERE module_id = bms103_module_id;

  -- Loop through each department (book_label) in BMS-103
  FOR dept_record IN 
    SELECT DISTINCT book_label 
    FROM module_chapters 
    WHERE module_id = bms103_module_id
  LOOP
    -- Find the placeholder "Lecture List" chapter for this department
    SELECT id INTO placeholder_chapter_id
    FROM module_chapters
    WHERE module_id = bms103_module_id
      AND book_label = dept_record.book_label
      AND title = 'Lecture List';
    
    -- If no placeholder exists, skip this department
    IF placeholder_chapter_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- For each lecture (video) under this placeholder, create a chapter if not exists
    FOR lecture_record IN 
      SELECT id, title, display_order
      FROM lectures
      WHERE chapter_id = placeholder_chapter_id
        AND is_deleted = false
      ORDER BY display_order
    LOOP
      -- Check if a chapter with this title already exists for this dept
      SELECT id INTO new_chapter_id
      FROM module_chapters
      WHERE module_id = bms103_module_id
        AND book_label = dept_record.book_label
        AND title = lecture_record.title;
      
      -- If chapter doesn't exist, create it
      IF new_chapter_id IS NULL THEN
        INSERT INTO module_chapters (
          module_id,
          book_label,
          chapter_number,
          title,
          order_index
        ) VALUES (
          bms103_module_id,
          dept_record.book_label,
          global_order_index,  -- Use as chapter number too
          lecture_record.title,
          global_order_index   -- Unique across the module
        )
        RETURNING id INTO new_chapter_id;
        
        global_order_index := global_order_index + 1;
      END IF;
      
      -- Move the lecture to its matching chapter
      UPDATE lectures
      SET chapter_id = new_chapter_id
      WHERE id = lecture_record.id;
    END LOOP;
    
    -- Check if placeholder chapter has any remaining content
    IF NOT EXISTS (
      SELECT 1 FROM lectures WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM resources WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM mcqs WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM essays WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM practicals WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM flashcards WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
      UNION ALL
      SELECT 1 FROM matching_questions WHERE chapter_id = placeholder_chapter_id AND is_deleted = false
    ) THEN
      -- Delete the empty placeholder chapter
      DELETE FROM module_chapters WHERE id = placeholder_chapter_id;
    END IF;
  END LOOP;
END $$;