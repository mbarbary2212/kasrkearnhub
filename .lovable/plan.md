

# Combined Plan: Fix Auth Flow + Add Resend & Filtering to Account Management

## Summary

Three improvements to implement:
1. **Email link direct navigation** - Users go straight to password form (not landing page)
2. **Resend button in "All Requests"** - Add resend option for approved access requests  
3. **Search and sortable headers** - Add search by name and clickable column headers for sorting

---

## Part 1: Fix Email Link Direct Navigation

### Problem

When users click the password reset/invite link, they see "You're signed in" with a button to change password, instead of going directly to the password form.

### Root Cause

In `Auth.tsx` line 95, the `onAuthStateChange` listener ignores the event type:

```typescript
// Current code (line 95)
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user || null);
  // Missing: handle PASSWORD_RECOVERY event
});
```

When Supabase processes a password reset token, it fires `PASSWORD_RECOVERY` event - but the code doesn't react to it.

### Solution

Update `onAuthStateChange` to detect `PASSWORD_RECOVERY` event and automatically switch to password form:

**File: `src/pages/Auth.tsx`** (Lines 94-98)

```typescript
// Listen for auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user || null);
  
  // When user clicks password reset/invite link, Supabase fires PASSWORD_RECOVERY
  // Automatically show password change form
  if (event === 'PASSWORD_RECOVERY') {
    setAuthView('change-password');
  }
});
```

---

## Part 2: Add Resend Button to "All Requests" Tab

### Current State

The "All Requests" tab (lines 249-327 in AccountsTab.tsx) only has a Delete button for each row. The Resend functionality already exists in `EmailInvitationsTable.tsx`.

### Solution

Add a Resend button for **approved** requests only:

| Status | Actions Shown |
|--------|---------------|
| Pending | Delete only |
| Approved | Resend + Delete |
| Rejected | Delete only |

### Implementation

**File: `src/components/admin/AccountsTab.tsx`**

1. Import `useResendInvitation` and `RefreshCw` icon
2. Add `resendingId` state to track loading
3. Add `handleResendRequest` function that maps `request_type` to role:
   - `faculty` → `teacher`
   - `student` → `student`
4. In table Actions column (line 305-314), add Resend button for approved requests

```typescript
// New handler
const handleResendRequest = async (request: AccessRequest) => {
  setResendingId(request.id);
  try {
    await resendInvitation.mutateAsync({
      email: request.email,
      full_name: request.full_name,
      role: request.request_type === 'faculty' ? 'teacher' : 'student',
    });
  } finally {
    setResendingId(null);
  }
};

// In Actions column
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-1">
    {request.status === 'approved' && (
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={() => handleResendRequest(request)}
        disabled={resendingId === request.id}
      >
        {resendingId === request.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        <span className="ml-1 hidden sm:inline">Resend</span>
      </Button>
    )}
    <Button
      size="sm"
      variant="ghost"
      type="button"
      onClick={() => deleteRequest.mutate(request.id)}
      disabled={deleteRequest.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

---

## Part 3: Search and Sortable Column Headers

### Design

Add a search input above each table, and make Status/Date headers clickable for sorting:

```text
┌────────────────────────────────────────────────────────────────────┐
│  🔍 [Search by name...                                        ]    │
├────────────────────────────────────────────────────────────────────┤
│ Name   │ Email  │ Type │ Status ↓ │ Requested   │ Actions         │
│                         (click)     (click)                        │
└────────────────────────────────────────────────────────────────────┘
```

- Click column header once → Sort descending (↓)
- Click again → Sort ascending (↑)
- Arrow icon shows current sort direction

### Implementation for AccountsTab.tsx

**New imports:**
```typescript
import { Search, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useResendInvitation } from '@/hooks/useUserProvisioning';
import { useMemo } from 'react';
import { AccessRequest } from '@/hooks/useAccessRequests';
```

**New state for All Requests tab:**
```typescript
// Resend
const [resendingId, setResendingId] = useState<string | null>(null);
const resendInvitation = useResendInvitation();

// Search and sort for All Requests
const [allSearchQuery, setAllSearchQuery] = useState('');
const [allSortField, setAllSortField] = useState<'status' | 'date'>('date');
const [allSortOrder, setAllSortOrder] = useState<'asc' | 'desc'>('desc');
```

**Filter/sort logic:**
```typescript
const filteredAllRequests = useMemo(() => {
  let result = allRequests ?? [];
  
  // Search filter
  if (allSearchQuery) {
    const query = allSearchQuery.toLowerCase();
    result = result.filter(r => r.full_name.toLowerCase().includes(query));
  }
  
  // Sort
  return [...result].sort((a, b) => {
    let comparison = 0;
    if (allSortField === 'date') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      comparison = a.status.localeCompare(b.status);
    }
    return allSortOrder === 'desc' ? -comparison : comparison;
  });
}, [allRequests, allSearchQuery, allSortField, allSortOrder]);
```

**Sort toggle handler:**
```typescript
const handleAllSort = (field: 'status' | 'date') => {
  if (allSortField === field) {
    setAllSortOrder(allSortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setAllSortField(field);
    setAllSortOrder('desc');
  }
};
```

**Search input (above table):**
```typescript
<div className="mb-4">
  <div className="relative max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search by name..."
      value={allSearchQuery}
      onChange={(e) => setAllSearchQuery(e.target.value)}
      className="pl-10"
    />
  </div>
</div>
```

**Sortable table headers:**
```typescript
<TableHead 
  className="cursor-pointer hover:bg-muted/50 select-none"
  onClick={() => handleAllSort('status')}
>
  <div className="flex items-center gap-1">
    Status
    {allSortField === 'status' && (
      allSortOrder === 'desc' 
        ? <ArrowDown className="h-3 w-3" /> 
        : <ArrowUp className="h-3 w-3" />
    )}
  </div>
</TableHead>

<TableHead 
  className="cursor-pointer hover:bg-muted/50 select-none"
  onClick={() => handleAllSort('date')}
>
  <div className="flex items-center gap-1">
    Requested
    {allSortField === 'date' && (
      allSortOrder === 'desc' 
        ? <ArrowDown className="h-3 w-3" /> 
        : <ArrowUp className="h-3 w-3" />
    )}
  </div>
</TableHead>
```

### Implementation for EmailInvitationsTable.tsx

Apply same pattern:
- Add search state and filter logic
- Add sort state for `status` and `date` (Sent column)
- Make Status and Sent headers clickable
- Add search input above table

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Line 95-97: Handle `PASSWORD_RECOVERY` event |
| `src/components/admin/AccountsTab.tsx` | Add resend button, search input, sortable headers for All Requests tab |
| `src/components/admin/EmailInvitationsTable.tsx` | Add search input, sortable headers |

---

## Expected Behavior After Implementation

### Email Links
1. User clicks password reset/invite link in email
2. Auth page loads → `PASSWORD_RECOVERY` event fires
3. Password form displays immediately (no intermediate screen)

### Resend in All Requests
1. Admin goes to All Requests tab
2. Approved requests show Resend button next to Delete
3. Click Resend → Loading spinner → Toast "Invitation resent successfully"
4. Admin stays on same page (no navigation)

### Search and Sort
1. Type in search box → Table filters by name in real-time
2. Click "Status" header → Sorts by status (toggle asc/desc), shows arrow
3. Click "Requested" header → Sorts by date (toggle asc/desc), shows arrow

