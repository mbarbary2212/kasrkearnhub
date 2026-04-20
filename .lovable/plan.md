

## Fix Open Discussions — show all modules + module picker + rescue orphans

### What you'll see after shipping

- `/connect/discussions` shows threads from **all** modules + previously-orphan posts (now labelled "General"), newest first.
- "New thread" button opens a modal with a **"Post to"** dropdown defaulting to "General (no specific module)" and listing every published module **grouped by year**.
- Author names + avatars appear on every thread (no emails).
- Existing orphan posts become visible automatically — zero data migration.
- From a specific module/chapter page, the dropdown stays hidden (context already known).

### Confirmed decisions (from your answers)

1. **NULL = General.** No new module row, no schema change, no NOT NULL constraint added. Orphans render as "General".
2. **Group dropdown by year** (Year 1 ▸ Anatomy, Year 1 ▸ Physiology, …). Future-proofs for 20+ modules.
3. **ContextGuide copy:** my call → I'll update it to: *"Start a discussion in any module — or pick General for cross-topic questions. Posts are visible to all students."* (rationale: current copy says "contact your module lead" which doesn't match this page's behavior; new copy reflects what the page actually does).

### Files changed (5 total)

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Add `get_thread_authors(thread_ids uuid[])` RPC. Pinned `search_path = public`, returns ONLY `user_id, full_name, avatar_url`, rejects unauthenticated callers, filters to `status='active'`. DOWN comment included. No table/policy changes. |
| `src/hooks/useDiscussions.ts` | Add `useAllOpenThreads()` (fetches `chapter_id IS NULL`, joins `modules`, calls RPC for authors). Add `useAllModulesForDropdown()` returning `id, name, year_id` joined with `years(id, number, name, display_order)` filtered to `is_published=true`. Refactor `useModuleThreads` and `useChapterThreads` to use the same `get_thread_authors` RPC instead of the direct `profiles` query (fixes a parallel "Unknown author" bug uncovered while reviewing). |
| `src/components/discussion/DiscussionSection.tsx` | When neither `moduleId` nor `chapterId` is passed → use `useAllOpenThreads()`. Pass `isOpenDiscussion` flag to `ThreadList`. |
| `src/components/discussion/ThreadList.tsx` | Accept and forward `isOpenDiscussion` prop to `CreateThreadModal`. Add module label rendering on each thread card: `thread.module?.name ?? "General"` shown as a small badge next to the author line. |
| `src/components/discussion/CreateThreadModal.tsx` | Accept `isOpenDiscussion` prop. When true, show "Post to" `Select` dropdown above the title field — **grouped by year** using `SelectGroup` + `SelectLabel` (Year 1, Year 2, …) with a "General" option pinned at the top. Default = General (`null`). Wire `effectiveModuleId = isOpenDiscussion ? selectedModuleId : moduleId` into the existing `useCreateThread` mutation. |
| `src/pages/DiscussionsPage.tsx` | Update `<ContextGuide>` `description` prop to the new copy above. |

### Migration SQL (the entire migration)

```sql
CREATE OR REPLACE FUNCTION public.get_thread_authors(thread_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT DISTINCT p.id, p.full_name, p.avatar_url
  FROM public.profiles p
  JOIN public.discussion_threads t ON t.created_by = p.id
  WHERE t.id = ANY(thread_ids) AND p.status = 'active';
END;
$$;
REVOKE ALL ON FUNCTION public.get_thread_authors(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_thread_authors(uuid[]) TO authenticated;
-- DOWN: DROP FUNCTION IF EXISTS public.get_thread_authors(uuid[]);
```

No tables touched. No RLS policies touched. No data migrated.

### Security checklist (will be confirmed in delivery message)

- SECURITY DEFINER + pinned `search_path = public`
- Rejects unauthenticated callers
- Returns ONLY `user_id, full_name, avatar_url` — no email, phone, status, banned_until, created_at, updated_at
- Joins through `discussion_threads` so caller can't query arbitrary user IDs
- Filters non-active profiles
- No `CREATE/DROP POLICY` on `profiles`, `discussion_threads`, `discussion_messages`
- `useAllOpenThreads` / `useAllModulesForDropdown` return types contain no email
- `useAllModulesForDropdown` filters `is_published = true`
- `thread_ids` is a parameterized array — no string concat
- Existing client-side profanity check in `useCreateThread` left intact

### Out of scope (not changing)

- RLS policies on `discussion_threads`, `discussion_messages`, `profiles`, `modules`
- The `useCreateThread` mutation logic
- Any column constraints on `discussion_threads`
- Existing orphan rows (rescued by display logic, not by mutation)
- PR4+ work — won't start until you confirm this PR works

### Acceptance tests after shipping (run with non-admin student)

1. Visit `/connect/discussions` → see mix of module-tagged + "General" threads, newest first, with author names.
2. New thread → dropdown defaults to "General" → submit → appears in list as "General".
3. New thread → pick a specific module → appears here AND on that module's discussions tab.
4. Open a module's Discussions tab → "New thread" → dropdown is hidden (context known).
5. DevTools → Network → inspect `get_thread_authors` response → no email/phone/status fields.
6. Previously-orphan threads visible under "General" with author names.

