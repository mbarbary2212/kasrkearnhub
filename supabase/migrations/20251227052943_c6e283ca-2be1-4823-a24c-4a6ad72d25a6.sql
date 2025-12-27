-- Create a table to store book metadata (order, prefix label) for modules
CREATE TABLE public.module_books (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  book_label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  chapter_prefix text NOT NULL DEFAULT 'Ch',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(module_id, book_label)
);

-- Enable RLS
ALTER TABLE public.module_books ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view module_books" 
ON public.module_books 
FOR SELECT 
USING (true);

-- Platform admins can manage
CREATE POLICY "Platform admins can manage module_books" 
ON public.module_books 
FOR ALL 
USING (is_platform_admin_or_higher(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_module_books_module_id ON public.module_books(module_id);

-- Insert existing book labels from module_chapters as initial data
INSERT INTO public.module_books (module_id, book_label, display_order)
SELECT DISTINCT 
  module_id, 
  book_label,
  ROW_NUMBER() OVER (PARTITION BY module_id ORDER BY MIN(order_index)) - 1 as display_order
FROM public.module_chapters
WHERE book_label IS NOT NULL
GROUP BY module_id, book_label
ON CONFLICT DO NOTHING;