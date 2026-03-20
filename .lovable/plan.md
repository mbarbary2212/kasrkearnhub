

## Plan: Add mic cleanup to unmount useEffect

**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

**Change:** Update the unmount `useEffect` (lines 176-182) to add browser SpeechRecognition cleanup, reset listening state, and stop TTS on unmount.

**What's added (6 lines):**
- `recognitionRef.current.stop()` + null it out
- `setIsListening(false)`
- `stopAllTTS()`

No other files or code touched.

