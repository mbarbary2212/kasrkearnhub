
# Fix User Approval & Add More Role Options

## Issues Found

### Issue 1: Invite Failure
The edge function `provision-user` is using a non-existent API method:
```
TypeError: supabaseAdmin.auth.admin.getUserByEmail is not a function
```

The Supabase JS library v2 does **not** have `getUserByEmail()`. The correct approach is to use `listUsers()` and filter the results, or create the user directly and catch the "already exists" error.

### Issue 2: Limited Role Options
The approval dialog only shows 3 roles:
- Student
- Teacher
- Admin

But your system has 7 roles defined in `src/types/database.ts`:
- student
- teacher
- admin
- department_admin
- topic_admin
- platform_admin
- super_admin

---

## Solution

### Fix 1: Update Edge Function API Call

**File: `supabase/functions/provision-user/index.ts`**

Replace the non-existent `getUserByEmail()` with the `listUsers()` approach or a try-catch on `createUser`:

```typescript
// BEFORE (broken):
const { data: userByEmail, error: lookupError } = 
  await supabaseAdmin.auth.admin.getUserByEmail(email);

// AFTER (working):
// Option A: Use listUsers with filter (works but less efficient)
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
  perPage: 1,
});
const existingUser = users.find(u => u.email?.toLowerCase() === email);

// Option B: Try createUser and handle "already exists" error (preferred)
```

**Recommended approach**: Try to create the user first. If it fails with "User already registered", then we know the user exists and can generate a recovery link instead.

### Fix 2: Add More Role Options to Approval Dialog

**File: `src/components/admin/AccountsTab.tsx`**

Update the role selector to include all appropriate roles:

```tsx
<SelectContent>
  <SelectItem value="student">Student</SelectItem>
  <SelectItem value="teacher">Teacher</SelectItem>
  <SelectItem value="topic_admin">Topic Admin</SelectItem>
  <SelectItem value="department_admin">Department Admin</SelectItem>
  <SelectItem value="platform_admin">Platform Admin</SelectItem>
</SelectContent>
```

Note: `super_admin` should NOT be in this list as it's reserved for the highest-level administrators and should only be assigned manually at the database level.

---

## Implementation Details

### Edge Function Changes

| Change | Location | Description |
|--------|----------|-------------|
| Remove `getUserByEmail` | Line 170 | Replace with try-create approach |
| Add error handling | Lines 183-197 | Check if "already registered" error, use that user |
| Generate correct link type | Existing logic | Keep invite vs recovery distinction |

### Frontend Changes

| Change | Location | Description |
|--------|----------|-------------|
| Add role options | Lines 300-304 | Add topic_admin, department_admin, platform_admin |
| Group roles visually | Optional | Add separators between role tiers |

---

## Role Hierarchy Reference

| Role | Description | Should be in dropdown? |
|------|-------------|------------------------|
| student | Basic read-only access | Yes (default) |
| teacher | Can add/edit content | Yes |
| topic_admin | Manages assigned topics/chapters | Yes |
| admin | Legacy role, manages content | No (deprecated) |
| department_admin | Manages assigned departments | Yes |
| platform_admin | Full platform access | Yes (careful) |
| super_admin | System owner, 1-2 users only | No (manual only) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/provision-user/index.ts` | Fix the user lookup API to use a working method |
| `src/components/admin/AccountsTab.tsx` | Add more role options to the Select dropdown |
