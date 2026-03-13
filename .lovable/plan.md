

# Combined UI Polish — Face-to-Face Layout

## Files: `HistoryTakingSection.tsx` + `StructuredCaseRunner.tsx`

### StructuredCaseRunner.tsx — Header cleanup
- Remove the `Clock`/timer from the header (redundant with sticky footer timer)
- Merge "Section X of Y" and "X/Y completed" into the title row alongside the Abort button
- Remove the separate two-line text below the progress bar

### HistoryTakingSection.tsx — All changes below

**Imports:** Remove `Stethoscope` from lucide-react import (no longer needed).

**Both chat and voice modes:**
- Increase patient + student avatars from `w-16 h-16` to `w-20 h-20`
- Remove patient name label below patient avatar (admin-only metadata, not useful to students)
- Replace student `AvatarFallback` from Stethoscope icon to initials:
  ```tsx
  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
    {studentName ? studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'أنت'}
  </AvatarFallback>
  ```
- Side columns widen to `w-24` to fit larger avatars

**Voice mode specific:**
- Align mic button to top (`items-start pt-2`) so it sits at same level as avatars
- Shrink mic button from `w-16 h-16` to `w-14 h-14` so footer stays visible on 589px tablet viewport
- Compact the speech bubble: `text-[11px] py-0.5 px-1.5 line-clamp-2`
- Remove text fallback input (voice-only mode)

**What does NOT change:**
- All logic (timer, message cap, AI calls, voice recording, phase transitions)
- Language/mode selection, text mode (ATMIST), phase 2 questions
- Scoring, Sentry, all props/state
- No other files

