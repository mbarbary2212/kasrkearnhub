

## Stop Scribe WebSocket Crash Loop

### Problem
`connectScribe` is called after every TTS reply (line 315) and during greeting flow. When the WebSocket fails, it falls back to browser STT but the next reply cycle calls `connectScribe` again, creating hundreds of failures.

### Changes (1 file: `HistoryTakingSection.tsx`)

**1. Add `wsFailCountRef` and `scribeDisabledRef` refs (after line 150)**

```typescript
const wsFailCountRef = useRef(0);
const scribeDisabledRef = useRef(false);
```

**2. Update `connectScribe` (lines 396-425)**

- At the top, check `scribeDisabledRef.current` — if true, fall back to browser STT immediately without attempting connection.
- On successful connection (line 413), reset `wsFailCountRef.current = 0`.
- In the catch block (line 415-421), increment `wsFailCountRef.current`. If >= 3, set `scribeDisabledRef.current = true`, show a toast error "Voice connection lost. Please refresh.", and do NOT call `startBrowserSTT`. Otherwise, fall back to browser STT as before.

**3. Update `safeDisconnect` (lines 152-164)**

- In the catch block, increment `wsFailCountRef.current`. If >= 3, set `scribeDisabledRef.current = true` and show the same toast.

**4. Add unmount cleanup useEffect (after line 164)**

```typescript
useEffect(() => {
  return () => {
    wsFailCountRef.current = 0;
    scribeDisabledRef.current = false;
    safeDisconnect();
  };
}, [safeDisconnect]);
```

### No other files touched.

