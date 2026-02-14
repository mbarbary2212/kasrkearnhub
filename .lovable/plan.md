

# Fix: "Set Temporary Password" Failing with "User not found"

## Root Cause

The `set-password` action in the `provision-user` Edge Function calls `supabaseAdmin.auth.admin.listUsers()` **without any pagination parameter** (line 205). By default, Supabase returns only the first page (~50 users). If the target user is not on that first page, the lookup fails with "User not found".

Other actions in the same function (like `check-invite-status` on line 149) already use `listUsers({ perPage: 1000 })`, so this is simply an oversight.

## Fix

**File: `supabase/functions/provision-user/index.ts`**

Change line 205 from:

```typescript
const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
```

to:

```typescript
const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
```

That is the only change needed. One line.

## Why This Works

- The `check-invite-status` action already uses `perPage: 1000` and works correctly
- With 1000 per page, all current users will be included in the search
- The rest of the set-password logic (password update, audit logging) is correct and unchanged

## Risk

None. This is a pagination parameter fix with no side effects.
