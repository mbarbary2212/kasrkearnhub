-- Add workload_level column to modules table
-- Values: 'light', 'medium', 'heavy', 'heavy_plus' (nullable for auto-estimate)
ALTER TABLE public.modules 
ADD COLUMN workload_level TEXT NULL;

-- Add check constraint for valid values
ALTER TABLE public.modules 
ADD CONSTRAINT modules_workload_level_check 
CHECK (workload_level IS NULL OR workload_level IN ('light', 'medium', 'heavy', 'heavy_plus'));

-- Create index for filtering
CREATE INDEX idx_modules_workload_level ON public.modules(workload_level) WHERE workload_level IS NOT NULL;