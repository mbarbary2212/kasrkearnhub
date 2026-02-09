

# Redesign Admin Panel Navigation with Two-Level Tab System

## Problem

The current admin panel shows all 12 tabs in a single wrapping row with inline group labels and separators. This looks cluttered and disorganized, especially on smaller screens.

## Solution: Two-Level Navigation

Replace the flat tab list with a **two-level system**:

1. **Level 1** - Three visually prominent group buttons (System, Content, Messaging) displayed as styled cards/pills
2. **Level 2** - Sub-tabs within the selected group shown below

```text
+------------------+  +------------------+  +------------------+
|   SYSTEM         |  |   CONTENT        |  |   MESSAGING      |
|   Shield icon    |  |   BookOpen icon   |  |   Mail icon      |
+------------------+  +------------------+  +------------------+

  [ Users ]  [ Accounts ]  [ Activity Log ]  [ Platform Settings ]

  ┌──────────────────────────────────────────────────────┐
  │  Tab content here...                                  │
  └──────────────────────────────────────────────────────┘
```

### Level 1 Group Selector

Three side-by-side cards with:
- Icon, group name, and a subtle description
- Active group gets primary color border/highlight
- Inactive groups are muted with hover effect
- Responsive: stack vertically on mobile

### Level 2 Sub-Tabs

Standard `TabsList` showing only the tabs for the active group. Clean and uncluttered since each group has only 2-6 tabs.

## Technical Details

### File: `src/pages/AdminPage.tsx`

**Approach**: Use React state (`activeGroup`) to track the selected group (System/Content/Messaging), and render only the relevant `TabsTrigger` items based on it.

1. **Add state**: `const [activeGroup, setActiveGroup] = useState<'system' | 'content' | 'messaging'>('system')`
   - Initialize based on `defaultTab` by mapping each tab value to its group

2. **Replace the current `TabsList`** (lines 1306-1387) with:
   - A row of 3 group selector buttons (not part of the Radix Tabs, just styled buttons/cards)
   - Each button: icon + label + subtle count badge showing number of accessible tabs
   - Active group: `border-primary bg-primary/5 text-primary`
   - Inactive: `border-border bg-card hover:bg-muted/50`
   - Below: a `TabsList` that conditionally renders only the sub-tabs for the active group

3. **Group definitions** (with role-based filtering):
   - **System** (Shield icon): `users`, `accounts`, `activity-log`, `settings`
   - **Content** (BookOpen icon): `curriculum`, `pdf-library`, `ai-settings`, `help`, `question-analytics`, `integrity`
   - **Messaging** (MessageSquare icon): `announcements`, `inbox`

4. **Auto-switch group** when `defaultTab` from URL changes (e.g., notification deep links)

5. **All `TabsContent` blocks remain unchanged** -- they still use the same `value` props

### No other files need changes

Only `src/pages/AdminPage.tsx` is modified -- the `TabsContent` sections and all other logic stays identical.

