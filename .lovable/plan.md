

## Show Centered Card Instead of Toast for "Learning" Click

The `LearningEmptyState` page and `/learning` route already exist from your earlier approved plan. The only change needed is reverting the sidebar back to navigating to `/learning` instead of showing a toast.

### Change

**`src/components/layout/StudentSidebar.tsx`**
- In `handleNav`, change the `__learning__` case from `toast.info(...)` back to `navigate('/learning')`
- Remove the `toast` import from sonner (if no longer used elsewhere in the file)

One line change — the centered card page is already built and routed.

