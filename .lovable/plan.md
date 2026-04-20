
## Fix silent Coach replies + make AI model settings persist reliably

Two concrete problems are showing up, and they appear related to configuration robustness rather than UI layout.

### What’s actually happening

1. **Coach can finish without showing any answer**
   - The current coach UI treats a completed SSE stream with zero parsed text tokens as a success.
   - The edge function’s Gemini stream transformer only forwards `parts[].text`. If the provider returns a different chunk shape, partial chunks, or a non-text final event, the stream can complete with no assistant message and no error.
   - Result: the user sees their question, then nothing.

2. **Admin AI settings are not fully save-safe**
   - The admin settings UI only does `update(...).eq('key', key)`.
   - In the database, some expected keys are missing — most notably `anthropic_model`.
   - That means any save attempt for a missing row will fail, even though the panel is built as if all provider rows always exist.
   - Current DB state confirms `ai_provider` and `gemini_model` exist, but `anthropic_model` is absent.

### Implementation plan

#### 1) Harden the `ai_settings` data model
Create a migration that normalizes the AI settings rows so the admin panel always has a complete baseline.

Add missing rows with safe defaults:
- `anthropic_model = "claude-sonnet-4-20250514"`
- confirm/seed `ai_provider`
- confirm/seed `gemini_model`
- confirm/seed `lovable_model`

If any of these already exist, keep them unchanged.

This removes the “missing row” failure mode immediately.

#### 2) Make AI settings saves resilient
Update the settings mutation so it does not rely on rows already existing.

Change `useUpdateAISetting` to:
- attempt a keyed upsert instead of update-only, or
- fall back to insert when update returns no row

Also improve the error surfaced to the UI so failures are specific:
- “Couldn’t save provider”
- “Couldn’t save model”
- include the Supabase error message in console output for diagnosis

This makes future settings additions safe too.

#### 3) Prevent silent Coach completions on the frontend
Update `AskCoachPanel.tsx` so the client can detect an empty successful stream.

Add:
- a `receivedAssistantToken` flag while reading the stream
- a final post-stream check:
  - if stream ended with no tokens and no structured error, show a proper coach error state or toast
  - do not silently leave only the user message in chat

Also preserve the user message and surface a clear fallback such as:
- “Coach returned an empty response. Please try again.”
- or a provider-specific message if returned by the backend

#### 4) Make `coach-chat` return explicit diagnostics for empty-output cases
Update `supabase/functions/coach-chat/index.ts` so it never treats “no extracted text” as a successful answer.

For the Gemini path:
- keep the SSE buffering logic
- track whether any text was actually emitted downstream
- if the upstream stream finishes with zero emitted tokens:
  - return a structured JSON error instead of an empty SSE success
  - include safe diagnostics such as:
    - provider
    - model
    - whether PDF grounding was attached
    - whether any candidates were received
    - upstream status when applicable

Also broaden chunk parsing so it handles:
- partial SSE lines
- empty/non-text parts
- final flush cases
- candidate shapes that don’t map cleanly to `parts[].text`

#### 5) Add focused logging so this can be verified quickly
Add lightweight logs in `coach-chat` for:
- resolved provider + model
- request mode (general vs chapter-grounded)
- whether a PDF was attached
- whether any assistant text was emitted
- whether fallback to Anthropic happened
- whether the request ended empty

No secrets and no message content should be logged.

#### 6) Verify the admin panel matches saved state after refresh
After the save-path fix, the panel should:
- save provider changes
- save Gemini model changes
- save Anthropic model changes
- still show the persisted selection after reload/refetch

If needed, slightly tighten the pending-change clearing logic so the UI only clears local pending state after a confirmed successful mutation.

## Files likely affected

- `src/hooks/useAISettings.ts`
- `src/components/coach/AskCoachPanel.tsx`
- `supabase/functions/coach-chat/index.ts`
- new Supabase migration under `supabase/migrations/...`

## Acceptance criteria

### Coach
1. Ask a generic question like “Where are the MCQs?”
   - Either an answer appears, or a clear error appears.
   - No more silent no-answer state.
2. Ask a chapter-grounded question on a chapter page
   - Response streams normally, or returns an explicit structured failure.
3. Logs show provider/model and whether text was emitted.

### Admin AI settings
1. Change Gemini model and save.
2. Change provider and save.
3. Change Anthropic model and save.
4. Refresh the page.
5. All saved values persist and re-render correctly.

## Technical notes

- The current database already shows:
  - `ai_provider = gemini`
  - `gemini_model = gemini-2.5-flash-lite`
  - no `anthropic_model` row
- The current admin save code is update-only, which explains missing-row save failures.
- The current coach client and edge function both allow an empty-success path, which explains “it doesn’t error, but it doesn’t answer.”

