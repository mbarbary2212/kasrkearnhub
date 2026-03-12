

# Make Patient Wait for Student to Start the Conversation

## Problem

When the student starts a history-taking session, `sendChatMessageInitial` immediately sends a greeting to the edge function, which triggers the AI patient to respond with a full reply (often including chief complaints unprompted). This is unrealistic — in a real clinical encounter, the patient greets back and waits for the doctor to ask questions.

## Fix

**File:** `src/components/clinical-cases/sections/HistoryTakingSection.tsx`

Replace the current `sendChatMessageInitial` logic. Instead of calling the edge function, just display a simple local patient greeting and let the student send the first real message:

```ts
function sendChatMessageInitial(mode: 'chat' | 'voice') {
  const lang = selectedLanguage || 'en';
  const greeting = lang === 'ar' 
    ? 'السلام عليكم يا دكتور' 
    : 'Hello doctor';
  
  // Show patient greeting locally — no edge function call
  setChatMessages([{ role: 'assistant', content: greeting }]);

  // Still speak the greeting in voice mode
  if (mode === 'voice' && lang === 'ar' && !isMuted) {
    const gender = getSettingValue(ttsSettings, 'tts_voice_gender', 'male') as string;
    const voiceId = voiceIdOverride
      || (gender === 'female'
        ? getSettingValue(ttsSettings, 'tts_elevenlabs_female_voice', 'RCubfxZlU5rlyEKAEsSN') as string
        : getSettingValue(ttsSettings, 'tts_elevenlabs_male_voice', 'DWMVT5WflKt0P8OPpIrY') as string);
    speakArabic(greeting, ttsProvider, voiceId, patientTone);
  }
}
```

### What changes

- No fake "user" greeting message is injected into the chat history
- No edge function call on session start — saves one round trip
- Patient just says "السلام عليكم يا دكتور" / "Hello doctor" and waits
- Student sends the first real message, which is how clinical encounters actually work
- Voice mode still speaks the greeting aloud

### What stays the same

- All subsequent messages still go through `patient-history-chat` edge function as before
- Timer, message limits, scoring — all unchanged
- The conversation history sent to the edge function will start with the student's first question (no phantom greeting polluting context)

## Scope

One function rewrite in one file. No edge function changes needed.

