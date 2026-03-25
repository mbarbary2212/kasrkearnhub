

## Make "Select a Module" Message a Prominent Centered Empty State

Currently, when clicking "Learning" from the sidebar without a module context, a small toast notification appears. The user wants a large, clear, centered empty state instead.

### Changes

**`src/components/layout/StudentSidebar.tsx`**
- When Learning is clicked in global context, navigate to `/learning` (a new lightweight route) instead of showing a toast

**`src/pages/LearningEmptyState.tsx`** (new file)
- Full-page centered empty state with:
  - Large BookOpen icon in a muted circle
  - Bold heading: "Select a Module to Start Learning"
  - Subtitle: "Choose a module from the Dashboard to access chapters, resources, and practice materials."
  - A "Go to Dashboard" button that navigates to `/`
- Same visual style as `LearningHubEmptyState.tsx` but larger and page-level

**`src/App.tsx`** (or routing config)
- Add route `/learning` → `LearningEmptyState`

### Result
Clicking "Learning" without a module context shows a full centered page with a clear message and a button to navigate back to the dashboard, instead of a tiny dismissible toast.

