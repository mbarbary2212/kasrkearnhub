

## Fix "Continue Where You Left Off" — Learning Tab Only, Deep Tracking

### Problem

Two issues are breaking the resume feature:

1. **Position gets overwritten**: When a student navigates from a chapter back to the module page, `ModulePage` calls `useTrackPosition()` with only module-level info (no chapter, no tab, no sub-tab). This **overwrites** the deep chapter position, so "Continue" loses the exact material.

2. **Missing `onActiveItemChange` on most content components**: Only LectureList, McqList, and OsceList report the active item. These components are missing it: EssayList, TrueFalseList, MatchingQuestionList, FlashcardsTab, GuidedExplanationList, ClinicalCaseList/AlgorithmList.

### Solution

**Principle**: Position tracking is for the Learning tab content ONLY. Navigating to other pages (module page, home, settings) should NOT overwrite the last learning position.

### Changes

**1. `src/pages/ModulePage.tsx` — Remove position tracking**
- Remove the `useTrackPosition()` call entirely. The module page is not a "learning" destination — it's a navigation hub. Visiting it should never overwrite a deep chapter position.

**2. `src/pages/ChapterPage.tsx` — Track only on Resources tab (learning content)**
- Guard the `useTrackPosition` call so it only fires when `activeSection === 'resources'` (the learning tab). When on Interactive, Practice, or Test Yourself, pass `null` values so position isn't overwritten with incomplete data — OR better, also track those sections since they contain learning materials too.
- Actually, re-reading the user's request: "this is stored only for the learning tab material" — so only track when `activeSection === 'resources'`. For other sections, skip tracking.

Wait — the user says "i want to remember exactly which tab the student last worked on. like which video or MCQ or socratic doc or flashcard he was working on" — MCQs are on the Practice tab, not Resources. Let me re-read: "the continue is linked to the learning tab activity only" — but MCQs are under Practice. I think "learning tab" means the entire chapter page learning experience (all four sections: Resources, Interactive, Practice, Test Yourself), not just the Resources sub-section. The key constraint is: don't overwrite when leaving the chapter page entirely.

**Revised approach**: Track position on ALL chapter page sections, but do NOT track on ModulePage/Home/YearPage.

**3. Add `onActiveItemChange` to missing content components**

Components that need the prop added:

| Component | How to track |
|---|---|
| `EssayList` | These render as scrollable lists (no pagination). Track when a student expands/interacts with an essay — or simply track the sub-tab name without specific item. |
| `TrueFalseList` | Same as EssayList — uses QuestionSessionShell? No, it doesn't. Renders as list. Track sub-tab. |
| `MatchingQuestionList` | Renders as list. Track sub-tab. |
| `FlashcardsTab` | Has card-by-card navigation. Add `onActiveItemChange` to report current card index. |
| `GuidedExplanationList` | Renders as list. Track sub-tab. |

For list-based components (EssayList, TrueFalseList, MatchingQuestionList, GuidedExplanationList), there's no single "active item" since they're all visible. We'll track at the **sub-tab level** — which is already happening via `currentSubTab` in the `useTrackPosition` call. The issue is only that the position gets overwritten when leaving.

For **FlashcardsTab**, which has card-by-card navigation, we should add `onActiveItemChange` to track which card the student is viewing.

### Final Plan

**File 1: `src/pages/ModulePage.tsx`**
- Remove the `useTrackPosition()` call and its import. This is the primary fix — stops module page from overwriting deep positions.

**File 2: `src/pages/ChapterPage.tsx`**
- No changes needed for the tracking call itself — it already tracks `activeSection`, `currentSubTab`, and `activeItem` correctly.
- Pass `onActiveItemChange={setActiveItem}` to EssayList, TrueFalseList, and MatchingQuestionList (for consistency, even though they're list-based — when they have QuestionSessionShell in future, it'll work).

**File 3: `src/components/study/FlashcardsTab.tsx`**
- Add `onActiveItemChange` prop to report the currently visible flashcard index/id when the student navigates between cards.

**File 4: `src/components/content/EssayList.tsx`**
- Add optional `onActiveItemChange` prop to interface (for future use with session shell).

**File 5: `src/components/content/TrueFalseList.tsx`**
- Add optional `onActiveItemChange` prop.

**File 6: `src/components/content/MatchingQuestionList.tsx`**
- Add optional `onActiveItemChange` prop.

### Summary

The **primary fix** is removing `useTrackPosition` from `ModulePage.tsx` — this single change stops the position from being overwritten. The secondary changes wire up `onActiveItemChange` to more components for deeper item-level tracking where possible (especially FlashcardsTab).

### Files Changed
- `src/pages/ModulePage.tsx` — remove `useTrackPosition` call
- `src/pages/ChapterPage.tsx` — pass `onActiveItemChange` to EssayList, TrueFalseList, MatchingQuestionList
- `src/components/study/FlashcardsTab.tsx` — add `onActiveItemChange` prop + report active card
- `src/components/content/EssayList.tsx` — add optional `onActiveItemChange` prop
- `src/components/content/TrueFalseList.tsx` — add optional `onActiveItemChange` prop
- `src/components/content/MatchingQuestionList.tsx` — add optional `onActiveItemChange` prop

