

# Fix Build Errors & Ensure Auto-Detect Sections Works

## Problem
Multiple build errors across 4 files prevent edge function deployment, blocking the auto-detect sections feature. The `extract-pdf-sections` function logic is already correct (chunked base64, PDF download from storage, AI extraction).

## Build Errors to Fix

### 1. `supabase/functions/approve-ai-content/index.ts` (line 550)
`topicId` is never declared. The code extracts `chapterId` from `inputMetadata` but not `topicId`.

**Fix**: Add `const topicId = (inputMetadata.topic_id as string | null | undefined) ?? null;` next to the `chapterId` declaration (around line 188).

### 2. `supabase/functions/sync-pdf-text/index.ts` (line 176)
`err` is typed as `unknown`. Need to cast before accessing `.message`.

**Fix**: Change `err.message` to `(err instanceof Error ? err.message : "Internal server error")`.

### 3. `supabase/functions/youtube-upload/index.ts` (multiple lines)
Type inference failures because `createClient` is untyped. The Supabase client returns `never` for table operations.

**Fix**: Add `as any` type assertions on the Supabase client parameter and on query results where needed, or type the `createClient` call.

### 4. `src/components/content/LectureList.tsx` (line 317)
`youtube_video_id` exists on the local `Lecture` interface but NOT on `LecturesAdminTable`'s `Lecture` interface. The `onDelete` callback parameter is typed by the table's interface.

**Fix**: Add `youtube_video_id?: string | null` to the `Lecture` interface in `LecturesAdminTable.tsx`.

## After Fixes
- All build errors resolved
- Edge functions deploy successfully
- `extract-pdf-sections` already has correct logic: download PDF from storage via `admin_documents.chapter_id` link, chunked base64 encode, send to Gemini/Claude
- Auto-detect button in SectionsManager calls the function correctly

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/approve-ai-content/index.ts` | Add `topicId` variable from `inputMetadata` |
| `supabase/functions/sync-pdf-text/index.ts` | Fix `unknown` type error on catch block |
| `supabase/functions/youtube-upload/index.ts` | Fix type inference issues with Supabase client |
| `src/components/content/LecturesAdminTable.tsx` | Add `youtube_video_id` to Lecture interface |

