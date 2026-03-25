

## Redesign Dashboard as Module Overview + Fix Learning Behavior

### Current Problem
1. Dashboard (`/`) shows year cards — user wants it to show **module-level stats** for the student's preferred year
2. Learning sidebar item points to years page — should be inactive until a chapter is chosen, showing "Choose a module to start"
3. App should remember which year the student is in (already has `preferred_year_id` — just needs to use it)

### New Dashboard Design (`/`)

Replace the year-cards home page with a **module overview** for the student's preferred year:

```text
┌─────────────────────────────────────────┐
│  Welcome back, Mohamed                  │
│  Year 5 — General Surgery               │
│                                         │
│  [Continue where you left off →]        │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ SUR-523: Surgery 2     72% Ready │   │
│  │ ████████████████░░░░░░          │   │
│  ├──────────────────────────────────┤   │
│  │ SUR-524: Surgery 3     45% Ready │   │
│  │ ██████████░░░░░░░░░░░░          │   │
│  ├──────────────────────────────────┤   │
│  │ MED-501: Medicine 1    Not started│   │
│  │ ░░░░░░░░░░░░░░░░░░░░░          │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [Flashcards] [Achievements]            │
└─────────────────────────────────────────┘
```

- Fetch modules for the student's `preferred_year_id`
- Show each module as a card with name + readiness % + progress bar (reuse `useModuleReadinessBatch`)
- Clicking a module navigates to `/module/:id` (the detailed module dashboard)
- Keep: Continue button, Flashcards widget, Achievements widget, unread messages popover
- Remove: Year cards grid, "Academic Years" heading, "Explore App Structure" button
- If no `preferred_year_id` set, show a prompt to select a year (link to year selection)

### Learning Sidebar Behavior

When **not** on a chapter/topic page and **not** on a module page:
- Learning click shows a message: "Choose a module to start" instead of navigating to years
- Can be implemented as a toast or by navigating to a simple empty state page

When on a module page (but no chapter selected):
- Learning navigates to `?section=learning` which shows the chapter list — this is fine as-is

### Changes by File

**1. `src/pages/Home.tsx`**
- Replace `LoggedInHome` content: remove year cards, add module list with readiness bars
- Fetch `preferred_year_id` from profile, then `useModules(yearId)` + `useModuleReadinessBatch(moduleIds)`
- Each module card: name, readiness %, progress bar, click → `/module/:id`
- Keep: welcome section, continue button, flashcards, achievements, unread messages
- Add: "Change Year" link/button for switching (navigates to year selection or opens a small selector)

**2. `src/components/layout/StudentSidebar.tsx`**
- Change Learning `globalPath` behavior: when not on a module/chapter page, show a toast "Select a module first" or navigate to `/` with a hint, instead of going to years
- Remove `skipAutoLogin` logic from Learning item

**3. Keep existing auto-redirect logic** in `Home.tsx` — the `preferred_year_id` check already exists but currently redirects to `/year/:number`. Instead, just use it to load modules on the dashboard itself (no redirect needed).

### What Does NOT Change
- Module-level sidebar behavior (context-aware nav inside `/module/:id`)
- Chapter/topic sub-navigation under Learning
- Connect, Formative, Coach pages
- Admin/teacher views
- Mobile navigation

