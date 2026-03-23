
-- Add Book 1 record to SUR-523 with display_order = 0
INSERT INTO public.module_books (module_id, book_label, display_order, chapter_prefix)
VALUES ('7f5167dd-b746-4ac6-94f3-109d637df861', 'Book 1', 0, 'Ch');

-- Shift existing Book 2 and Book 3 to display_order 1 and 2
UPDATE public.module_books
SET display_order = display_order + 1
WHERE module_id = '7f5167dd-b746-4ac6-94f3-109d637df861'
  AND book_label != 'Book 1';
