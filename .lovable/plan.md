

## Fix: Study Resources Not Updating After Edit

### Problem
When you edit an algorithm (or any study resource), the "Resource updated" toast appears but the content doesn't change until you refresh the page. This happens because the component uses a local copy of the resources for drag-and-drop reordering, but only syncs that copy when resource IDs change -- not when content changes.

### Root Cause
In `StudyResourceTypeSection.tsx` (line 78), the sync condition only compares resource IDs:
```text
if (JSON.stringify(resources.map(r => r.id)) !== JSON.stringify(localResources.map(r => r.id))) {
    setLocalResources(resources);
}
```
When you edit content, the IDs stay the same, so the local state is never refreshed.

### Solution
Change the sync condition to also detect content changes. Replace the ID-only comparison with a comparison that includes meaningful fields (like `title` and `content`), or simply compare the full resource objects. This ensures edits are immediately reflected without needing a page refresh, while still preserving drag-and-drop reordering behavior.

### File to Change
- `src/components/study/StudyResourceTypeSection.tsx` -- update the sync comparison (line 78) to detect content/title changes, not just ID changes.

### No page refresh needed
This is a proper fix that keeps you inside the current view. No `window.location.reload()` will be added.

