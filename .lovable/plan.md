

# Add Section & Subtab Breadcrumb to Header

## Problem
When a user (student or admin) is inside a chapter viewing e.g. Practice > MCQs, the header breadcrumb stops at the chapter name. There's no indication of the current section or subtab.

## Solution
Extend the existing breadcrumb in `MainLayout.tsx` to append the active **section** and **subtab** as icon-only breadcrumb segments (with tooltips for labels). Read `section` and `subtab` from URL search params since both `ChapterPage` and `TopicDetailPage` already use `?section=practice&subtab=mcqs`.

## Changes

### 1. `src/components/layout/MainLayout.tsx`

After the chapter breadcrumb (line ~207), add two more breadcrumb segments:

**Section segment** — read `searchParams.get('section')`, map to icon:
- `resources` → `BookOpen`
- `interactive` → `Sparkles` (or `Stethoscope`)
- `practice` → `PenTool`
- `test` → `ClipboardCheck`

**Subtab segment** — read `searchParams.get('subtab')`, map to icon using existing `RESOURCES_TABS`, `INTERACTIVE_TABS`, `PRACTICE_TABS` from `tabConfig.ts` (each already has an `icon` field and `id` matching the subtab value).

Both rendered as icon-only with `Tooltip` showing the label. Only shown when on a chapter/topic page (i.e., when `currentChapter` exists and `section` param is present).

```text
Logo > Year 5 > SUR-523 > Wound Healing > 🔄 Practice > ❓ MCQs
                                            (icon)        (icon)
```

### Implementation detail
- Import `useSearchParams` (already available via react-router-dom)
- Import tab configs from `@/config/tabConfig` to look up icon by subtab ID
- Use `TooltipProvider` + `Tooltip` (already imported in this file) for hover labels
- Icons render at `h-4 w-4` with `text-muted-foreground`, active subtab in `text-foreground`
- Section icon is clickable (navigates to `?section=X`), subtab is not (already there)

### Section icon map (hardcoded, 4 entries)
```ts
const SECTION_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  resources:   { icon: BookOpen,       label: 'Resources' },
  interactive: { icon: Stethoscope,    label: 'Interactive' },
  practice:    { icon: PenTool,        label: 'Practice' },
  test:        { icon: ClipboardCheck, label: 'Test Yourself' },
};
```

### Subtab icon lookup
```ts
const allTabs = [...RESOURCES_TABS, ...INTERACTIVE_TABS, ...PRACTICE_TABS];
const subtabConfig = allTabs.find(t => t.id === subtab);
// Use subtabConfig.icon and subtabConfig.label
```

## Files

| File | Change |
|------|--------|
| `MainLayout.tsx` | Add section + subtab icon breadcrumbs after chapter, ~20 lines |

No other files modified. Purely additive.

