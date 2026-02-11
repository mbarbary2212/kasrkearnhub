

# Add Study Coach to Module Nav + Collapsible Chapter/Topic Rail

## Overview

Two changes:
1. Add **Study Coach** (study planning/progress) as a 4th nav item in the Module page, below Formative Assessment -- students only
2. Make the **chapter/topic left navigation rail** collapsible to icon-only on hover, maximizing content area

## 1. Study Coach in Module Navigation

Add "Study Coach" as a new section in the Module page nav rail, placed after Formative Assessment. Only visible to students (not admins). When selected, it renders the `LearningHubStudyPlan` component inline, automatically scoped to the current module and year.

```text
Module Page Left Rail:
+----------------------------+
| [book]  Learning           |
| [chat]  Connect            |
| [clip]  Formative Assess.  |
| [cal]   Study Coach        |  <-- NEW, students only
+----------------------------+
```

### File: `src/pages/ModulePage.tsx`
- Add `'coach'` to the `ModuleSection` type
- Add a 4th nav item (icon: `CalendarDays`) conditionally shown for non-admin users
- When `activeSection === 'coach'`, render `LearningHubStudyPlan` with the current module pre-selected
- Fetch year modules via a query so the Study Coach has the module list it needs
- The student won't need to manually select a module -- it's already in context

## 2. Collapsible Icon Rail on Chapter and Topic Pages

Convert the fixed 180px desktop left rail into a hover-expandable rail:

```text
Default (48px)                On Hover (180px)
+------+                     +-----------------------+
| [fo] |   -- hover -->      | [icon] Resources      |
| [gr] |                     | [icon] Practice       |
| [cl] |                     | [icon] Test Yourself  |
+------+                     +-----------------------+
```

- Defaults to collapsed (icon-only, 48px wide) to maximize content space
- Expands smoothly on mouse hover, revealing text labels
- Each icon gets a `Tooltip` when collapsed so users know what it is
- Mobile horizontal tabs remain unchanged
- No localStorage needed -- always starts collapsed, expands on hover

### Files:
- **`src/pages/ChapterPage.tsx`**: Add `isNavHovered` state, wrap desktop rail in `onMouseEnter`/`onMouseLeave`, conditionally show labels, add tooltips
- **`src/pages/TopicDetailPage.tsx`**: Same changes for feature parity

## Technical Details

### Module Page -- Study Coach Section

```text
New imports:
- CalendarDays from lucide-react
- LearningHubStudyPlan from dashboard components
- useModules hook (to get year's modules list)
- useAuthContext (already imported)

Type change:
  type ModuleSection = 'learning' | 'formative' | 'connect' | 'coach';

Nav item (conditional):
  Only pushed to sectionNav array when user is NOT admin/teacher

Rendering:
  {activeSection === 'coach' && actualModuleId && (
    <LearningHubStudyPlan
      moduleSelected={true}
      modules={yearModules}
      selectedYearName={year?.name || ''}
      selectedYearId={module?.year_id}
      selectedModuleId={actualModuleId}
    />
  )}
```

### Chapter/Topic Page -- Collapsible Rail

```text
State:
  const [isNavHovered, setIsNavHovered] = useState(false);

Desktop rail container:
  <div
    className="hidden md:block flex-shrink-0 transition-all duration-200"
    style={{ width: isNavHovered ? 180 : 48 }}
    onMouseEnter={() => setIsNavHovered(true)}
    onMouseLeave={() => setIsNavHovered(false)}
  >

Nav items:
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="...">
        <Icon className="w-4 h-4 flex-shrink-0" />
        {isNavHovered && <span className="whitespace-nowrap">{label}</span>}
      </button>
    </TooltipTrigger>
    {!isNavHovered && <TooltipContent side="right">{label}</TooltipContent>}
  </Tooltip>
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/ModulePage.tsx` | Add Study Coach as 4th nav item (students only), render `LearningHubStudyPlan` inline |
| `src/pages/ChapterPage.tsx` | Make desktop rail collapsible with hover-expand + tooltips |
| `src/pages/TopicDetailPage.tsx` | Same collapsible rail changes for parity |

### What stays the same
- **Ask Coach** (AI chat) button remains in chapter/topic headers -- no changes
- Mobile navigation tabs remain horizontal -- no changes
- Avatar menu Study Coach link stays as fallback for pages without a left rail
