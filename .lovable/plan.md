

## Plan: Remove greeting TTS & improve mic prompt visibility

### What's already done
Change 1 (patient intro card) is already implemented — props exist and are passed.

### Change 2 — Remove greeting TTS

**File: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`**

1. **Remove `greetingPlaying` state** (line 112): Delete `const [greetingPlaying, setGreetingPlaying] = useState(false);`

2. **Remove `greetingPlaying` from mic button disabled condition** (line 941): Remove `|| greetingPlaying` from the disabled prop

3. **Remove greeting playing UI indicator** (lines 953-958): Delete the `{greetingPlaying && ...}` block

4. **Remove `!greetingPlaying` guards** (lines 960, 970): Remove the `&& !greetingPlaying` conditions from the listening and speaking indicators

5. **Remove `!greetingPlaying` from mic prompt condition** (line 985): Remove `!greetingPlaying &&` so the prompt shows immediately

6. **Remove greeting TTS logic from `sendChatMessageInitial`** (lines 1108-1183): Strip out the entire `if (mode === 'voice' && lang === 'ar' && !isMuted)` block including `setGreetingPlaying(true)`, all TTS calls, and `setGreetingPlaying(false)`. Keep the greeting text message (`setChatMessages`) — only remove the audio playback.

### Change 3 — Make mic prompt more visible

**Line 986**: Change `text-sm text-muted-foreground animate-pulse` to `text-base text-foreground/70 dark:text-slate-300 animate-pulse` for higher contrast and larger font.

### Files modified
- `src/components/clinical-cases/sections/HistoryTakingSection.tsx` only

