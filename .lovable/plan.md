

## Three fixes for the Blueprint page

### Issue 1 — Sticky table header
The `<thead>` in `ChapterBlueprintSubtab.tsx` (line 390-398) has no sticky positioning. When you scroll down, "Chapter / MCQ / Recall / Case / OSCE / Long Case / Paraclinical" disappears.

**Fix**: Add `sticky top-0 z-10 bg-background` to the `<thead>` element so it stays pinned while the table body scrolls.

**File**: `src/components/admin/blueprint/ChapterBlueprintSubtab.tsx`

---

### Issue 2 — Changes not visible until refresh
This is a **query key mismatch** bug. When you click a cell and set a level (H/A/L), the mutation in `useChapterBlueprintConfig.ts` invalidates:
```
['chapter-blueprint-config', variables.module_id]
```

But the table in `ChapterBlueprintSubtab.tsx` fetches configs using a **different** query key:
```
['chapter-blueprint-config-multi', ...configModuleIds]
```

Since the keys don't match, the table never refetches after a change. You have to manually refresh the page.

**Fix**: Update the `onSuccess` callbacks in both `useUpsertChapterBlueprintConfig` and `useDeleteChapterBlueprintConfig` to also invalidate the `-multi` variant:
```typescript
qc.invalidateQueries({ queryKey: ['chapter-blueprint-config'] }); // invalidate all variants
```

**File**: `src/hooks/useChapterBlueprintConfig.ts`

---

### Issue 3 — Tab resets on refresh/return
`AdminPage.tsx` reads the `?tab=` URL param on load, but when you navigate within tabs, the URL doesn't update. So refreshing or returning drops you back to the default tab.

**Fix**: 
- When `activeTab` changes, update the URL search param (`?tab=blueprint`) using `setSearchParams` so the browser remembers it.
- This way, refreshing or navigating back restores the last active tab automatically — no localStorage needed, the URL is the source of truth.

**File**: `src/pages/AdminPage.tsx`

---

### Summary of changes

| File | Change |
|------|--------|
| `ChapterBlueprintSubtab.tsx` | Add `sticky top-0 z-10 bg-background` to `<thead>` |
| `useChapterBlueprintConfig.ts` | Broaden query invalidation to cover all `chapter-blueprint-config` variants |
| `AdminPage.tsx` | Sync `activeTab` to URL `?tab=` param on change |

Three small, targeted fixes. No new files needed.

