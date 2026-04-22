

# Phase 1 — Groq scoped to Interactive Cases only, with independent picks for Generation, STT, and TTS

## Confirming your model (this is exactly what you'll get)

Three **fully independent** pickers inside the new "Interactive Case AI" card. Choosing one does NOT affect the others, and none of them affect the global AI Factory.

| Subtab | What it controls | Provider choices | Model choices |
|---|---|---|---|
| **Generation logic** | The LLM that runs the patient's understanding, response generation, and case marking inside Interactive Cases | Lovable, Gemini, Anthropic, **Groq** | Filtered from `ai_model_catalog` by chosen provider |
| **Speech input (STT)** | The speech-to-text engine that transcribes the student's voice | ElevenLabs Scribe (current), with room for future providers | Read-only info in Phase 1 |
| **Voice output (TTS)** | The voice that speaks the patient's reply | Browser, ElevenLabs, Gemini (existing) | Existing male/female voice registries |

So yes — you can set **Generation = Groq**, **STT = ElevenLabs**, **TTS = Gemini** at the same time. Or any other combination. They are saved as separate `study_settings` keys and read independently.

The global "AI Content Factory" card stays exactly as it is today (Lovable / Gemini / Anthropic only, no Groq, no changes to its content-type table or its logic).

## What Mohamed will see in preview

In **Admin → AI Settings**:

1. **AI Content Factory Settings** card → unchanged. No Groq tile. No change to "Model per Content Type". Same save flow.
2. **Voice Provider (TTS)** card → renamed to **"Interactive Case AI"** and reorganized into 3 subtabs using the existing `Tabs` primitive:
   - **Generation logic** → independent Provider dropdown (Lovable / Gemini / Anthropic / Groq) + Model dropdown filtered from `ai_model_catalog` by that provider. Persists to new keys `interactive_case_provider` and `interactive_case_model`. Includes a small caption: *"Used for the patient's understanding, replies, and case marking. Independent of the global AI provider."*
   - **Speech input (STT)** → static info block (ElevenLabs Scribe v2 realtime, VAD 1.5s) + link hint to Perf Logs. No new controls in Phase 1.
   - **Voice output (TTS)** → existing Browser / ElevenLabs / Gemini provider cards, gendered voice pickers, `TTSVoicesCard`, `GeminiVoicesCard`. Identical behaviour to today, just nested here.
3. **Manage AI Models** → adds a Groq group so you can register Groq model IDs (e.g. `llama-3.3-70b-versatile`). Groq models surface ONLY in the Generation logic dropdown above. They do not appear in the global factory.

No student-facing changes. No DB migration. No edge-function changes in Phase 1.

## Files touched (exactly these)

1. **`src/hooks/useAIModelCatalog.ts`** — extend `AIProvider` union to include `'groq'`.
2. **`src/components/admin/ManageModelsPanel.tsx`** — add `{ value: 'groq', label: 'Groq (Llama / Mixtral)' }` to `PROVIDERS`; initialise `groq: []` in the grouping accumulator.
3. **`src/components/admin/AISettingsPanel.tsx`** — scoped edits only:
   - Do NOT add Groq to `AI_PROVIDERS` (global factory grid stays as-is).
   - Do NOT modify `ContentTypeModelSection`.
   - Rename `VoiceProviderSection` → `InteractiveCaseSection`, retitle the card "Interactive Case AI", wrap its body in `<Tabs defaultValue="tts">` with three triggers: Generation logic / Speech input / Voice output.
   - **Generation logic** subtab: new Provider+Model picker reading/writing `interactive_case_provider` and `interactive_case_model` via the existing `useAISettings` getter and `pendingChanges` save flow. Independent of every other key.
   - **Speech input** subtab: static info block.
   - **Voice output** subtab: existing TTS provider cards + voice registries moved verbatim. No internal logic change.

## Files explicitly NOT touched

- `supabase/functions/patient-history-chat/**`, `ai-provider.ts` — backend already routes Groq when called with `provider='groq'`. Wiring `interactive_case_provider` into runtime is **Phase 2** (separate prompt) so you can verify the UI in isolation first.
- Global `ai_provider` / `ai_model` / `content_type_model_overrides` rows.
- `useAISettings`, `useAIModelCatalog` query logic, `ProviderModelCard`, `TTSVoicesCard`, `GeminiVoicesCard` internals.
- Student UI, study coach, FSRS, tour styling, study groups, Connect badges.

## What stays identical (regression checks)

- Global AI Factory card looks and behaves exactly as today.
- Saving a different global provider behaves identically.
- TTS provider selection, voice registries, ElevenLabs/Gemini voice persistence — unchanged.
- Existing `clinical_case` row in "Model per Content Type" remains (still readable until Phase 2 supersedes it at runtime).

## Required follow-up (Phase 2, separate prompt)

Make `patient-history-chat` (and any sibling Interactive Case edge function) read `interactive_case_provider` / `interactive_case_model` from `study_settings` instead of the global `ai_provider` / `ai_model`. Phase 1 ships the UI + setting persistence only, so you can confirm the picker layout and the independence model before runtime is rewired.

## Pre-deploy required

`GROQ_API_KEY` must be added in Lovable Cloud Secrets before Phase 2 takes effect. Phase 1 does not require it.

## Verification (preview, before production)

1. Admin → AI Settings → confirm AI Content Factory card is unchanged (no Groq, no layout change).
2. Scroll to "Interactive Case AI" → confirm 3 subtabs render.
3. Generation logic → set Provider = Groq, pick a Groq model → Save → reload → setting persists. Switch to Anthropic, then Gemini — dropdown filters correctly each time.
4. Voice output → confirm Browser / ElevenLabs / Gemini cards and voice registries behave exactly as before. Confirm changing TTS does NOT change Generation logic and vice versa.
5. Speech input → confirm static info block renders.
6. Manage AI Models → confirm Groq group renders and Add-model dialog includes Groq.
7. Confirm no change in student-facing Interactive Cases yet (expected — Phase 2 wires the runtime).

## Rollback

Revert the 3 edited files. No DB or edge-function changes to undo.

