

## Refined Learning Tab: Inline Guidance (Combined Plan)

### What This Does
Replace modal/popup patterns with inline visual guidance when the student clicks the Learning tab, ensuring a smooth, uninterrupted flow across mobile, tablet, and desktop.

---

### Current State
- **Sidebar & Mobile Nav**: Learning click already navigates to `lastPosition` or falls back to Dashboard (`/`). No inline guidance shown on arrival.
- **Dashboard**: Shows `LearningHubEmptyState` — a dashed card with "Select a module to begin" and a button. Functional but visually weak.
- **Module Page**: Shows chapter list but no prominent "choose a chapter" action card.
- **`/learning` route**: A standalone empty-state page that is now redundant (sidebar/mobile already bypass it).

---

### Changes (4 files modified, 1 deleted)

#### 1. Navigation State Flag (Sidebar + Mobile Nav)
**Files**: `StudentSidebar.tsx`, `MobileBottomNav.tsx`

When Learning click falls back to Dashboard (no `lastPosition`):
- Change `navigate('/')` to `navigate('/', { state: { fromLearning: true } })`
- This tells the Dashboard the user explicitly wanted to learn, triggering the highlight behavior.

#### 2. Dashboard Inline Banner + Auto-Highlight
**File**: `StudentDashboard.tsx`

- Replace `LearningHubEmptyState` (dashed card) with a prominent **inline banner** at the top of the content area:
  - Primary-tinted background with gradient
  - BookOpen icon, title **"Start Learning"**, message **"Select a module to begin"**
  - "Select Module" button that opens the dropdown
- When `location.state?.fromLearning` is true:
  - Auto-scroll to the module selector
  - Add a brief pulse/ring animation to draw attention
  - Clear the state after animation

#### 3. Module Page — "Choose a Chapter" Action Card
**File**: `ModulePage.tsx` (or `ModuleLearningTab.tsx`)

When on a module page with no chapter selected (the learning tab content):
- Add an inline action card above the chapter list:
  - BookOpen icon, title **"Start Learning"**, message **"Choose a chapter to begin"**
  - Primary "Choose a Chapter" button that scrolls to the chapter list
- Add subtle visual emphasis to the chapter list: `ring-2 ring-primary/20` glow effect
- Auto-scroll the chapter list into view

#### 4. Remove `/learning` Route
**Files**: `App.tsx`, `LearningEmptyState.tsx`

- Delete `src/pages/LearningEmptyState.tsx`
- Remove the `/learning` route from `App.tsx`
- The sidebar/mobile nav already handle this flow — no orphan page needed

#### 5. Rework `LearningHubEmptyState` Component
**File**: `LearningHubEmptyState.tsx`

- Transform from a dashed card into the new prominent inline banner component
- Accept optional `highlight` prop to trigger pulse animation when arriving from Learning tab click

---

### Behavior Summary (All Devices)

| Scenario | Action |
|----------|--------|
| No module selected | Navigate to Dashboard → show inline "Start Learning" banner, highlight module selector |
| Module selected, no chapter | Stay on module page → show "Choose a Chapter" action card, glow chapter list |
| Chapter selected | Normal behavior — open submenu (desktop) or navigate to resources (mobile) |

### Files
| File | Action |
|------|--------|
| `src/components/layout/StudentSidebar.tsx` | Add `{ state: { fromLearning: true } }` to fallback navigate |
| `src/components/layout/MobileBottomNav.tsx` | Same state flag on fallback navigate |
| `src/components/dashboard/StudentDashboard.tsx` | Read `fromLearning` state, auto-highlight module selector |
| `src/components/dashboard/LearningHubEmptyState.tsx` | Rework into prominent inline banner with optional highlight prop |
| `src/pages/ModulePage.tsx` | Add "Choose a Chapter" action card + chapter list glow |
| `src/pages/LearningEmptyState.tsx` | Delete |
| `src/App.tsx` | Remove `/learning` route |

