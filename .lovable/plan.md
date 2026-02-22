

## Fix Scrolling in "Add Resource" Dialog

### The Problem

The "Add Resource" modal in `AdminContentActions.tsx` has a form with multiple fields (title, description, file upload, external URL, section selector, save button) that exceeds the viewport height. The outer `DialogContent` uses `overflow-hidden` and `max-h-[90vh]` (per project convention), but the inner content container has no scrolling, so the bottom fields (Section, Save button) are cut off and unreachable.

### The Fix

Wrap the form content area (line 637) in a scrollable div following the project's established pattern of using native `overflow-y-auto` instead of the ScrollArea component (per the project's scroll hierarchy convention).

### Technical Change

**File: `src/components/admin/AdminContentActions.tsx`**

Change the form container at line 637 from:
```
<div className="space-y-4 pt-4">
```
To:
```
<div className="space-y-4 pt-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
```

This gives the form body a max height that accounts for the dialog header and padding, and enables vertical scrolling when content overflows.

### Files to Modify

| File | Change |
|---|---|
| `src/components/admin/AdminContentActions.tsx` | Add `max-h-[calc(90vh-8rem)] overflow-y-auto` to the form container div (line 637) |

