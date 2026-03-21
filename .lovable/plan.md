

# Updated Plan: Fill-in (Cloze) Mode — Reveal-Based (Anki Style)

## Summary
Modify only `src/components/study/FlashcardClozeMode.tsx` to change the cloze interaction from "type the answer" to "reveal the answer" — matching Anki's behavior. No other files are touched.

## Cloze Card Behavior

**Before reveal:**
- Parse `content.cloze_text` with `/\{\{c\d+::(.+?)\}\}/g`
- Display sentence with each match replaced by a styled pill: `[...]` in muted color (`bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-sm`)
- Show a "Reveal Answer" button with `Eye` icon below the sentence
- No text input field

**After reveal:**
- Re-render sentence with answers shown as green highlighted pills: `bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-semibold`
- "Reveal Answer" button disappears
- If `content.extra` exists, show it automatically (no toggle) styled as: `border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm rounded-r-md` with a small "CLINICAL NOTE" label in `text-xs uppercase text-amber-600 tracking-wide font-medium`
- Show `FSRSRatingButtons` with `visible={true}`

**Non-cloze fallback:**
- If `card_type !== 'cloze'` or no `cloze_text`, render as normal flip card (Question front / Answer back with flip animation), identical to `FlashcardsStudentView`

**After rating:** advance to next card, reset `revealed` to false

## Keyboard Shortcuts
- `Space` or `Enter` → reveal answer (if not yet revealed)
- `ArrowLeft` / `ArrowRight` → prev / next card
- `M` → toggle star/mark

## Preserved Features (copied from FlashcardsStudentView)
- Same props interface (`cards`, `markedIds`, `onToggleMark`, `availableTopics`, `chapterId`, `topicId`)
- Topic selector collapsible, shuffle, star/mark, reset
- `useCardState` for FSRS state
- `FlashcardProgressBar`
- `useSwipeGesture` for mobile swipe
- `useFullscreen` with floating exit button
- Navigation prev/next buttons at bottom
- Transition animation between cards

## File Modified

| File | Change |
|------|--------|
| `src/components/study/FlashcardClozeMode.tsx` | Rewrite — reveal-based cloze interaction replacing type-based |

