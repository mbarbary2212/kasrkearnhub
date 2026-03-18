

## Gemini TTS Admin UI + Gender-Based Voice Selection

### Changes (4 files)

**1. AISettingsPanel.tsx — VoiceProviderSection (lines 324-447)**

- Add Gemini to providers array (line 344-347), filtered to show only when `isSuperAdmin` is true
- Need to pass `isSuperAdmin` into `VoiceProviderSection` — add it as a prop from the parent (line 72 already has it)
- After the ElevenLabs block (line 443), add a Gemini block when `ttsProvider === 'gemini'`:
  - "Gemini Voice (Male)" dropdown: Kore (default), Puck, Charon, Fenrir, Orus, Zephyr → key `tts_gemini_male_voice`
  - "Gemini Voice (Female)" dropdown: Aoede (default), Leda → key `tts_gemini_female_voice`
  - Each with Save button when pending

**2. CasePreviewEditor.tsx — Voice Character section (lines 462-557)**

- Import `useAISettings` and `getSettingValue`
- Read `tts_provider` from global settings
- When `tts_provider === 'gemini'`: hide the ElevenLabs voice picker and preview button entirely; show informational text: "Using global Gemini voice settings (configured in Admin → Content Factory → Settings)"
- When `tts_provider === 'elevenlabs'`: show existing picker unchanged
- When `tts_provider === 'browser'`: show existing picker unchanged (or hide — currently it only shows for voice mode anyway)

**3. HistoryTakingSection.tsx — Gender-based Gemini voice (line 61)**

- Add `patientGender?: string` to `HistoryTakingProps` interface
- Replace line 61 (`tts_gemini_voice` single key) with gender-aware logic:
  ```
  const ttsGeminiVoice = patientGender === 'female'
    ? getSettingValue(ttsSettings, 'tts_gemini_female_voice', 'Aoede')
    : getSettingValue(ttsSettings, 'tts_gemini_male_voice', 'Kore')
  ```

**4. StructuredCaseRunner.tsx — Pass patientGender prop (line 332)**

- Add one line: `patientGender={generatedData?.patient?.gender}`

No database migrations needed — `ai_settings` already supports arbitrary keys via upsert.

