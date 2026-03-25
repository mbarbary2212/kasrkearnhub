

# Track Exact Material in "Continue Where You Left Off"

## Problem
Currently, position tracking only saves: module → chapter → tab → sub-tab (e.g., MCQs). It does NOT record the specific item being viewed (e.g., "Question 5 of 20" or "Video: Cardiac Anatomy Lecture").

## Approach
Use a **callback pattern**: child components report their active item up to ChapterPage, which merges it into `activity_position` for `useTrackPosition`.

## What Gets Tracked

| Content Type | Item Info Recorded |
|---|---|
| **MCQs / SBA** | Question index (e.g., "Question 5 of 20"), question ID |
| **OSCE** | Question index, question ID |
| **Videos (Lectures)** | Selected lecture title, lecture ID |
| **Flashcards** | Current card index if in study mode |
| **Essays** | Active essay title, essay ID |

## Implementation Steps

### 1. Add `onActiveItemChange` callback to content components

**`QuestionSessionShell.tsx`** — Already tracks `currentIndex`. Add an optional `onActiveItemChange` prop. Call it whenever `currentIndex` changes:
```typescript
onActiveItemChange?: (info: { item_id: string; item_label: string; item_index: number }) => void;
```
Fire on mount and whenever `currentIndex` changes via `useEffect`.

**`LectureList.tsx`** — Already tracks `selectedLecture`. Add similar callback, fired when a lecture is selected/opened.

**`OsceList.tsx`** — Uses `QuestionSessionShell` internally, so covered by the same change.

### 2. Wire callbacks through McqList and OsceList

`McqList` and `OsceList` render `QuestionSessionShell`. They'll accept and forward the `onActiveItemChange` prop.

### 3. ChapterPage: Collect item info and merge into `useTrackPosition`

Add state: `const [activeItem, setActiveItem] = useState<{item_id, item_label, item_index} | null>(null)`.

Pass `onActiveItemChange={setActiveItem}` to `LectureList`, `McqList`, `OsceList`, etc.

Clear `activeItem` when sub-tab changes.

Update the `useTrackPosition` call:
```typescript
activity_position: currentSubTab ? {
  sub_tab: currentSubTab,
  ...(activeItem && {
    item_id: activeItem.item_id,
    item_label: activeItem.item_label,
    item_index: activeItem.item_index,
  }),
} : null,
```

### 4. Update `buildResumeUrl` in `useLastPosition.ts`

Already handles `sub_tab` in the URL. Add `item_index` as an additional query parameter so the session can scroll/jump to that question on resume.

### 5. Update `buildResumeLabel` in `useLastPosition.ts`

Already has logic for `item_label` — just needs the data to flow through. The existing code at the bottom already does:
```typescript
if (ap.item_label && typeof ap.item_label === 'string') {
  parts.push(ap.item_label);
}
```

### 6. Restore item position on page load

In `QuestionSessionShell`, read `item_index` from URL search params and use it as the initial `currentIndex`. In `LectureList`, auto-select the lecture matching `item_id` from the URL.

## Files Changed
- `src/components/question-session/QuestionSessionShell.tsx` — add callback + restore from URL
- `src/components/content/McqList.tsx` — forward callback
- `src/components/content/OsceList.tsx` — forward callback  
- `src/components/content/LectureList.tsx` — add callback + restore from URL
- `src/pages/ChapterPage.tsx` — collect active item, pass to useTrackPosition
- `src/hooks/useLastPosition.ts` — add item_index to resume URL

