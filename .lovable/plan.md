

# Two-Mode Admin View System

## Overview

This plan implements two distinct capabilities with clear separation:

| Mode | Who | Access | Data | Writes |
|------|-----|--------|------|--------|
| **Mode A: Real Impersonation** | Super Admin only | Student picker modal | Real student data | Blocked (Support Mode) |
| **Mode B: Preview Student UI** | All admins | Toggle switch | Demo/empty data | Blocked (Preview Mode) |

---

## Architecture

```text
+-------------------------------------------------------------------+
|                     Admin View Modes                               |
+-------------------------------------------------------------------+
|  SUPER ADMIN                    |  OTHER ADMINS                   |
|  ─────────────                  |  ────────────                   |
|  Menu shows BOTH options:       |  Menu shows only:               |
|  • "Preview Student UI" toggle  |  • "Preview Student UI" toggle  |
|  • "Impersonate Student..."     |                                 |
|                                 |                                 |
|  IMPERSONATION (Mode A):        |  PREVIEW (Mode B):              |
|  • Selects real student         |  • No student selection         |
|  • effectiveUserId = studentId  |  • effectiveUserId = user.id    |
|  • Sees REAL student data       |  • Sees DEMO/empty data         |
|  • Amber banner with timer      |  • Blue banner (Preview Only)   |
|  • 30-min session, logged       |  • Instant toggle, no logging   |
|  • isSupportMode = true         |  • isSupportMode = true         |
+-------------------------------------------------------------------+
```

---

## Implementation Details

### 1. Update `useEffectiveUser.ts`

Add new state and functions for Preview Mode:

```typescript
interface EffectiveUserState {
  // ... existing fields ...
  
  // NEW: Preview Student UI Mode (for all admins)
  isPreviewStudentUI: boolean;
  togglePreviewStudentUI: () => void;
  
  // Updated: isSupportMode = isImpersonating || isPreviewStudentUI
  isSupportMode: boolean;
}
```

**Key Logic:**
- Add `useState` for `isPreviewStudentUI` (default: false)
- `togglePreviewStudentUI()` flips the local state
- `effectiveUserId` stays as `user.id` in preview mode (NOT null)
- `isSupportMode = isImpersonating || isPreviewStudentUI` (blocks writes in both modes)

### 2. Restrict Edge Functions to Super Admin Only

**Files:** `start-impersonation/index.ts` and `list-students-for-impersonation/index.ts`

Change role validation from:
```typescript
const adminRoles = ['super_admin', 'platform_admin', ...];
```

To:
```typescript
if (callerRole?.role !== 'super_admin') {
  return new Response(
    JSON.stringify({ error: 'Only Super Admins can impersonate students' }),
    { status: 403, ... }
  );
}
```

### 3. Update `MainLayout.tsx` Dropdown

**For Super Admin - show BOTH options:**
```tsx
{isSuperAdmin && (
  <>
    <DropdownMenuItem onClick={togglePreviewStudentUI}>
      <Eye className="mr-2 h-4 w-4" />
      {isPreviewStudentUI ? 'Exit Student Preview' : 'Preview Student UI'}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setImpersonateModalOpen(true)}>
      <UserCheck className="mr-2 h-4 w-4" />
      Impersonate Student...
    </DropdownMenuItem>
  </>
)}

{/* Other admins - show only Preview toggle */}
{isAdmin && !isSuperAdmin && (
  <DropdownMenuItem onClick={togglePreviewStudentUI}>
    <Eye className="mr-2 h-4 w-4" />
    {isPreviewStudentUI ? 'Exit Student Preview' : 'Preview Student UI'}
  </DropdownMenuItem>
)}
```

**Only render ImpersonateStudentModal for super admin:**
```tsx
{isSuperAdmin && (
  <ImpersonateStudentModal 
    open={impersonateModalOpen} 
    onOpenChange={setImpersonateModalOpen} 
  />
)}
```

### 4. Create Distinct Banners

**Update `ImpersonationBanner.tsx` to handle both modes:**

```tsx
export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    isPreviewStudentUI,
    effectiveUserName, 
    expiresAt, 
    endImpersonation,
    togglePreviewStudentUI,
  } = useEffectiveUser();

  // Priority: Impersonation > Preview
  if (isImpersonating) {
    return (
      <div className="bg-amber-500/95 ...">
        <AlertTriangle />
        Viewing as: {displayName} (View-Only Mode)
        <Clock /> {timeRemaining}
        <Button onClick={endImpersonation}>Exit</Button>
      </div>
    );
  }

  if (isPreviewStudentUI) {
    return (
      <div className="bg-blue-500/95 ...">
        <Eye />
        Student UI Preview - Demo Mode
        <Button onClick={togglePreviewStudentUI}>Exit Preview</Button>
      </div>
    );
  }

  return null;
}
```

### 5. Update Student Data Hooks

All hooks need to detect Preview Mode and return demo/empty data:

**Pattern for each hook:**
```typescript
export function useStudentDashboard(filters?: DashboardFilters) {
  const { effectiveUserId, isPreviewStudentUI, isImpersonating } = useEffectiveUser();

  return useQuery({
    queryKey: ['student-dashboard', effectiveUserId, isPreviewStudentUI],
    queryFn: async (): Promise<DashboardData> => {
      // Preview mode (non-super admin): return demo data
      if (isPreviewStudentUI && !isImpersonating) {
        return getDemoDashboard(); // New function with sample data
      }
      
      // Real data fetch
      if (!effectiveUserId) {
        return getEmptyDashboard();
      }
      // ... existing fetch logic
    },
    enabled: !!effectiveUserId,
  });
}
```

**Hooks to update:**
- `useStudentDashboard.ts`
- `useChapterProgress.ts`
- `useQuestionAttempts.ts`
- `useBadges.ts`
- `useNeedsPractice.ts`
- `useTestProgress.ts`
- `useVideoProgress.ts`
- `useAudioProgress.ts`

### 6. Demo Data Functions

Create demo/sample data that gives admins a realistic preview:

```typescript
function getDemoDashboard(): DashboardData {
  return {
    examReadiness: 65,
    coveragePercent: 42,
    coverageCompleted: 21,
    coverageTotal: 50,
    chaptersStarted: 5,
    chaptersTotal: 12,
    studyStreak: 7,
    consistencyScore: 72,
    // ... sample data showing what the UI looks like
    chapters: [
      { id: 'demo-1', title: 'Sample Chapter 1', status: 'completed', progress: 100, ... },
      { id: 'demo-2', title: 'Sample Chapter 2', status: 'in_progress', progress: 45, ... },
      { id: 'demo-3', title: 'Sample Chapter 3', status: 'not_started', progress: 0, ... },
    ],
    insights: [
      { type: 'strong', label: 'Sample Strong Area', detail: '100% coverage' },
      { type: 'attention', label: 'Sample Weak Area', detail: '45% coverage' },
    ],
    suggestions: [
      { type: 'read', title: 'Sample Lecture', estimatedMinutes: 15 },
    ],
  };
}
```

### 7. Write-Blocking for Both Modes

All mutation hooks already check `isSupportMode`. Since we're updating:
```typescript
isSupportMode = isImpersonating || isPreviewStudentUI
```

All existing write-blocking code will work for both modes automatically.

The toast message should differentiate:
```typescript
if (isSupportMode) {
  const message = isImpersonating 
    ? 'View-only mode: Progress is not saved during impersonation'
    : 'Preview mode: Progress is not saved in student preview';
  toast.info(message);
  return;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useEffectiveUser.ts` | Add `isPreviewStudentUI`, `togglePreviewStudentUI()`, update `isSupportMode` |
| `src/components/layout/MainLayout.tsx` | Split menu items by role, add preview toggle, restrict modal to super_admin |
| `src/components/admin/ImpersonationBanner.tsx` | Handle both modes with distinct styles |
| `supabase/functions/start-impersonation/index.ts` | Restrict to `super_admin` only |
| `supabase/functions/list-students-for-impersonation/index.ts` | Restrict to `super_admin` only |
| `src/hooks/useStudentDashboard.ts` | Add demo data for preview mode |
| `src/hooks/useChapterProgress.ts` | Add demo data for preview mode |
| `src/hooks/useQuestionAttempts.ts` | Add demo data for preview mode |
| `src/hooks/useBadges.ts` | Add demo data for preview mode |
| `src/hooks/useNeedsPractice.ts` | Add demo data for preview mode |
| `src/hooks/useTestProgress.ts` | Add demo data for preview mode |
| `src/hooks/useVideoProgress.ts` | Add demo data for preview mode |
| `src/hooks/useAudioProgress.ts` | Add demo data for preview mode |

---

## User Experience Summary

### Super Admin Menu
```text
Avatar Dropdown
├── Home
├── Account
├── ──────────
├── Feedback & Inquiries
├── Activity Log
├── Preview Student UI    ← Toggle (blue banner)
├── Impersonate Student...  ← Opens modal (amber banner)
├── Admin Panel
├── ──────────
└── Sign Out
```

### Other Admin Menu
```text
Avatar Dropdown
├── Home
├── Account
├── ──────────
├── Feedback & Inquiries
├── Activity Log
├── Preview Student UI    ← Toggle only
├── Admin Panel
├── ──────────
└── Sign Out
```

---

## Security Summary

- **Super Admin**: Full student impersonation with session logging, 30-min expiry
- **Other Admins**: UI preview only, no access to any real student data
- Edge functions enforce `super_admin` role check server-side
- All progress writes blocked in both modes via `isSupportMode`
- Impersonation sessions are audit-logged; preview mode has no server interaction

