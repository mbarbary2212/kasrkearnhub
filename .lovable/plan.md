

# Step 1: Database Migration

Mohamed, here's the migration for Step 1 — two changes only, no code files touched.

## Changes

### 1. Create `examiner_avatars` table
- `id SERIAL PRIMARY KEY`, `name TEXT NOT NULL`, `image_url TEXT NOT NULL`, `uploaded_by UUID` (FK to auth.users), `is_active BOOLEAN DEFAULT true`, `display_order INT DEFAULT 0`, `created_at TIMESTAMPTZ DEFAULT now()`
- RLS enabled:
  - **SELECT** for authenticated: `is_active = true` (all users see active avatars)
  - **ALL** for platform_admin+: uses `is_platform_admin_or_higher(auth.uid())`
- Seed 4 rows matching current hardcoded avatars (pointing to `osce-images` bucket paths — the actual image files will need uploading separately, or we reference the Vite-bundled asset paths for now)

### 2. Add `history_interaction_mode` column to `virtual_patient_cases`
- `TEXT DEFAULT 'text'` with a CHECK constraint: `history_interaction_mode IN ('voice', 'text')`
- All existing rows automatically get `'text'`

### SQL Migration

```sql
-- 1. examiner_avatars table
CREATE TABLE public.examiner_avatars (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examiner_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active avatars"
  ON public.examiner_avatars FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can manage avatars"
  ON public.examiner_avatars FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Seed with existing 4 avatars
INSERT INTO public.examiner_avatars (id, name, image_url, display_order) VALUES
  (1, 'Dr. Sarah', '/examiner-avatars/examiner-1.png', 1),
  (2, 'Dr. Laylah', '/examiner-avatars/examiner-2.png', 2),
  (3, 'Dr. Omar', '/examiner-avatars/examiner-3.png', 3),
  (4, 'Dr. Hani', '/examiner-avatars/examiner-4.png', 4);

-- 2. Add history_interaction_mode to virtual_patient_cases
ALTER TABLE public.virtual_patient_cases
  ADD COLUMN history_interaction_mode TEXT NOT NULL DEFAULT 'text'
  CONSTRAINT chk_history_interaction_mode CHECK (history_interaction_mode IN ('voice', 'text'));
```

**Note on seed image_url**: The seed URLs are placeholders. Once the avatar management UI is built (Step 3), platform admins will upload real images to the `avatars` storage bucket and the URLs will point there. For now the app continues using the Vite-bundled assets via `getExaminerAvatar()` — no code changes in this step.

