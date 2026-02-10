

# Remove Student/Faculty Toggle from Login Screen

## Why

The Student/Faculty toggle on the login screen is cosmetic only -- it does not affect authentication or role assignment. Roles are managed by the super admin via the `user_roles` table. Removing it simplifies the UI, saves vertical space on mobile, and eliminates user confusion.

## Changes

### File: `src/pages/Auth.tsx`

1. **Remove the toggle UI** (lines 488-516): Delete the entire "Login Type Selector" `div` containing the Student and Faculty buttons

2. **Remove unused imports**: Remove `UserRound`, `UsersRound` from the lucide-react import (line 9) since they are only used by the toggle

3. **Remove `loginType` variable** (line 44) and `isStudent` variable (line 472) since they are no longer needed

4. **Update Access Request default type** (line 261): Change `defaultType={loginType === 'faculty' ? 'faculty' : 'student'}` to simply `defaultType="student"` (the Access Request form has its own type selector so this is just the default)

5. **Clean up the redirect** in `AuthContext.tsx` or wherever unauthenticated users are sent: Change any `/auth?type=student` redirect to just `/auth`

### File: `src/contexts/AuthContext.tsx` (if applicable)

- Update any redirect from `/auth?type=student` to `/auth`

### Result

The login card will go straight from the "Welcome" heading to the email/password fields, saving another ~50px of vertical space and creating a cleaner, less confusing experience.

