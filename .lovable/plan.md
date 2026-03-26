

## Add Per-Tab Progress Indicators to the Content Dropdown

### Concept

Each dropdown menu item already shows a count badge (e.g., "12"). Instead, we'll **replace the count badge with a progress-filled pill** — the pill background fills with color proportional to completion %, and shows a small "75%" text. This gives instant visual feedback per sub-tab without extra UI clutter.

```text
Dropdown item layout:
┌─────────────────────────────────────┐
│ 📹 Videos              [▓▓▓░ 60%]  │
│ 🃏 Flashcards           [░░░░  0%]  │
│ ❓ MCQs                [▓▓▓▓ 80%]  │
│ 📝 Short Answer        [▓░░░ 25%]  │
└─────────────────────────────────────┘
```

The pill has a background gradient fill (left-to-right) showing progress, with the percentage text overlaid. Color: section theme color at low opacity for the fill, stronger for text.

### Data: Expose Per-Type Progress

**File: `src/hooks/useChapterProgress.ts`**

1. Expand `ChapterProgressData` to include per-type breakdowns already available from the RPC:
   - `mcqCompleted`, `mcqTotal`, `essayCompleted`, `essayTotal`, `osceCompleted`, `osceTotal`, `caseCompleted`, `caseTotal`, `matchingCompleted`, `matchingTotal`
2. Return these from the hook (they're already in the RPC response, just not surfaced)

### UI: Progress Pills in Dropdown Items

**File: `src/pages/ChapterPage.tsx`**

1. Build a mapping from tab ID → progress percentage:
   - `lectures` → `videoProgress` (already available)
   - `mcqs` / `sba` → `mcqCompleted/mcqTotal` (MCQs and SBA share the same DB type)
   - `essays` → `essayCompleted/essayTotal`
   - `osce` → `osceCompleted/osceTotal`
   - `cases` → `caseCompleted/caseTotal`
   - `matching` → `matchingCompleted/matchingTotal`
   - `flashcards`, `mind_maps`, `reference_materials`, `clinical_tools`, `guided_explanations`, `pathways`, `true_false`, `practical`, `images` → 0% (no tracking yet)

2. Replace the `<Badge>` count in each `DropdownMenuItem` with a **progress pill**:
   ```tsx
   <div className="relative h-5 w-14 rounded-full bg-muted overflow-hidden text-[10px]">
     <div 
       className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
       style={{ width: `${progress}%` }}
     />
     <span className="relative z-10 flex items-center justify-center h-full font-semibold">
       {progress}%
     </span>
   </div>
   ```

3. Also show the progress fill on the **trigger button itself** for the currently active sub-tab — a subtle background gradient indicating its progress.

### Files Changed
- `src/hooks/useChapterProgress.ts` — surface per-type counts
- `src/pages/ChapterPage.tsx` — progress pills in dropdown items

