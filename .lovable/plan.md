

# Face-to-Face Consultation Layout — Implementation Plan

## Changes

### 1. `StructuredCaseRunner.tsx`
- In the `useEffect` at line 95, also query `profiles` table for `avatar_url` using the user's ID.
- Add `studentAvatarUrl` state, pass it as a new prop on line 319.

### 2. `HistoryTakingSection.tsx`

**Import fix:** Add `Stethoscope` to the lucide-react import on line 10.

**Props:** Add `studentAvatarUrl?: string` to the interface (line 20).

**Chat mode (lines 562–663) — replace with:**

```text
┌─────────────────────────────────────────────────┐
│ [Patient 64px]   (scrollable chat)   [Doc 64px] │
│  name (sticky)   messages + Q badges  "أنت"     │
├─────────────────────────────────────────────────┤
│ [input autoFocus]                        [send] │ sticky
│ ⏱ timer │ N questions │  End — Proceed          │ sticky
└─────────────────────────────────────────────────┘
```

- Three-column flex row: left `w-20` patient avatar+name (sticky `self-start`), center `flex-1 overflow-y-auto` messages, right `w-20` student avatar+label (sticky `self-start`).
- Student avatar uses `studentAvatarUrl` with `Stethoscope` icon fallback.
- Each user message gets inline `Q{n}` badge.
- Remove: sticky header row (lines 568–579), floating timer overlay (583–588), floating question counter overlay (589–594).
- Input gets `autoFocus`.
- Footer: timer badge left, question count center, "End — Proceed" button right. Single row.

**Voice mode (lines 665–838) — replace with:**

```text
┌─────────────────────────────────────────────────┐
│ [Patient 64px]    [mic button]      [Doc 64px]  │
│  name            status text          "أنت"     │
│  (2-line fade)   interim transcript             │
├─────────────────────────────────────────────────┤
│ ⏱ timer │ N questions │  End — Proceed          │ sticky
└─────────────────────────────────────────────────┘
```

- Same three-column layout. Center: vertically centered mic button + status text + interim transcript only.
- Left column: patient avatar + name + fading 2-line speech bubble (`line-clamp-2 text-xs transition-opacity duration-500`) showing last AI response.
- Right column: student avatar + "أنت".
- Remove: large sticky avatar header (670–708), mute button, floating overlays (712–723), text transcript bubbles (724–736), fallback text input (791–823), "Mic is optional" text.
- Footer: timer + question count + "End — Proceed" button. No input above it.

**Safety:** If line numbers don't match exactly during implementation, locate the chat and voice sections by their structural comments (`// ── Chat mode ──` and `// ── Voice mode ──`) rather than line numbers. Do not guess.

## What does NOT change
- All logic: timer, message cap, sendChatMessage, voice recording, AI calls, phase transitions, end conversation
- Language/mode selection screens, text mode (ATMIST), phase 2 comprehension questions
- Scoring, Sentry, all other props/state
- No other files

