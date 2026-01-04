-- Add page_count column to modules table for page-based workload calculation
-- This represents the total number of pages in the module's books/materials
ALTER TABLE public.modules 
ADD COLUMN page_count INTEGER NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.modules.page_count IS 'Total number of pages in the module books/materials. Used for auto-calculating workload level.';