
-- Rename Book 1 to match the naming convention
UPDATE public.module_books
SET book_label = 'General surgery Book 1'
WHERE module_id = '7f5167dd-b746-4ac6-94f3-109d637df861'
  AND book_label = 'Book 1';
