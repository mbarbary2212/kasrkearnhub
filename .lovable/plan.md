

## Understanding Your Avatar Concern

You're right — the current implementation is overcomplicated. Here's what it should be:

- **One avatar per case**, chosen by the admin in the editor
- That avatar appears as a **static image** beside the history section (and on the intro screen)
- In **voice mode**, the same avatar gets a **glowing/pulsating ring** when audio is playing or being received — no animation, no talking head
- **One unified set of avatars** from the database — the 4 original ones are simply the first 4 rows, not a separate "fallback"

### Current Problems

1. **Dual system**: `EXAMINER_AVATARS` (static imports) exists as a fallback alongside `useExaminerAvatars()` (DB query). Both the editor and creator do `dynamicAvatars?.length ? dynamicAvatars : EXAMINER_AVATARS` — this shouldn't be needed.
2. **Seed URLs are placeholders**: The DB rows have `/examiner-avatars/examiner-1.png` (relative paths that don't resolve). The actual images are Vite-bundled assets in `src/assets/`.
3. **Avatar not shown in runner**: `StructuredCaseRunner` and `HistoryTakingSection` don't display the examiner avatar at all during the case.
4. **No voice visual feedback**: No pulsating ring exists yet.

### Plan

**1. Fix seed image URLs in the database**
- Update the 4 existing `examiner_avatars` rows to use the Supabase storage public URLs
- You need to upload the 4 images (`examiner-1.png` through `examiner-4.png`) to the `avatars` bucket in the Supabase dashboard, then run an UPDATE query with the resulting public URLs
- Alternatively: since these are bundled assets, we can keep using the Vite import paths — but that only works for these 4 and breaks the unified model. **Recommended**: upload to the bucket.

**2. Remove the static fallback layer**
- In `src/lib/examinerAvatars.ts`: remove `EXAMINER_AVATARS` array, remove `getExaminerAvatar()`, keep only `useExaminerAvatars()` hook
- In `CasePreviewEditor.tsx` and `StructuredCaseCreator.tsx`: remove the fallback logic (`dynamicAvatars?.length ? ... : EXAMINER_AVATARS`), use only the DB avatars
- In `VirtualPatientPage.tsx`: replace `getExaminerAvatar(avatarId)` with a query to `examiner_avatars` table by ID (or pass avatar data from the existing case query)
- Remove the static image imports from `src/assets/examiner-*.png` once they're uploaded to the bucket

**3. Show the avatar in the case runner**
- Pass `avatar_id` from `caseData` into `StructuredCaseRunner`
- Fetch the avatar's `image_url` and `name` from the DB (single row query by ID)
- Display the avatar image beside the history taking section (small circle, like the intro screen)
- Optionally show it in the progress header bar as a small icon

**4. Add pulsating ring for voice mode**
- Add a CSS animation class `animate-pulse-ring` — a soft glowing ring around the avatar circle
- In the history section, when `history_interaction_mode === 'voice'` and audio is actively playing/recording, apply the pulsating ring class to the avatar container
- When idle, show the avatar normally without the ring

### Files to Change

| File | Change |
|------|--------|
| `src/lib/examinerAvatars.ts` | Remove static array + `getExaminerAvatar`, keep `useExaminerAvatars` hook, add `useExaminerAvatarById(id)` hook |
| `src/components/clinical-cases/CasePreviewEditor.tsx` | Remove `EXAMINER_AVATARS` fallback |
| `src/components/clinical-cases/StructuredCaseCreator.tsx` | Remove `EXAMINER_AVATARS` fallback |
| `src/pages/VirtualPatientPage.tsx` | Replace `getExaminerAvatar` with DB hook |
| `src/components/clinical-cases/StructuredCaseRunner.tsx` | Add avatar display, pass `history_interaction_mode` to history section |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Add avatar prop + pulsating ring UI |
| `tailwind.config.ts` | Add `pulse-ring` keyframe/animation |

### Prerequisites

Before implementing, you need to **upload the 4 examiner images to the `avatars` storage bucket** via the Supabase dashboard, then provide me the public URLs so I can update the DB rows. Without real URLs, the unified system will show broken images.

