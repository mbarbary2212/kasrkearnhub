

## Fix: Remove redundant `useEffect` causing `AudioContext` double-close

### Problem
Sentry reports `InvalidStateError: Cannot close a closed AudioContext`. Two competing cleanup paths run on unmount:
1. Our explicit `useEffect` (lines 150–152) calls `safeDisconnect()` → closes AudioContext
2. The `@elevenlabs/react` `useScribe` hook's internal cleanup → tries to close the same AudioContext again

### Change
**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

Delete lines 150–152:
```tsx
useEffect(() => {
  return () => { safeDisconnect(); };
}, [safeDisconnect]);
```

No replacement needed. All user-facing disconnect scenarios are already covered by explicit `safeDisconnect()` calls in `handleFinishInteraction`, `toggleVoice`, `sendChatMessage`, and `onCommittedTranscript`. The SDK handles its own unmount teardown.

### Risk
None. This removes a redundant call that conflicts with the SDK's lifecycle management.

