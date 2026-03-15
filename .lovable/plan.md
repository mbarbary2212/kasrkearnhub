

# Bug Fix: InvalidStateError — Cannot close a closed AudioContext

## Problem

The `@elevenlabs/react` `useScribe` hook (used in `HistoryTakingSection.tsx`) internally manages an `AudioContext` for real-time speech-to-text. When `scribe.disconnect()` is called, the library closes its internal `AudioContext`.

The bug is a **double-close race condition**: multiple code paths call `scribe.disconnect()` simultaneously:
1. `onCommittedTranscript` callback (line 115) — disconnects after getting text
2. Voice mode TTS section (line 229) — disconnects to prevent echo
3. `handleFinishInteraction` (line 383) — disconnects when done
4. Unmount cleanup (line 138) — disconnects on navigation away
5. Stop listening toggle (line 364)

When the user navigates away during an active session, or when a TTS 503 error occurs alongside a WebSocket close, two of these fire nearly simultaneously. The second `disconnect()` call triggers the library to close an already-closed `AudioContext`, producing the unhandled `InvalidStateError`.

## Root Cause Location

**File**: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

The `scribe.disconnect()` calls are not guarded — they don't check `scribe.isConnected` before calling, and the `onCommittedTranscript` callback directly calls `scribe.disconnect()` without a guard.

## Fix

1. **Guard all `scribe.disconnect()` calls** — only call when `scribe.isConnected` is true
2. **Wrap disconnect in a safe helper** that catches `InvalidStateError` from the library's internal AudioContext cleanup
3. **Centralize cleanup** into one idempotent function

### Changes to `src/components/clinical-cases/sections/HistoryTakingSection.tsx`:

**Add a safe disconnect helper** (early in the component):
```typescript
const safeDisconnectScribe = useCallback(() => {
  try {
    if (scribeRef.current.isConnected) {
      scribeRef.current.disconnect();
    }
  } catch (err) {
    // Suppress InvalidStateError from AudioContext double-close
    console.warn('Scribe disconnect error (safe to ignore):', err);
  }
}, []);
```

**Replace all raw `scribe.disconnect()` calls** with `safeDisconnectScribe()`:
- Line 115 (`onCommittedTranscript`): use `safeDisconnectScribe()` — but since this is inside the hook config which runs before the helper is defined, we'll use a ref-based approach
- Line 229, 364, 383: replace with `safeDisconnectScribe()`
- Line 138 (unmount cleanup): wrap in try/catch

**For the `onCommittedTranscript` callback** (which can't use the helper directly since it's defined in the hook call), wrap the disconnect:
```typescript
onCommittedTranscript: (data) => {
  if (data.text?.trim()) {
    setLastSpoken(data.text);
    setVoiceErrorCount(0);
    sendChatMessageRef.current(data.text);
    try { scribe.disconnect(); } catch { /* safe */ }
  }
},
```

**For the unmount cleanup**:
```typescript
useEffect(() => {
  return () => {
    try {
      if (scribeRef.current.isConnected) {
        scribeRef.current.disconnect();
      }
    } catch {
      // Suppress AudioContext double-close on unmount
    }
  };
}, []);
```

## Summary

Single file change: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`. All `scribe.disconnect()` calls get guarded with `isConnected` checks and wrapped in try/catch to handle the library's internal `AudioContext.close()` race condition. No architectural changes needed.

