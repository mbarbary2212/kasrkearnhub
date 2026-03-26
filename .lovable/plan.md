

## Show Progress Directly on the Content Pill

### The Problem
Progress stats only appear when opening the dropdown. The trigger pill just shows the tab name — no indication of how far along you are.

### Alternatives Considered

1. **"3/12" text after the label** — e.g., `MCQs · 3/12` — Simple, clear, but can get crowded on mobile with long labels.

2. **Background fill on the pill itself** — The pill's background fills left-to-right proportional to progress (like the dropdown items). Visually striking but might clash with the active-section color theming already on the pill.

3. **Small percentage badge appended** — e.g., `MCQs [75%]` as a tiny chip inside the pill. Clean but duplicates the dropdown info without adding much.

4. **"n/total" compact counter replacing the chevron area** — e.g., `📹 Videos  3/5 ▾` — The count sits right before the chevron. Minimal, scannable, and doesn't require extra visual elements.

### Recommendation: Option 4 — `n/total` counter on the pill

Best balance of information density and simplicity. Shows completion fraction (e.g., `3/12`) directly on the trigger, so you always know where you stand. For videos, show `videosCompleted/videosTotal`; for MCQs, `mcqCompleted/mcqTotal`, etc. Tabs without tracking show just the label (no counter).

### Changes

**File: `src/pages/ChapterPage.tsx` (lines 566-585)**

1. Move the `getTabProgress` helper **above** the trigger so it's accessible there
2. Add a helper `getTabCounts(tabId)` returning `{ completed, total }` from `chapterProgress`
3. In the `DropdownMenuTrigger` button, after the label and before the chevron, add:
   ```tsx
   {tabCounts.total > 0 && (
     <span className="text-[10px] font-semibold opacity-70 tabular-nums">
       {tabCounts.completed}/{tabCounts.total}
     </span>
   )}
   ```
4. Keep the existing progress-filled pills inside the dropdown items unchanged

**Mapping:**
- `lectures` → `videosCompleted / videosTotal`
- `mcqs` / `sba` → `mcqCompleted / mcqTotal`
- `essays` → `essayCompleted / essayTotal`
- `osce` → `osceCompleted / osceTotal`
- `cases` → `caseCompleted / caseTotal`
- `matching` → `matchingCompleted / matchingTotal`
- Others → no counter shown

### Result
```text
Before:  [📹 Videos ▾]
After:   [📹 Videos  2/5 ▾]
```

One file changed, ~15 lines added.

