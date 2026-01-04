-- Add new content types for comprehensive progress tracking
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'osce';
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'case_scenario';
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'matching';