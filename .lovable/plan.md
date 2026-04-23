

# Restructure Interactive Case AI into 3 independent control surfaces + wire Phase 2

## Your mental model (confirmed correct)

You want **three fully independent decisions**, none of them coupled:

| # | Stage | Where it's controlled today | Where it should live |
|---|---|---|---|
| 1 | **Authoring** — generate the case content (history script, exam findings, rubrics, etc.) | "Model per Content Type" (`Interactive Cases` row → `interactive_case` override) | **Stays exactly where it is.** Admin already controls this per content type. |
| 2 | **Live playback** — patient reasoning + replies during the conversation | Hardcoded to global provider | **New independent setting**: `interactive_case_provider` + `interactive_case_model` (already saved as `gemini-2.5-pro` in DB) |
| 3 | **Marking** — score the student's answers after the case ends | Same global provider as everything else | **New independent setting**: `interactive_case_marking_provider` + `interactive_case_marking_model` |

STT (ElevenLabs) and TTS (Browser/ElevenLabs/Gemini) stay as they are today — already independent.

## What changes in the UI

The "Interactive Case AI" card gets restructured. The current "Generation logic" tab is renamed and split into two clearly-labelled sub-pickers, plus a new pointer to where authoring is controlled:

```text
┌─ Interactive Case AI ──────────────────────────────────────┐
│ Tabs: [Live playback] [Marking] [Speech input] [Voice out] │
│                                                            │
│ ── Live playback (NEW LABEL) ───────────────────────────── │
│   "Used during the conversation: patient understanding     │
│    + reply generation. Pick fast model for low latency."   │
│   Provider: [Gemini ▾]   Model: [gemini-2.5-flash ▾]      │
│   [Save Live Playback Settings]                            │
│                                                            │
│ ── Marking (NEW TAB) ───────────────────────────────────── │
│   "Used after the case to score student answers. Pick a    │
│    stronger model for accuracy — latency doesn't matter."  │
│   Provider: [Anthropic ▾]   Model: [claude-sonnet-4 ▾]    │
│   [Save Marking Settings]                                  │
│                                                            │
│ ── Speech input (STT) ─── (unchanged static info) ──────── │
│ ── Voice output (TTS) ─── (unchanged 3-card picker) ────── │
│                                                            │
│ ─ Footer hint ──────────────────────────────────────────── │
│   "Authoring (case generation from PDFs) is controlled in  │
│    Model per Content Type → Interactive Cases."            │
└────────────────────────────────────────────────────────────┘
```

Default tab opens on **Live playback** (most common change). Each tab's provider/model picker is fully independent — changing one never resets another.

## Phase 2 wiring (backend)

### `supabase/functions/patient-history-chat/index.ts` (Live playback)
Replace the generic `getAIProvider(aiSettings)` with a dedicated resolver that reads `interactive_case_provider` + `interactive_case_model` from `ai_settings` and falls back to the global provider only if unset. Keep `callAIWithMessages` signature identical.

### `supabase/functions/score-case-answers/index.ts` (Marking)
Same pattern, but reads `interactive_case_marking_provider` + `interactive_case_marking_model`. Falls back to global provider if unset (so existing scoring keeps working with no settings change required).

### `supabase/functions/_shared/ai-provider.ts`
Add two helpers:
- `getInteractiveCaseProvider(settings, overrides)` — resolves Live playback provider+model with fallback
- `getInteractiveCaseMarkingProvider(settings, overrides)` — resolves Marking provider+model with fallback

Also fix the `'lovable' | 'gemini' | 'anthropic'` validation list on line 77 to include `'groq'` — it's currently missing, which silently downgrades Groq picks to Gemini.

### Authoring (no change)
`generate-structured-case`, `generate-vp-case`, `run-ai-case` already use `getModelForContentType(settings, "structured_case", overrides)` / `"ai_case"`. Authoring is already separated and respects "Model per Content Type" — confirmed in the DB you have `interactive_case` mapped to `gemini-3.1-pro-preview`. No changes needed.

## Files modified

| File | Change |
|---|---|
| `src/components/admin/AISettingsPanel.tsx` | Split "Generation logic" tab into "Live playback" + "Marking", add new state for `interactive_case_marking_provider/model`, change `defaultValue` to `"logic"` → `"live"`, add footer hint pointing to "Model per Content Type" for authoring |
| `supabase/functions/_shared/ai-provider.ts` | Add `getInteractiveCaseProvider` + `getInteractiveCaseMarkingProvider` helpers; fix Groq validation gap on line 77 |
| `supabase/functions/patient-history-chat/index.ts` | Use new Live playback resolver instead of global `getAIProvider` |
| `supabase/functions/score-case-answers/index.ts` | Use new Marking resolver instead of global `getAIProvider` |

No DB migration. No new secrets needed beyond the existing `GROQ_API_KEY` (already used by the shared `callGroqDirect`).

## Behaviour after Phase 2 lands

- **Authoring** (Generate Case button in admin) → keeps using `Model per Content Type → Interactive Cases` (currently `gemini-3.1-pro-preview`).
- **Live playback** (student talking to the patient) → uses `interactive_case_provider/model` (currently `gemini-2.5-pro`). You can now switch this to Groq for speed without affecting anything else.
- **Marking** (post-case scoring) → uses `interactive_case_marking_provider/model`. Unset until you pick one in the new tab; falls back to global Gemini until then, so nothing breaks on day one.
- **STT/TTS** → unchanged.

## QA checklist after switch to default mode

1. Card now shows 4 tabs; "Live playback" is the default open tab.
2. Picking Groq + a Groq model in **Live playback** and saving → start an interactive case → check `patient-history-chat` logs show `provider: groq`.
3. Picking Anthropic in **Marking** and saving → finish a case → check `score-case-answers` logs show `provider: anthropic`.
4. Leaving Marking unset → scoring still runs (falls back to global Gemini).
5. Changing the **Interactive Cases** row in "Model per Content Type" → only affects new case authoring, not playback or marking.
6. STT block + TTS card behaviour identical to today.

## Rollback

Revert the 4 files. No DB changes to undo. Existing `interactive_case_provider/model` rows in `ai_settings` become inert again — harmless.

