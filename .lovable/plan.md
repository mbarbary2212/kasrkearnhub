

# Combined Plan: Dialect Fix + TTS Speed + Voice Registry + Per-Case Controls + Admin Timer

## My Thoughts

The current architecture is sound — ElevenLabs STT/TTS with Gemini in the middle. The dialect issue is purely a prompt weakness: rule 10 says "رد بالعامية المصرية" once, buried at the end. Newer Gemini models need heavier reinforcement. The voice IDs are all present in `src/utils/tts.ts` but only usable as a global admin setting — there is no per-case override, which is a real gap for cases with different patient genders/characters.

The idea of a **Voice Registry** (like the Examiner Avatars card) is excellent. Right now, voice IDs are hardcoded in `tts.ts`. If you want to add/remove voices without a code deploy, they should live in the database. This also makes the "contact platform admin" flow consistent — same pattern as avatar requests.

The timer being hardcoded as `estimatedMinutes * 0.4` with no override is a legitimate problem. A 25-min case shouldn't force 10 minutes of history. Admins need direct control.

One concern: the `speed` parameter in ElevenLabs is a **top-level** body param (not inside `voice_settings`). The current edge function doesn't pass it at all, so the default (1.0) applies. This explains the "slightly slow" feeling.

---

## Changes (9 files, 1 new DB table, 1 new component)

### 1. New DB Table: `tts_voices`
Similar to `examiner_avatars`. Stores voice registry entries.

```sql
create table public.tts_voices (
  id serial primary key,
  name text not null,
  elevenlabs_voice_id text not null,
  gender text not null check (gender in ('male', 'female')),
  label text,
  is_active boolean default true,
  display_order int default 0,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.tts_voices enable row level security;
-- Public read for active voices, admin write
```

Seed with the 10 existing voices from `tts.ts`.

### 2. New Component: `src/components/admin/TTSVoicesCard.tsx`
Mirrors `ExaminerAvatarsCard.tsx` pattern exactly:
- Lists all voices (active + inactive) with name, gender, ElevenLabs ID, label
- Add new voice: name + ElevenLabs voice ID + gender + label
- Toggle active/inactive
- Edit name/label inline
- Shows usage count (how many cases use this voice)
- Placed in AdminPage next to ExaminerAvatarsCard

### 3. Hook: `src/lib/ttsVoices.ts`
- `useTTSVoices()` — fetch active voices, similar to `useExaminerAvatars()`
- `useTTSVoiceById(id)` — fetch single voice

### 4. Strengthen Egyptian Dialect
**File**: `supabase/functions/patient-history-chat/index.ts`

Replace rule 10 with stronger enforcement:
```
10. لازم ترد بالعامية المصرية في كل ردودك. ما تستخدمش الفصحى أبداً أبداً.
11. أمثلة: قول "عايز" مش "أريد"، "دلوقتي" مش "الآن"، "إزاي" مش "كيف"، "كده" مش "هكذا"، "عشان" مش "لأن"، "مفيش" مش "لا يوجد".
```

Add a closing reminder after the knowledge block:
```
تذكير مهم: كل ردودك لازم تكون بالعامية المصرية. لو لقيت نفسك بتكتب فصحى، غيّرها فوراً.
```

### 5. Pass Speed to ElevenLabs TTS
**File**: `supabase/functions/elevenlabs-tts/index.ts`
- Accept `speed` from request body (default 1.1)
- Pass as top-level param in ElevenLabs API body (alongside `voice_settings`, not inside it)

**File**: `src/utils/tts.ts`
- In `speakArabic()`, extract speed from `getToneVoiceSettings()` and include in edge function request body
- Bump calm default speed from 1.0 to 1.1

### 6. Per-Case Voice + Timer + Tone in Editor
**File**: `src/components/clinical-cases/CasePreviewEditor.tsx`

Expand the "History Interaction" card (currently `sm:w-56`) to `flex-1`:
- **History mode** (text/voice) — existing
- **Patient Tone** — move here from Patient Info card (remove from lines 487-513)
- **Voice Character** — new dropdown, fetches from `tts_voices` table, filtered by patient gender, stored as `patient.voice_id` in `generated_case_data`. Only shown when mode is "voice"
- **History Time Limit** — number input (minutes), stored as `history_time_limit_minutes` in `generated_case_data`, default hint shown as `Math.ceil(estimatedMinutes * 0.4)`
- Below voice dropdown: "Can't find the right voice? Contact **platform admin**" — where "platform admin" is a hyperlink. Clicking it opens the same request dialog pattern as avatar requests, sending a notification + email to platform/super admins

### 7. Wire Per-Case Overrides in Runner
**File**: `src/components/clinical-cases/StructuredCaseRunner.tsx`
- Extract `history_time_limit_minutes` and `patient.voice_id` from `generatedData`
- Pass as new props to `HistoryTakingSection`

**File**: `src/components/clinical-cases/sections/HistoryTakingSection.tsx`
- Add props: `historyTimeLimitMinutes?: number`, `voiceIdOverride?: string`
- Timer (line 126-128): use `historyTimeLimitMinutes` when provided, else fall back to `estimatedMinutes * 0.4`
- TTS calls (lines 191-195, 869-874): prefer `voiceIdOverride` over the global admin setting when present

### 8. Admin Page Integration
**File**: `src/pages/AdminPage.tsx`
- Import and render `TTSVoicesCard` next to `ExaminerAvatarsCard`

### 9. Clean Up Hardcoded Voices
**File**: `src/utils/tts.ts`
- Keep `ELEVENLABS_VOICES` as a static fallback, but the editor and runner will prefer DB voices when available
- The `AISettingsPanel` voice selector will also read from DB voices instead of the hardcoded list (future improvement, not blocking)

---

## Summary

| Area | Change | Files |
|---|---|---|
| Dialect | Stronger Egyptian prompt + closing reminder | `patient-history-chat/index.ts` |
| Speed | Pass speed param, bump default to 1.1 | `elevenlabs-tts/index.ts`, `tts.ts` |
| Voice Registry | New DB table + admin CRUD card | DB migration, `TTSVoicesCard.tsx`, `ttsVoices.ts`, `AdminPage.tsx` |
| Per-case controls | Voice, tone, timer in editor | `CasePreviewEditor.tsx` |
| Runner wiring | Pass overrides to HistoryTakingSection | `StructuredCaseRunner.tsx`, `HistoryTakingSection.tsx` |
| Contact admin | Hyperlink → notification + email to platform admins | `CasePreviewEditor.tsx` |

No breaking changes. All new fields stored in existing `generated_case_data` JSONB. Voice registry table is additive. Edge functions need redeployment.

