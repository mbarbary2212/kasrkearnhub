

## Performance Timing Admin Tab — Database-Backed with History

### Overview
Add a `chat_perf_logs` table to store timing data from each voice chat round-trip. Instrument the client-side pipeline and edge functions to capture step durations. Add a new "Performance Logs" tab in the Admin Panel (under System group) showing a searchable, filterable table of historical timing data.

### Architecture

```text
Client (HistoryTakingSection)          Edge Functions                  Database
─────────────────────────────          ──────────────                  ────────
 start(stt_commit)                     
 end(stt_commit) ─────────────────►    
                                       patient-history-chat
 start(chat_api)                         start(db_fetch)
                                         end(db_fetch)
                                         start(ai_call)
                                         end(ai_call)
 end(chat_api) ◄──────────────────     return _timing in body
                                       
 start(tts_api) ──────────────────►    gemini-tts / elevenlabs-tts
                                         start(api_call)
                                         end(api_call)
 end(tts_api) ◄───────────────────     return X-Timing header
                                       
 start(audio_play)                     
 end(audio_play)                       
                                       
 ── Collect all timings ──             
 INSERT into chat_perf_logs ──────────────────────────────────► chat_perf_logs
```

### Step 1: Database Table

Create `chat_perf_logs` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| user_id | uuid (refs auth.users) | Student who triggered |
| case_id | uuid | Clinical case ID |
| created_at | timestamptz | When the round-trip occurred |
| stt_ms | int | Speech-to-text duration |
| chat_api_ms | int | Total patient-history-chat call |
| chat_db_ms | int | Server-side DB fetch (from _timing) |
| chat_ai_ms | int | Server-side AI call (from _timing) |
| tts_api_ms | int | Total TTS edge function call |
| tts_generation_ms | int | Server-side TTS generation (from X-Timing) |
| audio_download_ms | int | Blob download time |
| audio_play_ms | int | Audio playback duration |
| total_ms | int | Full round-trip |
| tts_provider | text | 'gemini' or 'elevenlabs' |
| metadata | jsonb | Extra info (language, voice, blob size) |

RLS: Admins can SELECT all rows. Students can INSERT their own rows (user_id = auth.uid()). No public reads.

### Step 2: Instrument Edge Functions

**`patient-history-chat/index.ts`**: Add `Date.now()` markers around the DB fetch and AI call. Include a `_timing` object in the JSON response body:
```json
{ "reply": "...", "_timing": { "db_ms": 45, "ai_ms": 1180, "total_ms": 1230 } }
```

**`gemini-tts/index.ts`** and **`elevenlabs-tts/index.ts`**: Add `Date.now()` markers. Return timing via `X-Timing` response header:
```
X-Timing: generation_ms=1200,total_ms=1250
```

### Step 3: Instrument Client — `HistoryTakingSection.tsx`

In `sendChatMessage`, wrap each pipeline step with `performance.now()` markers:
- `stt_ms` — time from scribe commit to sendChatMessage entry (tracked via a ref set on commit)
- `chat_api_ms` — around `supabase.functions.invoke('patient-history-chat')`
- Parse `_timing` from response for `chat_db_ms` and `chat_ai_ms`
- `tts_api_ms` — around the TTS fetch call
- Parse `X-Timing` header for `tts_generation_ms`
- `audio_download_ms` — from fetch response to blob ready
- `audio_play_ms` — from `audio.play()` to `audio.onended`
- `total_ms` — full round-trip

After collection, insert into `chat_perf_logs` via `supabase.from('chat_perf_logs').insert(...)`.

### Step 4: Admin UI Tab — `PerfLogsTab.tsx`

New component under `src/components/admin/PerfLogsTab.tsx`:
- Table with columns: Time, User, Case, STT, Chat API (DB + AI breakdown), TTS API (generation breakdown), Audio Play, Total
- Color-code cells: green <500ms, yellow 500-1500ms, red >1500ms
- Filters: date range, user search, case search, TTS provider
- Sort by any column
- Show averages row at the bottom
- Pagination (25 per page)

### Step 5: Wire into Admin Panel

- Add "Performance" tab to `AdminTabsNavigation.tsx` under the System group (visible to super_admin and platform_admin)
- Add corresponding `TabsContent` in `AdminPage.tsx`

### Files Modified
- **Migration**: New `chat_perf_logs` table + RLS policies
- **Edge functions**: `patient-history-chat/index.ts`, `gemini-tts/index.ts`, `elevenlabs-tts/index.ts` (add timing instrumentation)
- **Client**: `src/components/clinical-cases/sections/HistoryTakingSection.tsx` (collect + insert timings)
- **New**: `src/components/admin/PerfLogsTab.tsx` (admin UI)
- **Modified**: `src/components/admin/AdminTabsNavigation.tsx`, `src/pages/AdminPage.tsx` (add tab)

### Technical Notes
- Client-side timing uses `performance.now()` for sub-millisecond accuracy
- Edge function timing uses `Date.now()` (Deno runtime)
- Insert is fire-and-forget (no await) to avoid slowing down the voice pipeline
- The `_timing` field and `X-Timing` header are additive — they don't break existing behavior

