# Admin Learning Page — Card View with Year Tabs & Edit Permissions

## What Changes

Redesign `AdminLearningPage.tsx` from a flat list into a visually rich, card-based layout with clear year separation and edit/view-only distinction.

## Key Behaviors

1. **All years visible** — fetch ALL modules (not just managed ones) so admins can browse everything for comparison. use the same layout like the student ui. 
2. **Visual edit permission** — modules the admin can edit get full-color cards with an "Edit" action; modules they can only view get a muted/dimmed card with a "View Only" label and a lock icon
3. **Super/Platform admins** — all modules shown as editable (no lock icons)
4. **Year grouping** — each year is a visually distinct section with its `color` used as an accent (e.g., colored left border or header bar), year name prominent
5. **Module cards** — grid of cards (2-3 columns on desktop, 1 on mobile) showing slug badge, module name, and edit/view status. use the same layout like the student ui. including the tabs and list choice.
6. dont change the student uo 

## Data Changes

### `useModuleAdmin.ts` — new hook `useAllModulesWithPermissions`

- Fetches ALL modules from `modules` table (all years)
- Also fetches the user's `module_admins` entries to build a `Set<moduleId>` of editable IDs
- For super/platform admins, marks everything editable
- Returns `{ modules, editableIds: Set<string>, isLoading }`

No other hooks or DB changes needed.

## UI Structure (AdminLearningPage.tsx)

```text
┌─────────────────────────────────────────────┐
│  📖 Content Management                      │
│  Browse all modules. Your modules are       │
│  highlighted.                               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Year 1 (blue accent) ──── 9 modules ─┐ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────┐ │ │
│  │  │ BMS-103  │  │ CPS-104  │  │ ...  │ │ │
│  │  │ Biomed.. │  │ Cardio.. │  │      │ │ │
│  │  │ [Edit]   │  │ 🔒 View │  │      │ │ │
│  │  └──────────┘  └──────────┘  └──────┘ │ │
│  └───────────────────────────────────────-┘ │
│                                             │
│  ┌─ Year 2 (green accent) ── 10 modules ─┐ │
│  │  ...                                   │ │
│  └───────────────────────────────────────-┘ │
└─────────────────────────────────────────────┘
```

### Editable module card

- Full opacity, normal background
- Slug as a small badge
- Module name (truncated)
- Clickable — navigates to `/module/{id}`
- Subtle arrow or "Manage" indicator

### View-only module card

- Reduced opacity (~60%) or muted border
- Lock icon + "View Only" text
- Still clickable for browsing (navigates to module page, which already guards editing via `useIsModuleAdmin`)
- Visually distinct from editable cards

### Year section

- Uses the year's `color` field (e.g. `bg-blue-500`) as a left-border accent or header background strip
- Year name + module count badge
- Collapsible (optional, nice-to-have) — default expanded

## Files


| File                              | Action                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| `src/hooks/useModuleAdmin.ts`     | Add `useAllModulesWithPermissions` hook                             |
| `src/pages/AdminLearningPage.tsx` | Full rewrite — card grid grouped by year with permission indicators |


## What Does NOT Change

- Student UI — untouched
- Module/Chapter/Topic pages — untouched
- Database schema — no changes
- Admin Panel tools — untouched
- Existing `useUserManagedModules` hook — kept (used elsewhere)