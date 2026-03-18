

## Plan: Customize My View — Admin Pin Controls + Student Preferences

### Overview
Global admin setting to pin specific tab types (always visible to students), plus a student-facing bottom sheet to hide/show non-pinned tabs. Applies to both `ChapterPage` and `TopicDetailPage`.

---

### Step 1 — Database Migration

```sql
-- Table 1: Global admin pin settings
CREATE TABLE public.module_pin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.module_pin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Anyone can read pin settings"
  ON public.module_pin_settings FOR SELECT TO authenticated USING (true);
-- Only platform admins+ can modify
CREATE POLICY "Admins can manage pin settings"
  ON public.module_pin_settings FOR ALL TO authenticated
  USING (public.is_platform_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_platform_admin_or_higher(auth.uid()));

-- Table 2: Per-student visibility preferences
CREATE TABLE public.student_module_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_key)
);
ALTER TABLE public.student_module_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.student_module_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed 16 module keys
INSERT INTO public.module_pin_settings (module_key) VALUES
  ('videos'),('flashcards'),('visual_resources'),('socrates'),
  ('reference_materials'),('clinical_tools'),('cases'),('pathways'),
  ('mcq'),('sba'),('true_false'),('short_answer'),
  ('osce'),('practical'),('matching'),('image_questions');
```

### Step 2 — Hook: `src/hooks/useCustomizeView.ts` (NEW)

- **`MODULE_KEY_TO_TAB_ID`** mapping: `videos→lectures`, `visual_resources→mind_maps`, `socrates→guided_explanations`, `short_answer→essays`, `image_questions→images`; rest map 1:1
- **`useModulePinSettings()`**: query `module_pin_settings`, `staleTime: 0`, `refetchOnMount: true`
- **`useStudentModulePreferences()`**: query `student_module_preferences` for `auth.uid()`
- **`useUpsertPinSetting()`**: upsert mutation; `onSuccess` invalidates both `['module-pin-settings']` and `['student-module-preferences']`
- **`useUpsertStudentPreference()`**: upsert mutation; `onSuccess` invalidates `['student-module-preferences']`
- **`filterByCustomPrefs(tabs, pinSettings, studentPrefs)`**: keeps a tab if its mapped `module_key` is pinned OR not hidden

### Step 3 — Admin Component: `src/components/admin/ModulePinSettings.tsx` (NEW)

Collapsible card placed in `PlatformSettingsTab` (AdminPage.tsx, between the "Hide Empty Practice Tabs" card and the grid row). Contains:
- Info banner explaining pinned modules
- 3 groups (Resources / Interactive / Test) each listing module names with a toggle + gold 📌 icon when on
- Uses `useModulePinSettings()` + `useUpsertPinSetting()`

### Step 4 — Student Component: `src/components/student/CustomizeViewSheet.tsx` (NEW)

A `Drawer` (mobile) / `Sheet` (desktop) with:
- Title: "Customize Your View"
- Subtitle about pinned items
- 3 grouped sections with toggles per tab
- Pinned items: toggle disabled, gold 📌, "(Required by instructor)"
- Non-pinned: freely toggleable, upserts to `student_module_preferences`

### Step 5 — Integration

**`src/pages/AdminPage.tsx`** — Import and render `<ModulePinSettings />` inside `PlatformSettingsTab`, after the Hide Empty Tabs card (line ~190).

**`src/pages/ChapterPage.tsx`** — For non-admin students:
- Add a "Customize View" button (SlidersHorizontal icon) near the section nav
- Open `CustomizeViewSheet` on click
- After `filterTabsForStudent`, apply `filterByCustomPrefs` to `resourcesTabs`, `interactiveTabs`, `practiceTabs`
- If all tabs in a section are hidden, show fallback message with button to reopen the sheet

**`src/pages/TopicDetailPage.tsx`** — Same filtering integration as ChapterPage.

---

### Files Summary

| File | Action |
|------|--------|
| DB migration | New tables + seed |
| `src/hooks/useCustomizeView.ts` | **Create** |
| `src/components/admin/ModulePinSettings.tsx` | **Create** |
| `src/components/student/CustomizeViewSheet.tsx` | **Create** |
| `src/pages/AdminPage.tsx` | Add `ModulePinSettings` to `PlatformSettingsTab` |
| `src/pages/ChapterPage.tsx` | Add customize button + sheet + filtering |
| `src/pages/TopicDetailPage.tsx` | Add same filtering logic |

### Not Modified
Edge functions, question/case runners, flashcard runners, voice/TTS, routing, auth, `tabConfig.ts`, `FlashcardsTab.tsx`, `Home.tsx`, `App.tsx`

