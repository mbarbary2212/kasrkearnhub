-- First migration: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';