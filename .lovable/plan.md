

## Plan: Move TTS Voices into Content Factory Settings

### Rationale
The TTS Voices card (ElevenLabs voice registry) logically belongs next to the Voice Provider switcher (Gemini/ElevenLabs/Browser) in Content Factory → Settings, not in Platform Settings.

### Changes (2 files)

**1. `src/pages/AdminPage.tsx` — Remove TTSVoicesCard from Platform Settings**

Remove lines 202-206 (the grid containing ExaminerAvatarsCard + TTSVoicesCard). Keep ExaminerAvatarsCard as a standalone element. Remove the TTSVoicesCard import if it becomes unused here.

Before:
```
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
  <ExaminerAvatarsCard />
  <TTSVoicesCard />
</div>
```

After:
```
<ExaminerAvatarsCard />
```

**2. `src/components/admin/AISettingsPanel.tsx` — Add TTSVoicesCard inside VoiceProviderSection**

Import `TTSVoicesCard` and render it at the bottom of the `VoiceProviderSection`, conditionally shown only when `ttsProvider === 'elevenlabs'`. This way:
- When ElevenLabs is selected → Voice Provider card + TTS Voices registry card appear together
- When Gemini is selected → Voice Provider card + Gemini voice dropdowns (no ElevenLabs registry needed)
- When Browser is selected → Voice Provider card only

### Result
All voice-related configuration lives in one place: Content Factory → Settings → Voice Provider section.

