-- Phase 1: Add section_number column to sections table for easier reference during bulk imports
ALTER TABLE sections 
ADD COLUMN section_number INTEGER;

-- Auto-populate based on display_order for existing sections
UPDATE sections 
SET section_number = display_order 
WHERE section_number IS NULL;