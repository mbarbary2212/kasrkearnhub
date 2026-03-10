

# Fix 3 User-Reported Issues — Quick Wins

## Step 1: Fix Patient Repetition (`patient-history-chat/index.ts`)

Update all emotional tone descriptions (EN + AR) to add anti-repetition instructions.

**English tones** (lines 156-164): Append to worried, anxious, angry, impolite, in_pain:
> "Express this naturally and subtly. Do NOT repeat the same phrases every response. Only show your emotional state occasionally — vary your wording each time."

**Arabic tones** (lines 166-174): Same idea in Arabic:
> "عبّر عن حالتك بشكل طبيعي ومش مبالغ فيه. ما تكررش نفس العبارات في كل رد. أظهر مشاعرك من وقت للتاني بس، ونوّع في كلامك."

## Step 2: Fix Physical Exam Empty State (`PhysicalExamSection.tsx`)

When `activeRegions.length === 0` (line ~105), render a visible fallback message instead of nothing:
> "No examination findings available for this case."

Add `Sentry.captureMessage('Physical exam: zero regions parsed', { extra: { dataKeys: Object.keys(data) } })` so we can track broken cases.

## Step 3: Fix Voice UX + Mute Toggle (`HistoryTakingSection.tsx`)

Three changes:
1. **Show text fallback by default** in voice mode — set `showVoiceFallbackInput = true` initially when `selectedMode === 'voice'`. Label mic as "optional". Remove the 2-failure gate.
2. **Add "Mute AI voice" toggle** — a small button/switch in the chat header. When muted, skip `speakArabic()` / TTS calls. Persist to `localStorage('mute_ai_voice')`.
3. **Sentry on STT errors** — in `recognition.onerror` (line 217), add `Sentry.captureMessage('STT error: ' + event.error)`.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/patient-history-chat/index.ts` | Anti-repetition tone instructions |
| `src/components/clinical-cases/sections/PhysicalExamSection.tsx` | Empty state UI + Sentry breadcrumb |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Default text fallback, mute toggle, Sentry on STT error |

Order: 1 → 2 → 3 (independent, no conflicts). ElevenLabs STT migration deferred to separate task.

