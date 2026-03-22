

# Fix: Gate Add Button & Audio Upload Behind `canManageContent`

## Changes in `src/components/admin/AdminContentActions.tsx`

### 1. Audio Upload Dialog (line 790)
Change `{showAddControls && contentType === 'resource' && !hideAudio && (` to `{showAddControls && canManageContent && contentType === 'resource' && !hideAudio && (`

### 2. Add Button Dialog (line 798)
Change `{showAddControls && (` to `{showAddControls && canManageContent && (`

Both changes ensure the controls are hidden when the admin lacks permission for the chapter.

