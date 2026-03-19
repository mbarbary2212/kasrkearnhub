

## Sentence-Level TTS Pipelining + Typewriter Text

**Single file**: `HistoryTakingSection.tsx`

### Changes

**1. New state** (near line 108)
- Add `const [displayedText, setDisplayedText] = useState('')`

**2. Helper function `fetchGeminiAudio`** (before `sendChatMessage`)
- Extracts the fetch-to-blobUrl logic into a reusable async function
- Returns `string | null`

**3. Replace Gemini TTS block (lines 269-291) with pipeline loop**
- Split reply into sentences: `reply.split(/(?<=[.!?؟،])\s+/).map(s=>s.trim()).filter(Boolean)`
- Prefetch sentence[0], then in loop: await current, prefetch next
- First sentence starts → `setIsSending(false)` (perceived latency drop)
- Each sentence triggers typewriter animation of its words (80ms interval)
- After loop: `setDisplayedText(reply)` as safety net

**4. Reset `displayedText`** 
- Set `setDisplayedText('')` at start of `sendChatMessage` (line ~239, before `setIsSending(true)`)
- This ensures previous typewriter text clears when the student sends a new message

**5. Voice bubble rendering** (line 828)
- Change `{lastAiMessage || '\u00A0'}` → `{displayedText || lastAiMessage || '\u00A0'}`
- Auto-scroll via `voiceBubbleRef.current?.scrollTo(...)` after each word append

**Unchanged**: Greeting handler, ElevenLabs block, browser TTS, gemini-tts edge function, tts.ts

