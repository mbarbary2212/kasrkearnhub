

# Login Type Selection Improvement

## Current State

The login flow is secure and roles are properly handled:

- **Roles are stored separately** in the `user_roles` table (not in profiles)
- The `type=student` or `type=faculty` URL parameter is **purely cosmetic** - it only changes:
  - The portal title ("Student Portal" vs "Faculty & Staff Portal")
  - The button color (gradient-medical vs medical-teal)
- **User privileges are NOT affected** by which login type they choose - roles are fetched from the database after authentication

## Proposed Solution: Unified Login with Role Selector

Replace the current two-page approach with a single login form that has a clear "Login as" selector at the top.

### Design

```
┌─────────────────────────────────────┐
│         [KALM Hub Logo]             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  Login as:                  │   │
│   │  ┌─────────┬──────────────┐ │   │
│   │  │Student ●│  Faculty     │ │   │  ← Toggle/Segmented control
│   │  └─────────┴──────────────┘ │   │
│   └─────────────────────────────┘   │
│                                     │
│  Email: [________________]          │
│  Password: [________________]       │
│                                     │
│  [       Sign In       ]            │
│                                     │
│  ▼ Forgot your password?            │
│  Don't have an account?             │
│  [  Request Access  ]               │
└─────────────────────────────────────┘
```

### Changes

**File: `src/pages/Auth.tsx`**

1. Add a segmented control/toggle at the top of the login form
2. Default selection: **Student** (first option, pre-selected)
3. Remove the bottom "switch login type" section
4. Clicking either segment updates the URL parameter and visual styling

**File: `src/pages/Home.tsx`**

1. Change the landing page to have a single "Login" button
2. Or keep both cards but make the flow clearer

### Option A: Segmented Control (Recommended)

```tsx
<div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg mb-6">
  <Button
    variant={isStudent ? "default" : "ghost"}
    size="sm"
    className={cn(
      "flex-1",
      isStudent && "gradient-medical"
    )}
    onClick={() => navigate('/auth?type=student', { replace: true })}
  >
    <UserRound className="w-4 h-4 mr-2" />
    Student
  </Button>
  <Button
    variant={!isStudent ? "default" : "ghost"}
    size="sm"
    className={cn(
      "flex-1",
      !isStudent && "bg-medical-teal hover:bg-medical-teal/90"
    )}
    onClick={() => navigate('/auth?type=faculty', { replace: true })}
  >
    <UsersRound className="w-4 h-4 mr-2" />
    Faculty
  </Button>
</div>
```

### Option B: Dropdown Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="w-full mb-6">
      {isStudent ? (
        <>
          <UserRound className="w-4 h-4 mr-2" />
          Student Portal
        </>
      ) : (
        <>
          <UsersRound className="w-4 h-4 mr-2" />
          Faculty & Staff Portal
        </>
      )}
      <ChevronDown className="w-4 h-4 ml-auto" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="w-full bg-popover">
    <DropdownMenuItem onClick={() => navigate('/auth?type=student')}>
      <UserRound className="w-4 h-4 mr-2" />
      Student
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/auth?type=faculty')}>
      <UsersRound className="w-4 h-4 mr-2" />
      Faculty & Staff
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add segmented control/dropdown at top, remove bottom "switch type" section |

### Confirmation: Roles Are Secure

The authentication changes did **NOT** affect user roles or privileges because:

1. Roles are stored in a **separate `user_roles` table**, not in the profile
2. The login `type` parameter is **never used** to determine or set roles
3. After login, `useAuth.ts` fetches the role from `user_roles` table (line 50-54)
4. All role checks (isAdmin, isPlatformAdmin, etc.) are based on database values
5. RLS policies enforce server-side security regardless of client-side parameters

### Default Behavior

- URL `/auth` (no type) → defaults to `student` (already implemented)
- This remains unchanged - student is the default

