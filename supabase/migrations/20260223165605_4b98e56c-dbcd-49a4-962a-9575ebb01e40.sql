
-- Add document_subtype and rich_content columns to resources table
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS document_subtype text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS rich_content text;

-- Add index for filtering by document_subtype
CREATE INDEX IF NOT EXISTS idx_resources_document_subtype ON public.resources (document_subtype) WHERE document_subtype IS NOT NULL;
