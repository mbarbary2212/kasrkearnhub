

## Keep Sentry Test Button for Super Admin Only

Keeping the button behind a super_admin check is the right call -- it lets you trigger a test error anytime without exposing it to regular users.

### Change (single file)

**`src/pages/Auth.tsx`**: Wrap the existing Sentry Test button so it only renders when the logged-in user has the `super_admin` role. Import `useAuthContext` and conditionally render:

```tsx
const { isSuperAdmin } = useAuthContext();

{isSuperAdmin && (
  <Button variant="destructive" size="sm" onClick={() => { throw new Error("SENTRY_PRODUCTION_TEST"); }}>
    Sentry Test
  </Button>
)}
```

This replaces the current unconditional render. No other changes.

