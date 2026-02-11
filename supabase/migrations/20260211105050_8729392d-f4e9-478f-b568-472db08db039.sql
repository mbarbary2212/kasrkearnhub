ALTER TABLE module_chapters
  DROP CONSTRAINT module_chapters_module_id_chapter_number_key;

ALTER TABLE module_chapters
  ADD CONSTRAINT module_chapters_module_book_chapter_unique
  UNIQUE (module_id, book_label, chapter_number);