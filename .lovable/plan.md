

## Add Section Warning to All Individual Content Form Modals

### Problem
When adding individual content items (flashcards, MCQs, essays, OSCE questions, etc.) to a chapter that has no sections, no warning message appears. The `SectionWarningBanner` currently only shows inside bulk upload modals.

### Solution
Add the `SectionWarningBanner` component to the top of every individual content form modal, so admins always see the reminder when no sections exist -- whether they are adding one item or doing a bulk upload.

### Files to Edit

| File | Change |
|---|---|
| `src/components/study/StudyResourceFormModal.tsx` | Add `SectionWarningBanner` at top of form body |
| `src/components/content/McqFormModal.tsx` | Add `SectionWarningBanner` at top of form body |
| `src/components/content/OsceFormModal.tsx` | Add `SectionWarningBanner` at top of form body |
| `src/components/content/TrueFalseFormModal.tsx` | Add `SectionWarningBanner` at top of form body |
| `src/components/content/MatchingQuestionFormModal.tsx` | Add `SectionWarningBanner` at top of form body |
| `src/components/content/EssayDetailModal.tsx` | Add `SectionWarningBanner` at top of form body (if it has a chapter/topic context) |
| `src/components/clinical-cases/ClinicalCaseFormModal.tsx` | Add `SectionWarningBanner` at top of form body |

### What Each Change Looks Like

For each modal, add this import and component near the top of the dialog content (inside the scrollable area):

```typescript
import { SectionWarningBanner } from '@/components/sections/SectionWarningBanner';

// Inside the dialog body, before the first form field:
<SectionWarningBanner chapterId={chapterId} topicId={topicId} />
```

The banner automatically hides itself when sections already exist, so it only appears when relevant -- no extra logic needed.

### Technical Notes

- The `SectionWarningBanner` component already handles all the logic internally (fetches sections, checks if any exist, returns `null` if they do).
- Each form modal already has `chapterId` and/or `topicId` props available, so no new props need to be threaded through.
- This is a small, safe change -- just importing and placing the banner component in 6-7 files.
