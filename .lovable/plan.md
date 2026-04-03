

# Three Bug Fixes: MCQ State Reset, Visual Resources Count, Infographic Scaling

## Fix 1: MCQ answer state not resetting on question change

**Problem**: `McqAnswerArea` initializes `selectedKey` from `previousSelectedKey` via `useState`, but React does not re-run `useState` initializers when props change. When navigating to a new question, the previous selection persists visually.

**Solution**: Add a `key` prop to `McqAnswerArea` in `QuestionSessionShell.tsx` using the current question's ID. This forces React to remount the component and reset state cleanly.

**File**: `src/components/question-session/QuestionSessionShell.tsx`
- Add `key={currentQuestion.id}` to the `<McqAnswerArea>` element (~line 247)

---

## Fix 2: Visual Resources tab shows combined count instead of per-subtab counts

**Problem**: The "Visual Resources" tab in the section dropdown shows a single combined count (mind maps + infographics + AI maps). The user expects to see how many items are in each subtab.

**Solution**: Change the count format to show separate counts like "Mind Maps 1 · Infographics 11" or pass separate counts so the VisualResourcesSection subtab badges are the primary source of truth. The simplest fix: update the tab count in `ChapterPage.tsx` and `TopicDetailPage.tsx` to show the true total of individual items (sum of all), and within `VisualResourcesSection.tsx` the subtab badges already show per-type counts — those are correct.

Actually, looking again at the screenshot: "Visual Resources 1/2" — the "1/2" means the dropdown shows it as count from the section filter. The real issue is that the parent tab count lumps mind maps + infographics into one number, but the subtabs inside show their own counts. The user wants the parent tab count to reflect the actual total material count (sum of items inside both subtabs), not the number of subtab categories.

**Revised approach**: The parent count in `createResourceTabs` for `mind_maps` should equal `mindMaps.length + publishedAIMaps.length + infographics.length` — which it already does in ChapterPage. The subtab badges inside `VisualResourcesSection` already show per-type counts. So the counts ARE correct but may be confusing because the parent shows total while subtabs show breakdowns. The user's request: "make the total count the material inside both tabs or better add separate counts in each." The subtab badges already exist. The fix is to make the parent tab badge show separate counts like `1 / 11` (mind maps / infographics).

**Files**:
- `src/config/tabConfig.ts` — no change needed
- `src/pages/ChapterPage.tsx` (~line 574-577) — split `mind_maps` count into `mind_maps_count` and `infographics_count`, pass both
- `src/pages/TopicDetailPage.tsx` (~line 324) — same split
- Wherever the section dropdown renders the "Visual Resources" tab badge — render as two separate counts like "1 · 11" or "Maps 1 | Infographics 11"

Alternatively, the simplest approach: keep the single parent count as a true total (it already is), but ensure the subtab badges within `VisualResourcesSection` are clearly visible. Since the user explicitly wants "separate counts in each 1/1, 2/5 for example" — update the parent tab badge to show the breakdown format.

**Implementation**: Extend `TabWithCount` to support an optional `subcounts` field, and render dual badges for the Visual Resources tab. Or simply change the badge rendering for `mind_maps` tab to show `"{mindMaps} / {infographics}"` format.

**Files to modify**:
- `src/pages/ChapterPage.tsx` — pass separate mind_maps and infographics counts
- `src/pages/TopicDetailPage.tsx` — same
- The component that renders section tabs/dropdown — update badge to show split count for visual resources

---

## Fix 3: Infographics open at 100% zoom instead of fit-to-screen

**Problem**: In `InfographicViewer.tsx`, the fullscreen dialog initializes `zoom` to `1` (100%) which may be too large for high-resolution infographics, causing them to overflow the viewport.

**Solution**: Start at a "fit to screen" zoom level. Use `object-fit: contain` with `max-width: 100%` and `max-height: 75vh` (which already exists) but set initial zoom to a value that ensures the image fits. The simplest approach: set initial zoom to `1` but change the default rendering to use CSS `object-fit: contain` with `width: 100%` and `height: auto` constrained by the container, rather than applying a `transform: scale()`. Only apply scale transform when the user explicitly zooms.

**File**: `src/components/study/InfographicViewer.tsx`
- Change the default image rendering (~line 222-235): remove `transform: scale(1)` at default zoom, use `max-width: 100%; max-height: 75vh; object-fit: contain; width: auto; height: auto` as the base style
- When zoom !== 1 (user has zoomed), apply `transform: scale(zoom)` 
- Reset button label could say "Fit" instead of just being a reset icon

---

## Summary of changes

| File | Change |
|------|--------|
| `QuestionSessionShell.tsx` | Add `key={currentQuestion.id}` to `McqAnswerArea` |
| `ChapterPage.tsx` | Pass separate mind_maps and infographics counts |
| `TopicDetailPage.tsx` | Pass separate mind_maps and infographics counts |
| `tabConfig.ts` or section dropdown component | Support dual count display for Visual Resources |
| `InfographicViewer.tsx` | Default to fit-to-screen, only scale on explicit zoom |

