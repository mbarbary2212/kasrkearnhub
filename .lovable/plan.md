

# Add Time & Message Limits to History Taking Interaction

## Problem
Students can spend unlimited time in the History Taking chat/voice interaction with no nudge to move on, wasting AI tokens and delaying case completion.

## Solution
Add a **soft time limit + message count limit** with progressive nudges:

### Behavior
1. **Countdown timer** visible during chat/voice interaction showing remaining time (e.g., "4:30 remaining")
2. **Soft nudge at 75%** — timer turns amber, a gentle banner appears: "Consider wrapping up your questions soon"
3. **Strong nudge at 100%** — timer turns red, banner says "Time's up! Please proceed to questions", the "End Conversation" button pulses with emphasis
4. **Message cap** — after a configurable number of exchanges (default: 15 messages from the student), disable the input and show "You've reached the maximum number of questions. Please proceed."
5. Students can **always** click "End Conversation" early — limits are soft, not hard locks (the input gets disabled only at the message cap)

### Configuration
- **Time limit**: Derived from case `estimated_minutes` — allocate ~40% to history taking (e.g., 15 min case → 6 min for history). Fallback default: 5 minutes.
- **Message limit**: Default 15 student messages. Could later be made configurable per case.

### UI Elements
- Small timer badge next to the mode label in the chat/voice header (e.g., `⏱ 4:30`)
- Warning banner (amber → red) appears inline above the input area
- "End Conversation" button gets `animate-pulse` class when time is up

## Files Modified

| File | Change |
|------|--------|
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Add timer state, message counter, warning banners, input disabling, and visual nudges to chat and voice modes |

## Technical Detail

New state in `HistoryTakingSection`:
```tsx
const HISTORY_TIME_LIMIT_MS = (estimatedMinutes ? Math.ceil(estimatedMinutes * 0.4) : 5) * 60 * 1000;
const MAX_STUDENT_MESSAGES = 15;

const [interactionStartTime] = useState(Date.now());
const [timeRemaining, setTimeRemaining] = useState(HISTORY_TIME_LIMIT_MS);
const studentMessageCount = chatMessages.filter(m => m.role === 'user').length;
const isOverTime = timeRemaining <= 0;
const isNearLimit = timeRemaining < HISTORY_TIME_LIMIT_MS * 0.25;
const isAtMessageCap = studentMessageCount >= MAX_STUDENT_MESSAGES;
```

A `useEffect` with `setInterval` ticks every second to update `timeRemaining`. Timer and warnings only render during Phase 1 chat/voice modes (not text mode, which is just reading).

The `estimatedMinutes` prop will be threaded from `StructuredCaseRunner` which already has access to the case data.

