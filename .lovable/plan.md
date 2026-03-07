

## Plan: Avatar Upload Fix + Case Leaderboard

### Current State
- **No size limit** on the `avatars` bucket — any file size is accepted
- **Storage RLS** only allows uploads to `{auth.uid()}/` folders, but examiner avatars upload to `examiner-avatars/` — this is why your upload failed
- **No leaderboard** exists yet

### What We'll Build

#### 1. Fix Avatar Upload Storage Policies
New migration to:
- Add INSERT/UPDATE/DELETE policies on `storage.objects` for `examiner-avatars/` folder, restricted to `super_admin` and `platform_admin` roles
- Set bucket `file_size_limit` to 2MB and `allowed_mime_types` to `image/png, image/jpeg, image/webp`
- Add client-side validation in `ExaminerAvatarsCard` (2MB max, image types only, clear error messages)

#### 2. Create Leaderboard RPC
New `get_case_leaderboard(p_case_id uuid)` security definer function:
- Aggregates best score per student from `virtual_patient_attempts`
- Joins `profiles` for display name (first name + last initial for privacy)
- Excludes admin/teacher roles via `user_roles` check
- Returns top 10 ranked by best score, then earliest completion
- Bypasses RLS safely via `SECURITY DEFINER`

#### 3. Frontend: Leaderboard Hook + UI
- **New hook**: `src/hooks/useCaseLeaderboard.ts` — calls the RPC
- **New component**: `src/components/clinical-cases/CaseLeaderboard.tsx` — card with trophy/medal icons for top 3, ranked list with score badges
- **Integration**: Add to `VirtualPatientPage.tsx` intro screen, below the Start button

### Files

| File | Change |
|------|--------|
| New migration | Storage policies for `examiner-avatars/`, bucket limits |
| New migration | `get_case_leaderboard` RPC function |
| `ExaminerAvatarsCard.tsx` | Client-side file size/type validation |
| New: `src/hooks/useCaseLeaderboard.ts` | Hook wrapping the RPC |
| New: `src/components/clinical-cases/CaseLeaderboard.tsx` | Leaderboard card component |
| `src/pages/VirtualPatientPage.tsx` | Add leaderboard to intro screen |

