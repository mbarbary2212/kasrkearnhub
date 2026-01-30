
# Comprehensive Admin, Impersonation & Account Management Implementation

## Overview

This plan implements a secure, auditable admin system with four phases:

1. **Phase 1: Admin UI Cleanup** - Remove student-specific features from admin view
2. **Phase 2: Disable Self-Registration** - Remove signup UI and form
3. **Phase 3: Real Impersonation System** - Allow admins to impersonate students with full audit trail
4. **Phase 4: Account Provisioning** - Admin-managed account creation via email invitations

---

## Phase 1: Admin UI Cleanup

### Goal
Admins should not see or interact with student-specific features (Progress, Study Coach, Study Plan) while retaining full access to the Admin Panel.

### Changes

#### 1.1 Hide Study Coach FAB for Admins

**File:** `src/components/coach/CoachFAB.tsx`

Update line 22 to include `isAdmin` check:
```tsx
// Don't show FAB for admins, mobile users, or if not logged in
if (isMobile || !user || isAdmin) {
  return null;
}
```

#### 1.2 Hide Mobile Study Coach Icon for Admins

**File:** `src/components/layout/MainLayout.tsx`

Update the mobile Study Coach icon section (around line 157) to only show for non-admin users:
```tsx
{/* Study Coach Icon - Only for non-admin users on mobile */}
{user && isMobile && !isAdmin && (
  // existing Study Coach button code
)}
```

#### 1.3 Redirect Admins from Progress Page

**File:** `src/pages/ProgressPage.tsx`

Add admin redirect before rendering StudentDashboard:
```tsx
const { user, isAdmin } = useAuthContext();

if (!user) {
  return <Navigate to="/" replace />;
}

// Redirect admins to admin panel
if (isAdmin) {
  return <Navigate to="/admin" replace />;
}
```

#### 1.4 Hide Study Plan & Unlocks Tabs for Admins

**File:** `src/components/dashboard/LearningHubTabs.tsx`

- Add `isAdmin` prop from auth context
- Conditionally render only "Overview" tab when `isAdmin === true`
- Hide "Study Plan" and "Unlocks" tabs for admins
- Adjust TabsList grid columns accordingly (3 columns for students, 1 for admins)

---

## Phase 2: Disable Self-Registration

### Goal
Students cannot create accounts themselves. Only admins can provision accounts.

### Changes

**File:** `src/pages/Auth.tsx`

Remove from the main auth form (lines 478-644):
1. Remove `TabsList` with signup trigger (lines 480-483)
2. Remove `TabsTrigger value="signup"` element
3. Remove `TabsContent value="signup"` entire block (lines 557-623)
4. Remove "Are you a student/faculty" toggle at bottom (lines 626-638)
5. Remove `handleSignup` function (lines 121-143)
6. Remove `User` icon import from lucide-react

**Keep:**
- Login form with email/password
- Forgot password flow
- Password reset flow
- Change password flow (for logged-in users)

The resulting auth form will be a simple login-only card without tabs.

---

## Phase 3: Real Impersonation System

### Design Principles
- Admins never know student passwords
- Admin identity is always preserved (actor_id)
- All actions are auditable
- Impersonation is time-limited (30 minutes)
- **Support Mode by default**: reads allowed, progress/coach writes BLOCKED
- Explicit admin fixes (e.g., reset progress) are logged separately

### 3.1 Database Schema

**New Migration: Create impersonation_sessions table**

```sql
-- Create impersonation sessions table
CREATE TABLE public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  ended_at TIMESTAMPTZ,
  end_reason TEXT CHECK (end_reason IN ('manual', 'expired', 'logout', 'new_session')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PARTIAL UNIQUE INDEX: Ensure one active impersonation per admin
CREATE UNIQUE INDEX one_active_impersonation_per_actor
ON public.impersonation_sessions(actor_id)
WHERE ended_at IS NULL;

-- Index for efficient lookups
CREATE INDEX idx_impersonation_sessions_effective_user 
ON public.impersonation_sessions(effective_user_id);

CREATE INDEX idx_impersonation_sessions_expires 
ON public.impersonation_sessions(expires_at)
WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- NO DIRECT CLIENT ACCESS - all operations via Edge Functions
-- This policy ensures clients CANNOT query this table directly
CREATE POLICY "No direct client access"
ON public.impersonation_sessions
FOR ALL
TO authenticated
USING (false);
```

### 3.2 Edge Functions (All with `verify_jwt = true`)

**Update `supabase/config.toml`:**
```toml
[functions.start-impersonation]
verify_jwt = true

[functions.end-impersonation]
verify_jwt = true

[functions.get-impersonation-state]
verify_jwt = true

[functions.invite-user]
verify_jwt = true
```

#### Edge Function: `start-impersonation`

**File:** `supabase/functions/start-impersonation/index.ts`

Responsibilities:
1. Validate JWT using `supabase.auth.getUser()` 
2. Verify caller is `platform_admin` or `super_admin` (query user_roles)
3. Validate target user exists and has `student` role only
4. End any existing active impersonation for this actor (set ended_at, end_reason='new_session')
5. Create new impersonation session (30 min expiry)
6. Log `impersonation_started` to activity_logs with actor_id, effective_user_id, session_id
7. Return session data

**Request:**
```json
{ "targetUserId": "student-uuid" }
```

**Response:**
```json
{
  "sessionId": "...",
  "effectiveUserId": "...",
  "effectiveUserName": "Student Name",
  "effectiveUserEmail": "student@email.com",
  "expiresAt": "2025-01-30T15:30:00Z"
}
```

#### Edge Function: `end-impersonation`

**File:** `supabase/functions/end-impersonation/index.ts`

Responsibilities:
1. Validate JWT using `supabase.auth.getUser()`
2. Find active impersonation session where actor_id = caller and ended_at IS NULL
3. Mark session as ended (ended_at = now(), end_reason = 'manual')
4. Log `impersonation_ended` to activity_logs with session details

#### Edge Function: `get-impersonation-state`

**File:** `supabase/functions/get-impersonation-state/index.ts`

Responsibilities:
1. Validate JWT using `supabase.auth.getUser()`
2. Query for active, non-expired impersonation session where actor_id = caller
3. If found and not expired, fetch effective user profile
4. Return current impersonation state (or null if not impersonating)

**Response (when impersonating):**
```json
{
  "isImpersonating": true,
  "effectiveUserId": "...",
  "effectiveUserName": "...",
  "effectiveUserEmail": "...",
  "sessionId": "...",
  "expiresAt": "..."
}
```

**Response (when not impersonating):**
```json
{
  "isImpersonating": false,
  "effectiveUserId": null,
  "effectiveUserName": null,
  "effectiveUserEmail": null,
  "sessionId": null,
  "expiresAt": null
}
```

### 3.3 Update log-activity Edge Function

**File:** `supabase/functions/log-activity/index.ts`

Add new allowed entity types and actions:

```typescript
const ALLOWED_ENTITY_TYPES = [
  // ... existing types ...
  'impersonation', 'user',
];

const ALLOWED_ACTIONS = [
  // ... existing actions ...
  // Impersonation
  'impersonation_started', 'impersonation_ended',
  // User management
  'user_invited', 'user_role_changed',
];
```

### 3.4 Central Hook: useEffectiveUser

**New File:** `src/hooks/useEffectiveUser.ts`

Single source of truth for impersonation state. Calls edge functions, never queries DB directly.

```typescript
interface EffectiveUserState {
  // Real user ID (always the logged-in admin)
  userId: string | null;
  // Effective user ID (student if impersonating, else same as userId)
  effectiveUserId: string | null;
  // Impersonation status
  isImpersonating: boolean;
  impersonatedUserName: string | null;
  impersonatedUserEmail: string | null;
  sessionId: string | null;
  expiresAt: Date | null;
  // Actions
  startImpersonation: (targetUserId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  // Loading state
  isLoading: boolean;
  // Support mode flag (writes blocked during impersonation)
  isSupportMode: boolean;
}
```

Key behaviors:
- Uses `useQuery` to poll `get-impersonation-state` every 60 seconds
- Auto-ends session on client-side expiry detection
- Provides `startImpersonation` / `endImpersonation` methods via edge functions
- **Never queries impersonation_sessions table directly**
- `isSupportMode = isImpersonating` (always true during impersonation)

### 3.5 Update Data Hooks to Use effectiveUserId

All student-specific data hooks must use `effectiveUserId` for READ queries:

| Hook | Change |
|------|--------|
| `useStudentDashboard.ts` | Replace `user?.id` with `effectiveUserId` from `useEffectiveUser()` |
| `useChapterProgress.ts` | Replace `user?.id` with `effectiveUserId` |
| `useQuestionAttempts.ts` | Replace `user?.id` with `effectiveUserId` |
| `useVideoProgress.ts` | Replace `user?.id` with `effectiveUserId` |
| `useAudioProgress.ts` | Replace `user?.id` with `effectiveUserId` |
| `useBadges.ts` | Replace `user?.id` with `effectiveUserId` |
| `useNeedsPractice.ts` | Replace `user?.id` with `effectiveUserId` |
| `useTestProgress.ts` | Replace `user?.id` with `effectiveUserId` |

**Pattern for read hooks:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

export function useStudentDashboard(filters?: DashboardFilters) {
  const { effectiveUserId } = useEffectiveUser();

  return useQuery({
    queryKey: ['student-dashboard', effectiveUserId, filters?.yearId, filters?.moduleId],
    queryFn: async (): Promise<DashboardData> => {
      if (!effectiveUserId) {
        return getEmptyDashboard();
      }
      // Use effectiveUserId for all queries
    },
    enabled: !!effectiveUserId,
  });
}
```

### 3.6 Block Writes During Support Mode

For mutation hooks that write student progress/coach data, add `isSupportMode` check:

| Hook | Change |
|------|--------|
| `useMarkItemComplete` in `useChapterProgress.ts` | Block mutation if `isSupportMode` |
| `useSaveQuestionAttempt` in `useQuestionAttempts.ts` | Block mutation if `isSupportMode` |
| Progress tracking mutations | Block mutation if `isSupportMode` |

**Pattern for write hooks:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

export function useSaveQuestionAttempt() {
  const { user } = useAuthContext();
  const { isSupportMode } = useEffectiveUser();

  return useMutation({
    mutationFn: async (params) => {
      // Block writes in support mode
      if (isSupportMode) {
        toast.info('View-only mode: Progress is not saved during impersonation');
        return { success: false, blocked: true };
      }
      // ... existing mutation logic
    },
  });
}
```

### 3.7 Impersonation Banner Component

**New File:** `src/components/admin/ImpersonationBanner.tsx`

Sticky banner shown during impersonation:
- Positioned at top of page (below header, above content)
- Yellow/amber warning color scheme
- Shows: "Viewing as: [Student Name] (View-Only Mode)"
- Shows countdown timer to session expiry
- "Exit" button to end impersonation
- Auto-refreshes to check session validity

```text
Visual representation:

┌────────────────────────────────────────────────────────────────┐
│ ⚠️  Viewing as: John Smith (View-Only Mode)  │ 24:32 │ [Exit] │
└────────────────────────────────────────────────────────────────┘
```

### 3.8 Student Picker Modal

**New File:** `src/components/admin/ImpersonateStudentModal.tsx`

Modal for selecting which student to impersonate:
- Search input (filters by name/email as user types)
- Lists only users with `student` role
- Shows student name, email
- "Impersonate" button per row
- Confirmation dialog before starting impersonation
- Visible only for `platform_admin` and `super_admin`

### 3.9 Integrate Impersonation into MainLayout

**File:** `src/components/layout/MainLayout.tsx`

Updates:
1. Import and render `ImpersonationBanner` when impersonating (above main content)
2. Add "Impersonate Student" menu item to admin dropdown (for platform_admin/super_admin only)
3. Add state for ImpersonateStudentModal visibility
4. When impersonating, hide admin-only menu items and show student-like UI

---

## Phase 4: Admin Account Provisioning

### Goal
Platform Admins and Super Admins can create student accounts via email invitation.

### 4.1 Edge Function: invite-user

**New File:** `supabase/functions/invite-user/index.ts`

Uses Supabase Admin API to invite users by email (no password sharing):

```typescript
// Validate caller is platform_admin or super_admin
// Use service role key for admin API
const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Invite user - they receive email to set their own password
const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
  data: { full_name: fullName },
  redirectTo: `${origin}/auth`,
});

// After successful invite, create profile and assign student role
await adminClient.from('profiles').upsert({
  id: data.user.id,
  email: email,
  full_name: fullName,
});

await adminClient.from('user_roles').insert({
  user_id: data.user.id,
  role: 'student',
});

// Log to activity_logs
// action: 'user_invited', entity_type: 'user'
```

**Request:**
```json
{
  "email": "student@kasralainy.edu.eg",
  "fullName": "Student Name"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "...",
  "message": "Invitation sent to student@kasralainy.edu.eg"
}
```

### 4.2 Account Management Tab

**New File:** `src/components/admin/AccountManagementTab.tsx`

Admin UI for user provisioning:

**Features:**
1. **Single User Invite Form**
   - Email input (validates @kasralainy.edu.eg domain)
   - Full Name input
   - "Send Invitation" button
   - Success/error feedback via toast

2. **Pending Invitations Section** (future enhancement)
   - Shows recently invited users
   - Status indicator (pending/accepted)
   - Resend invitation button

**Access Control:**
- Only visible to `platform_admin` and `super_admin`

### 4.3 Add Tab to AdminPage

**File:** `src/pages/AdminPage.tsx`

Add new tab for Account Management:

In TabsList section (around line 1347):
```tsx
{(isSuperAdmin || isPlatformAdmin) && (
  <TabsTrigger value="accounts" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
    <UserPlus className="w-4 h-4" />
    Accounts
  </TabsTrigger>
)}
```

In TabsContent section:
```tsx
{(isSuperAdmin || isPlatformAdmin) && (
  <TabsContent value="accounts">
    <AccountManagementTab />
  </TabsContent>
)}
```

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useEffectiveUser.ts` | Central hook for impersonation state (calls edge functions) |
| `src/components/admin/ImpersonationBanner.tsx` | Sticky banner during impersonation |
| `src/components/admin/ImpersonateStudentModal.tsx` | Student picker modal for admins |
| `src/components/admin/AccountManagementTab.tsx` | Account provisioning UI |
| `supabase/functions/start-impersonation/index.ts` | Edge function to start impersonation |
| `supabase/functions/end-impersonation/index.ts` | Edge function to end impersonation |
| `supabase/functions/get-impersonation-state/index.ts` | Edge function to check state |
| `supabase/functions/invite-user/index.ts` | Edge function to invite users |

### Files to Update

| File | Changes |
|------|---------|
| `src/components/coach/CoachFAB.tsx` | Hide for admins |
| `src/components/layout/MainLayout.tsx` | Hide mobile coach icon for admins, add impersonation banner and menu item |
| `src/pages/ProgressPage.tsx` | Redirect admins to /admin |
| `src/components/dashboard/LearningHubTabs.tsx` | Hide Study Plan/Unlocks tabs for admins |
| `src/pages/Auth.tsx` | Remove signup tab, form, and toggle |
| `src/pages/AdminPage.tsx` | Add Account Management tab |
| `src/hooks/useStudentDashboard.ts` | Use effectiveUserId for reads |
| `src/hooks/useChapterProgress.ts` | Use effectiveUserId for reads, block writes in support mode |
| `src/hooks/useQuestionAttempts.ts` | Use effectiveUserId for reads, block writes in support mode |
| `src/hooks/useVideoProgress.ts` | Use effectiveUserId for reads |
| `src/hooks/useAudioProgress.ts` | Use effectiveUserId for reads |
| `src/hooks/useBadges.ts` | Use effectiveUserId for reads |
| `src/hooks/useNeedsPractice.ts` | Use effectiveUserId for reads |
| `supabase/functions/log-activity/index.ts` | Add impersonation/invite actions to allowlist |
| `supabase/config.toml` | Add new edge function configs with `verify_jwt = true` |

### Database Migration

One migration file containing:
- `impersonation_sessions` table with proper constraints
- Partial unique index for one active session per actor
- RLS policy blocking all direct client access
- Indexes for performance

---

## Security Considerations

### Impersonation Restrictions
- Only `platform_admin` and `super_admin` can impersonate
- Cannot impersonate other admins (target must have `student` role only)
- Sessions auto-expire after 30 minutes
- Only one active session per admin (partial unique index)
- Full audit trail in activity_logs

### Support Mode (Write Blocking)
- **Default behavior during impersonation**: Progress/attempt writes are BLOCKED
- Mutations show friendly toast: "View-only mode: Progress is not saved during impersonation"
- Admin cannot accidentally corrupt student data while browsing
- Explicit admin fixes (future: reset progress, unlock content) would be separate admin actions with full logging

### Client Security
- Clients NEVER query `impersonation_sessions` directly
- All operations go through Edge Functions with JWT verification
- Edge Functions validate permissions server-side

### Account Provisioning Security
- Uses `inviteUserByEmail()` - student sets their own password via email link
- No passwords stored or transmitted by admins
- Domain validation on email addresses (@kasralainy.edu.eg)
- Audit logging for all invitations

---

## Implementation Order

1. **Phase 1: Admin UI Cleanup** (~30 min)
   - Update CoachFAB.tsx
   - Update MainLayout.tsx (mobile icon)
   - Update ProgressPage.tsx
   - Update LearningHubTabs.tsx

2. **Phase 2: Disable Self-Registration** (~20 min)
   - Update Auth.tsx to remove signup

3. **Phase 3: Impersonation** (~3-4 hours)
   - Create database migration
   - Create edge functions (start, end, get-state) with `verify_jwt = true`
   - Update log-activity allowed actions
   - Create useEffectiveUser hook
   - Create ImpersonationBanner component
   - Create ImpersonateStudentModal component
   - Update MainLayout with impersonation UI
   - Update all data hooks to use effectiveUserId
   - Add write-blocking in mutation hooks

4. **Phase 4: Account Provisioning** (~2 hours)
   - Create invite-user edge function
   - Create AccountManagementTab component
   - Add tab to AdminPage
