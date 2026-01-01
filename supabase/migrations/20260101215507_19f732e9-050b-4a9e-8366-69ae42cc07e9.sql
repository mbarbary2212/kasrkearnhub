-- Insert chapters for each department with unique chapter_number per module
INSERT INTO module_chapters (module_id, book_label, chapter_number, title, order_index)
VALUES
  ('77bc6e57-25d5-4396-8d42-2e69a7441316', 'Anatomy', 101, 'Lecture List', 1),
  ('77bc6e57-25d5-4396-8d42-2e69a7441316', 'Physiology', 102, 'Lecture List', 2),
  ('77bc6e57-25d5-4396-8d42-2e69a7441316', 'Histology', 103, 'Lecture List', 3),
  ('77bc6e57-25d5-4396-8d42-2e69a7441316', 'Biochemistry', 104, 'Lecture List', 4);