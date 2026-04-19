ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_online_count boolean NOT NULL DEFAULT true;