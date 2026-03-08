

## Plan: TTS Provider Switcher — Browser + ElevenLabs (Streaming)

### Step 1 — Database Migration
Insert 4 rows into `ai_settings`:
- `tts_provider` → `"browser"` (default)
- `tts_voice_gender` → `"male"`
- `tts_elevenlabs_male_voice` → `"DWMVT5WflKt0P8OPpIrY"` (Hanafi)
- `tts_elevenlabs_female_voice` → `"RCubfxZlU5rlyEKAEsSN"` (Fatma)

### Step 2 — Edge Function: `supabase/functions/elevenlabs-tts/index.ts`
- Accepts POST `{ text, voiceId }`
- Calls ElevenLabs **streaming** endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`
- Uses `xi-api-key: Deno.env.get('ELEVENLABS_API_KEY')` header (NOT `Authorization: Bearer`)
- Model: `eleven_multilingual_v2`, stability 0.5, similarity_boost 0.75
- Streams response body directly back with `Content-Type: audio/mpeg`
- Standard CORS headers
- `ELEVENLABS_API_KEY` already exists in secrets

### Step 3 — Config: `supabase/config.toml`
Add `[functions.elevenlabs-tts]` with `verify_jwt = false` (line ~97).

### Step 4 — New file: `src/utils/tts.ts`
- Exports `ELEVENLABS_VOICES` registry (7 male, 3 female with IDs/names/labels)
- Exports `speakArabic(text, provider, voiceId?)`:
  - `'browser'` → Web Speech API (`ar-EG`, rate 1.1)
  - `'elevenlabs'` → `fetch()` to edge function URL (using `VITE_SUPABASE_URL`), auth via `Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}` + `apikey` header, `.blob()` → `new Audio()` → `.play()`
  - Falls back to browser on any error

### Step 5 — Update `HistoryTakingSection.tsx`
- Load `tts_provider`, `tts_voice_gender`, `tts_elevenlabs_male_voice`, `tts_elevenlabs_female_voice` via `useAISetting()` or bulk `useAISettings()` + `getSettingValue()`
- Derive `activeVoiceId` from gender + per-gender voice
- Replace both TTS blocks (lines ~102-108 and ~597-603) with `speakArabic(reply, ttsProvider, activeVoiceId)`
- No changes to speech recognition / microphone

### Step 6 — Admin UI: `AISettingsPanel.tsx`
Add a "Voice Provider" card after line ~297 (after the Provider Notes section, before ContentTypeModelSection). Uses same `handleChange`/`handleSave` pattern:
- **Browser** card — "Free, works on all devices."
- **ElevenLabs** card — "Authentic Egyptian Arabic voices."
  - When selected: gender toggle (Male/Female) + voice radio list from `ELEVENLABS_VOICES[gender]`
  - Saves voice ID to `tts_elevenlabs_male_voice` or `tts_elevenlabs_female_voice`
- Gender toggle and voice picker hidden when Browser is selected

### Auth header clarification
- **Client → Edge Function**: `Authorization: Bearer <supabase_anon_key>` + `apikey: <supabase_anon_key>`
- **Edge Function → ElevenLabs**: `xi-api-key: <ELEVENLABS_API_KEY>` (NOT Bearer)

### Files Summary
| File | Action |
|------|--------|
| `ai_settings` table | Insert 4 rows |
| `supabase/functions/elevenlabs-tts/index.ts` | Create |
| `supabase/config.toml` | Add 1 entry |
| `src/utils/tts.ts` | Create |
| `src/components/clinical-cases/sections/HistoryTakingSection.tsx` | Replace 2 TTS blocks |
| `src/components/admin/AISettingsPanel.tsx` | Add Voice Provider section |

