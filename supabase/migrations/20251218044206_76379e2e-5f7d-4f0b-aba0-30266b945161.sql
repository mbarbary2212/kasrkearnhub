-- Add book_label column to module_chapters for grouping
ALTER TABLE public.module_chapters 
ADD COLUMN IF NOT EXISTS book_label text;