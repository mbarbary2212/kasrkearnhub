

# Fix AudioContext Double-Close in HistoryTakingSection

## Problem
Multiple code paths race to call `scribe.disconnect()`, causing a double-close `InvalidStateError` on the internal `AudioContext`.

## Changes — single file: `HistoryTakingSection.tsx`

### 1. Add `disconnectingRef` after `scribeRef` (line ~133)
```ts
const disconnectingRef = useRef(false);
```

### 2. Add async `safeDisconnect` helper
```ts
const safeDisconnect = useCallback(async () => {
  if (disconnectingRef.current) return;
  disconnectingRef.current = true;
  try {
    if (scribeRef.current.isConnected) {
      await scribeRef.current.disconnect();
    }
  } catch {
    // Suppress AudioContext double-close
  } finally {
    disconnectingRef.current = false;
  }
}, []);
```

### 3. Replace all 5 disconnect call sites with `safeDisconnect()`

| Line | Current | Replacement |
|------|---------|-------------|
| 115 | `try { scribe.disconnect(); } catch {...}` | `safeDisconnect()` |
| 137-144 | unmount cleanup block | `safeDisconnect()` |
| 233 | `try { if (scribe.isConnected) scribe.disconnect(); } catch {...}` | `await safeDisconnect()` |
| 367 | `try { if (scribe.isConnected) scribe.disconnect(); } catch {...}` | `safeDisconnect()` |
| 384 | `try { if (scribe.isConnected) scribe.disconnect(); } catch {...}` | `safeDisconnect()` |

### 4. Simplify unmount cleanup
```ts
useEffect(() => {
  return () => { safeDisconnect(); };
}, [safeDisconnect]);
```

### 5. Reset flag on connect
In the `connectScribe` function, add `disconnectingRef.current = false;` before `await scribe.connect(...)`.

The `await` inside `safeDisconnect` ensures the `disconnectingRef` flag stays `true` until the disconnect actually completes, preventing any concurrent caller from slipping through.

