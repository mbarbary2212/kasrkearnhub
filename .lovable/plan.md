

## Final 2 Fixes

### Fix 1: QueryClient defaults (`src/App.tsx`, line 35)

Replace `new QueryClient()` with:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});
```

### Fix 2: Submit cooldown (`src/hooks/useAICase.ts`)

- Add `lastSubmitRef = useRef(0)` alongside existing `turnRef`
- In `submitAnswer`, before the status check, add:
  ```typescript
  const now = Date.now();
  if (now - lastSubmitRef.current < 2000) {
    toast.error("Please wait a moment before submitting again.");
    return;
  }
  lastSubmitRef.current = now;
  ```

### Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add staleTime + retry to QueryClient |
| `src/hooks/useAICase.ts` | Add 2s submit cooldown |

2 files, ~10 lines total.

