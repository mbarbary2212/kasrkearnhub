

## Unified Student Dashboard — Merge Home + Year Page

### What you want
One single dashboard page after login. No extra step to "choose a module." The page has:
- **Left column (60%)**: Welcome greeting (time-based), "Continue where you stopped" card, module grid/list with progress bars (Cards/List toggle)
- **Right column (40%)**: Stats (streak, online, readiness), daily suggestions, flashcard due cards, MCQ/revision assignments, achievements

On mobile, these stack vertically (modules first, then sidebar widgets).

### Current state
- `Home.tsx` (`/`) — shows welcome, continue card, module list, flashcards/achievements
- `YearPage.tsx` (`/year/:id`) — shows module grid with images, Cards/List toggle, continue card
- `StudentDashboard.tsx` (`/dashboard`) — "Personal Study Coach" with module picker, stats, study plan

The user wants to **combine all three into the Home page** and eliminate the extra navigation steps.

### Changes

**1. Redesign `src/pages/Home.tsx` — `LoggedInHome` component**
- Switch from single-column to a two-column layout (`grid grid-cols-1 lg:grid-cols-5 gap-6`)
- **Left column (lg:col-span-3)**:
  - Time-based greeting ("Good morning/afternoon/evening, {name} 👋")
  - "Continue where you left off" card (existing)
  - Module section with Cards/List toggle (port from YearPage — grid with images, AspectRatio cards, readiness bars)
  - Year dropdown stays compact in the module section header
- **Right column (lg:col-span-2)**:
  - Stat cards (streak, online now, readiness) — reuse from ModuleDashboard
  - Flashcards due widget (existing, restyled)
  - Daily suggestions / study plan (from dashboard suggestions)
  - Achievements widget (existing)
  - Unread announcements badge (existing)

**2. Remove redundant navigation**
- When student clicks a module card, go directly to `/module/:id` (same as now)
- Remove auto-redirect logic to year page (already removed)
- The "Personal Study Coach" page (`/dashboard`) stays available via sidebar but is no longer the primary landing

**3. Port module grid from `YearPage.tsx`**
- Bring over the Cards/List toggle, AspectRatio module cards with images/gradients, and the responsive grid layout
- Keep `viewMode` persistence in localStorage

**4. Add right-sidebar widgets**
- Import `usePresence` for online count
- Import `useStudentDashboard` for suggestions and readiness (passing `selectedYearId`)
- Stat cards: streak, online, readiness percentage
- "Today's Suggestions" list (max 3 items)
- Flashcards and Achievements (move from bottom to right column)

### Layout sketch
```text
┌─────────────────────────────────┬──────────────────────┐
│  Good evening, John 👋          │  🔥 5 Day Streak     │
│                                 │  👥 12 Online         │
│  ┌─ Continue where you left ──┐ │  📊 68% Readiness    │
│  │  Chapter 3 — MCQs          │ │                      │
│  └────────────────────────────┘ │  ── Flashcards ──    │
│                                 │  3 cards due today →  │
│  Your Modules    [Cards][List]  │                      │
│  ┌────┐ ┌────┐ ┌────┐          │  ── Today's Plan ──  │
│  │Surg│ │Med │ │Peds│          │  📖 Read Ch.4         │
│  │ ▓▓░│ │▓▓▓│ │▓░░░│          │  🧪 MCQ Practice      │
│  └────┘ └────┘ └────┘          │                      │
│  ┌────┐ ┌────┐                 │  ── Achievements ──  │
│  │Anes│ │OBG │                 │  4/12 badges          │
│  │▓░░░│ │▓▓░░│                 │  [▓▓▓▓░░░░░░░░]      │
│  └────┘ └────┘                 │                      │
└─────────────────────────────────┴──────────────────────┘
```

### Files to modify
- **`src/pages/Home.tsx`** — Major rewrite of `LoggedInHome` to two-column layout with module grid and sidebar widgets
- No new files needed — all components/hooks already exist

### What stays the same
- Year selection dropdown (compact, in module section header)
- Module click → `/module/:id`
- YearPage.tsx remains accessible via direct URL but students won't need it
- StudentDashboard.tsx remains accessible via sidebar "Personal Study Coach"

