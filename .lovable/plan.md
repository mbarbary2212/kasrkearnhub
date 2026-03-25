

## Fix: Dashboard Button Should Navigate Home When Inside a Module

### Problem
When a student is inside a module page and clicks "Dashboard" in the sidebar, it navigates to `/module/:id?section=dashboard` (the now-removed module dashboard) instead of going back to the Home page (`/`).

### Solution
In `src/components/layout/StudentSidebar.tsx`, update `handleNav` (~line 112-119): when the clicked item is "Dashboard" (sectionId `'dashboard'`), always navigate to `/` regardless of whether the user is on a module page.

### Change
```typescript
// src/components/layout/StudentSidebar.tsx — handleNav function
const handleNav = (item: NavItem) => {
  // Dashboard always goes home
  if (item.sectionId === 'dashboard') {
    navigate('/');
    return;
  }
  // Rest of existing logic unchanged...
};
```

### File
- **`src/components/layout/StudentSidebar.tsx`** — one small change in `handleNav`

