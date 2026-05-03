import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getAISettings,
  getAIProvider,
  resolveApiKey,
  logAIUsage,
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITEMS_PER_BATCH = 20;
const MAX_TOTAL_ITEMS = 200;

/** Attempt to extract valid assignments from truncated JSON */
function repairAndExtractAssignments(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw);
  } catch (_) {
    // Fall through to repair
  }

  const results: Record<string, any> = {};
  const entryPattern = /\"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\"\s*:\s*\{\s*\"section_id\"\s*:\s*\"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\"\s*,\s*\"confidence\"\s*:\s*\"(high|medium|low)\"\s*\}/g;

  let match;
  while ((match = entryPattern.exec(raw)) !== null) {
    results[match[1]] = { section_id: match[2], confidence: match[3] };
  }

  return Object.keys(results).length > 0 ? results : null;
}

function parseTimestamp(ts: string | undefined | null): number | null {
  if (!ts) return null;
  const parts = ts.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function cleanJson(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return s;
}

async function geminiTextCall(
  prompt: string,
  model: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    console.error(`[gemini-text] ${response.status}:`, err);
    return null;
  }
  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function geminiVideoCall(
  videoUrl: string,
  prompt: string,
  model: string,
  apiKey: string,
  maxTokens = 2048,
): Promise<{ text: string | null; error?: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { fileData: { mimeType: "video/*", fileUri: videoUrl } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    console.error(`[gemini-video] ${response.status}:`, err);
    return { text: null, error: `HTTP ${response.status}: ${err}` };
  }
  const result = await response.json();
  return { text: result.candidates?.[0]?.content?.parts?.[0]?.text ?? null };
}

interface TranscriptEntry {
  timestamp: string; // MM:SS
  text: string;
}

function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(safeSeconds / 3600);
  const mm = Math.floor((safeSeconds % 3600) / 60);
  const ss = safeSeconds % 60;

  if (hh > 0) {
    return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  }
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

async function fetchYouTubePlayerData(videoId: string): Promise<{ data: any | null; error?: string }> {
  const clients = [
    {
      name: "ANDROID",
      version: "17.31.35",
      headers: {
        "User-Agent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip",
        "X-YouTube-Client-Name": "3",
        "X-YouTube-Client-Version": "17.31.35",
      },
      client: {
        clientName: "ANDROID",
        clientVersion: "17.31.35",
        androidSdkVersion: 30,
        hl: "en",
        gl: "US",
        utcOffsetMinutes: 0,
      },
    },
    {
      name: "IOS",
      version: "19.09.3",
      headers: {
        "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)",
        "X-YouTube-Client-Name": "5",
        "X-YouTube-Client-Version": "19.09.3",
      },
      client: {
        clientName: "IOS",
        clientVersion: "19.09.3",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "17.5.1.21F90",
        hl: "en",
        gl: "US",
        utcOffsetMinutes: 0,
      },
    },
    {
      name: "WEB",
      version: "2.20260501.01.00",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20260501.01.00",
      },
      client: {
        clientName: "WEB",
        clientVersion: "2.20260501.01.00",
        hl: "en",
        gl: "US",
        utcOffsetMinutes: 0,
      },
    },
  ];

  let lastError = "";

  for (const clientConfig of clients) {
    try {
    const playerResp = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...clientConfig.headers,
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: JSON.stringify({
          context: {
            client: clientConfig.client,
          },
          contentCheckOk: true,
          racyCheckOk: true,
          videoId,
        }),
      },
    );

    if (!playerResp.ok) {
      const errText = await playerResp.text();
        lastError = `${clientConfig.name} InnerTube ${playerResp.status}: ${errText.slice(0, 200)}`;
        console.warn(`[youtube-player] ${lastError}`);
        continue;
    }

      const data = await playerResp.json();
      return { data };
    } catch (e) {
      lastError = `${clientConfig.name} InnerTube error: ${e}`;
      console.warn(`[youtube-player] ${lastError}`);
    }
  }

  return { data: null, error: lastError || "All InnerTube clients failed" };
}

/**
 * Fetch auto-generated captions via YouTube's InnerTube API (Android client).
 * This bypasses GDPR consent pages and bot detection that breaks regular page scraping.
 * YouTube generates ASR captions for virtually all videos including Arabic ones.
 */
async function fetchYouTubeTranscript(
  videoId: string,
): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  // Use the Android InnerTube client — more reliable from server environments
  const { data: playerData, error: playerError } = await fetchYouTubePlayerData(videoId);
  const tracks: Array<{ baseUrl: string; languageCode?: string; kind?: string }> | null =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? null;

  if (!tracks || tracks.length === 0) {
    return { entries: [], error: playerError || "No caption tracks found via InnerTube API" };
  }

  // Prefer Arabic ASR > Arabic manual > English ASR > English manual > first available
  const asrAr = tracks.find((t) => t.kind === "asr" && t.languageCode?.startsWith("ar"));
  const manualAr = tracks.find((t) => t.languageCode?.startsWith("ar"));
  const asrEn = tracks.find((t) => t.kind === "asr" && t.languageCode?.startsWith("en"));
  const manualEn = tracks.find((t) => t.languageCode?.startsWith("en"));
  const chosen = asrAr || manualAr || asrEn || manualEn || tracks[0];

  console.log(
    `[transcript] Track: lang=${chosen.languageCode} kind=${chosen.kind || "manual"} (${tracks.length} total)`,
  );

  // Download the transcript in json3 format
  let transcriptData: { events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }> };
  try {
    const transcriptUrl = chosen.baseUrl.includes("fmt=")
      ? chosen.baseUrl
      : `${chosen.baseUrl}&fmt=json3`;
    const tResp = await fetch(transcriptUrl, {
      headers: {
        "User-Agent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip",
      },
    });
    if (!tResp.ok) {
      return { entries: [], error: `Transcript download failed: ${tResp.status}` };
    }
    transcriptData = await tResp.json();
  } catch (e) {
    return { entries: [], error: `Transcript download error: ${e}` };
  }

  if (!transcriptData.events || transcriptData.events.length === 0) {
    return { entries: [], error: "Transcript has no events" };
  }

  const entries: TranscriptEntry[] = [];
  for (const event of transcriptData.events) {
    if (!event.segs || event.tStartMs == null) continue;
    const text = event.segs
      .map((s) => (s.utf8 || "").replace(/\n/g, " "))
      .join("")
      .trim();
    if (!text || text === " ") continue;
    const startSec = Math.floor(event.tStartMs / 1000);
    const mm = Math.floor(startSec / 60).toString().padStart(2, "0");
    const ss = (startSec % 60).toString().padStart(2, "0");
    entries.push({ timestamp: `${mm}:${ss}`, text });
  }

  return { entries };
}

async function fetchYouTubeAudioUrl(videoId: string): Promise<{ url: string | null; error?: string }> {
  const { data: playerData, error } = await fetchYouTubePlayerData(videoId);
  if (!playerData) return { url: null, error };

  const audioFormats = (playerData.streamingData?.adaptiveFormats || [])
    .filter((f: any) => f.url && f.mimeType?.startsWith("audio/"))
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

  const chosen = audioFormats.find((f: any) => f.mimeType?.includes("mp4")) || audioFormats[0];
  if (!chosen?.url) {
    return { url: null, error: "No direct YouTube audio stream found" };
  }

  console.log(`[groq-transcript] Audio stream: ${chosen.mimeType || "unknown"} ${chosen.audioQuality || ""}`);
  return { url: chosen.url };
}

async function fetchGroqTranscriptFromYouTube(
  videoId: string,
  groqApiKey: string,
): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  const { url, error: audioError } = await fetchYouTubeAudioUrl(videoId);
  if (!url) return { entries: [], error: audioError || "No YouTube audio URL" };

  const form = new FormData();
  form.append("model", "whisper-large-v3-turbo");
  form.append("url", url);
  form.append("language", "ar");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append(
    "prompt",
    "محاضرة طبية باللهجة المصرية والعربية مع مصطلحات طبية إنجليزية. اكتب الكلام كما هو قدر الإمكان.",
  );

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}` },
    body: form,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[groq-transcript] ${response.status}:`, err.slice(0, 500));
    return { entries: [], error: `Groq ${response.status}: ${err.slice(0, 300)}` };
  }

  const result = await response.json();
  const segments = Array.isArray(result.segments) ? result.segments : [];
  if (segments.length === 0) {
    const text = typeof result.text === "string" ? result.text.trim() : "";
    return text
      ? { entries: [{ timestamp: "00:00", text }] }
      : { entries: [], error: "Groq returned no transcript segments" };
  }

  const entries = segments
    .map((s: { start?: number; text?: string }) => ({
      timestamp: formatTimestamp(s.start || 0),
      text: (s.text || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((e: TranscriptEntry) => e.text);

  return entries.length > 0
    ? { entries }
    : { entries: [], error: "Groq transcript segments were empty" };
}

/**
 * Match transcript entries to curriculum sections using a single Gemini text call.
 */
async function matchTranscriptToSections(
  entries: TranscriptEntry[],
  sections: Array<{ id: string; name: string; ilo?: string }>,
  model: string,
  apiKey: string,
): Promise<Array<{ section_id: string; start_time_seconds: number }>> {
  if (!entries.length || !sections.length) return [];

  // Limit transcript to ~40k chars to stay within context limits
  const full = entries.map((e) => `${e.timestamp}: ${e.text}`).join("\n");
  const transcript = full.length > 40000
    ? full.slice(0, 40000) + "\n[transcript truncated]"
    : full;

  const sectionList = sections
    .map((s) => {
      let line = `- ID: "${s.id}" | Name: "${s.name}"`;
      if (s.ilo) line += ` | Learning objective: "${s.ilo}"`;
      return line;
    })
    .join("\n");

  const prompt = `You are a medical curriculum organizer. Analyze this lecture transcript and identify which curriculum sections are taught, along with the exact timestamp where the doctor starts each section.

CURRICULUM SECTIONS:
${sectionList}

LECTURE TRANSCRIPT (timestamp: spoken text):
${transcript}

RULES:
1. Only include a section if the doctor clearly and substantively teaches that clinical topic — not just a brief mention.
2. Use the earliest timestamp in the transcript where the main discussion of that section begins.
3. Each section appears at most once.
4. If a section is not covered, do not include it.
5. Return raw JSON only — no markdown.

RESPONSE FORMAT:
{"matches": [{"section_id": "uuid", "start_time": "MM:SS"}, ...]}`;

  const raw = await geminiTextCall(prompt, model, apiKey, 1024);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(cleanJson(raw));
    if (!Array.isArray(parsed?.matches)) return [];

    const validIds = new Set(sections.map((s) => s.id));
    return parsed.matches
      .map((m: { section_id: string; start_time: string }) => ({
        section_id: m.section_id,
        start_time_seconds: parseTimestamp(m.start_time) ?? 0,
      }))
      .filter((m: { section_id: string }) => validIds.has(m.section_id));
  } catch (e) {
    console.error("[match] Parse failed:", e, raw?.slice(0, 300));
    return [];
  }
}

/**
 * Fallback: use Gemini video understanding for videos without any captions.
 * Works for videos up to ~2 hours with gemini-2.0-flash (1fps sampling).
 */
async function matchVideoToSections(
  videoId: string,
  sections: Array<{ id: string; name: string; ilo?: string }>,
  model: string,
  apiKey: string,
): Promise<{ matches: Array<{ section_id: string; start_time_seconds: number }>; error?: string }> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const sectionList = sections
    .map((s) => {
      let line = `- ID: "${s.id}" | Name: "${s.name}"`;
      if (s.ilo) line += ` | Learning objective: "${s.ilo}"`;
      return line;
    })
    .join("\n");

  const prompt = `You are a medical curriculum organizer. Listen to this lecture and identify which curriculum sections are taught, along with the timestamp where the doctor starts each one. Focus on the spoken content — ignore slides and visuals.

CURRICULUM SECTIONS:
${sectionList}

RULES:
1. Only include a section if the doctor clearly teaches that clinical topic in detail.
2. Use the earliest timestamp where the main discussion of that section begins.
3. Each section appears at most once.
4. Return raw JSON only — no markdown.

RESPONSE FORMAT:
{"matches": [{"section_id": "uuid", "start_time": "MM:SS"}, ...]}`;

  const { text: raw, error } = await geminiVideoCall(videoUrl, prompt, model, apiKey, 1024);
  if (!raw) return { matches: [], error: error || "Gemini returned no response" };

  try {
    const parsed = JSON.parse(cleanJson(raw));
    if (!Array.isArray(parsed?.matches)) {
      return { matches: [], error: `Invalid response format: ${raw.slice(0, 200)}` };
    }

    const validIds = new Set(sections.map((s) => s.id));
    const matches = parsed.matches
      .map((m: { section_id: string; start_time: string }) => ({
        section_id: m.section_id,
        start_time_seconds: parseTimestamp(m.start_time) ?? 0,
      }))
      .filter((m: { section_id: string }) => validIds.has(m.section_id));

    return { matches };
  } catch (e) {
    return { matches: [], error: `Parse failed: ${e}` };
  }
}

async function analyzeYouTubeVideos(
  ytItems: Array<{ id: string; youtube_video_id: string; content: string }>,
  sections: Array<{ id: string; name: string; ilo?: string }>,
  googleApiKey: string,
  groqApiKey: string | null,
  serviceClient: any,
): Promise<Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }>> {
  const assignments: Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }> = {};

  const textModel = "gemini-2.5-flash";

  console.log(`[youtube-analysis] ${ytItems.length} videos | text model: ${textModel}`);

  for (const item of ytItems) {
    const vid = item.youtube_video_id;
    console.log(`[youtube-analysis] Processing: ${vid}`);

    let matches: Array<{ section_id: string; start_time_seconds: number }> = [];
    let transcriptCount = 0;
    let notes = "";
    let method = "";

    try {
      // ── Step 1: Try transcript (fast, no frame limits) ──
      const { entries, error: transcriptError } = await fetchYouTubeTranscript(vid);
      transcriptCount = entries.length;

      if (entries.length > 0) {
        console.log(`[transcript] ${vid}: ${entries.length} entries`);
        method = "transcript";
        matches = await matchTranscriptToSections(entries, sections, textModel, googleApiKey);
        notes = `transcript:${entries.length} matches:${matches.length}`;
      } else {
        // ── Step 2: Fallback to Gemini video analysis ──
        if (groqApiKey) {
          console.warn(`[transcript] ${vid}: no captions (${transcriptError}), trying Groq Whisper Turbo`);
          method = "groq-whisper-turbo";
          const groqTranscript = await fetchGroqTranscriptFromYouTube(vid, groqApiKey);
          transcriptCount = groqTranscript.entries.length;

          if (groqTranscript.entries.length > 0) {
            matches = await matchTranscriptToSections(groqTranscript.entries, sections, textModel, googleApiKey);
            notes = `transcript-failed:${transcriptError} | groq:${groqTranscript.entries.length} matches:${matches.length}`;
          } else {
            notes = `transcript-failed:${transcriptError} | groq-error:${groqTranscript.error}`;
          }
        } else {
          method = "no-transcript";
          notes = `transcript-failed:${transcriptError} | groq-error:GROQ_API_KEY not configured`;
        }
      }
    } catch (err) {
      notes = `exception: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[youtube-analysis] ${vid}:`, err);
    }

    // Write to debug log
    try {
      await serviceClient.from("ai_tagging_debug_log").insert({
        lecture_id: item.id,
        youtube_video_id: vid,
        outline: { method, transcript_entries: transcriptCount },
        matches: { matches },
        outline_count: transcriptCount,
        matches_count: matches.length,
        notes,
      });
    } catch (logErr) {
      console.warn("[debug-log] Failed:", logErr);
    }

    console.log(`[youtube-analysis] ${vid}: method=${method} matches=${matches.length}`);

    if (matches.length > 0) {
      const startTimes: Record<string, number> = {};
      for (const m of matches) {
        startTimes[m.section_id] = m.start_time_seconds;
      }
      assignments[item.id] = {
        section_ids: matches.map((m) => m.section_id),
        start_times: startTimes,
        confidence: "high",
      };
    }
  }

  return assignments;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleRow } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const userRole = roleRow?.role || "student";
    const isAdmin = [
      "super_admin",
      "platform_admin",
      "department_admin",
      "admin",
      "teacher",
    ].includes(userRole);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can use AI auto-tagging" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { items, sections } = await req.json();

    if (!items?.length || !sections?.length) {
      return new Response(
        JSON.stringify({ assignments: {}, message: "No items or sections" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cappedItems = items.slice(0, MAX_TOTAL_ITEMS);

    const settings = await getAISettings(serviceClient);
    const provider = getAIProvider(settings);

    const fastProvider = {
      ...provider,
      model:
        provider.name === "lovable"
          ? "google/gemini-3-flash-preview"
          : provider.model,
    };

    const keyResult = await resolveApiKey(serviceClient, userId, userRole, settings);
    if (keyResult.error) {
      return new Response(
        JSON.stringify({ error: keyResult.error, errorCode: keyResult.errorCode }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allAssignments: Record<string, { section_ids?: string[]; section_id?: string; start_times?: Record<string, number>; confidence: string } | null> = {};

    // ── Phase 1: YouTube video analysis (transcript → fallback to video) ──
    const ytItems = cappedItems.filter(
      (item: any) => item.table === "lectures" && item.youtube_video_id
    ) as Array<{ id: string; youtube_video_id: string; content: string }>;

    if (ytItems.length > 0) {
      const googleApiKey = keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");
      const groqApiKey = Deno.env.get("GROQ_API_KEY");

      if (!googleApiKey) {
        console.warn("[phase-1] No Google API key; skipping YouTube analysis");
      } else {
        const ytAssignments = await analyzeYouTubeVideos(
          ytItems,
          sections,
          googleApiKey,
          groqApiKey,
          serviceClient,
        );

        for (const [itemId, assignment] of Object.entries(ytAssignments)) {
          allAssignments[itemId] = assignment;
        }

        console.log(`[phase-1] Assigned ${Object.keys(ytAssignments).length} / ${ytItems.length} lectures`);
      }
    }

    // ── Phase 2: Text-based batch matching for non-video content ──
    const textItems = cappedItems.filter(
      (item: any) => !allAssignments[item.id] && !(item.table === "lectures" && item.youtube_video_id)
    );

    if (textItems.length > 0) {
      console.log(`[phase-2] Text-based matching for ${textItems.length} items`);

      const sectionList = sections
        .map((s: any) => {
          let line = `- ID: "${s.id}" | Name: "${s.name}"`;
          if (s.ilo) line += ` | ILO: "${s.ilo}"`;
          return line;
        })
        .join("\n");

      const systemPrompt = `You are a medical curriculum organizer. Watch each content item below and determine which existing sections from the list below are covered IN DETAIL.

SECTIONS:
${sectionList}

RULES:
1. Match based on clinical concept and learning objective (ILO) alignment.
2. DETAILED COVERAGE ONLY: Only include a section if it is a primary topic of discussion.
3. EXCLUDE BRIEF MENTIONS: If a section's topic is only mentioned in passing, DO NOT include it.
4. If an item covers multiple sections with significant detail for each, you SHOULD include all of them.
5. Provide a confidence level: "high", "medium", or "low".
6. Return raw JSON without markdown formatting.

RESPONSE FORMAT:
{"item-id": {"section_ids": ["uuid-1", "uuid-2"], "confidence": "high"}}`;

      for (let i = 0; i < textItems.length; i += MAX_ITEMS_PER_BATCH) {
        const batch = textItems.slice(i, i + MAX_ITEMS_PER_BATCH);

        const itemList = batch
          .map((item: any) => `- ID: "${item.id}" | Content: "${item.content || item.title || ''}"`)
          .join("\n");

        const userPrompt = `Assign each content item below to all relevant sections. You MUST assign every item if possible. Return raw JSON only.\n\nCONTENT ITEMS:\n${itemList}`;

        let result;

        if (fastProvider.name === "lovable") {
          const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
          if (!lovableApiKey) {
            console.error("[phase-2] LOVABLE_API_KEY not configured");
            break;
          }

          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: fastProvider.model,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0,
              }),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            console.error(`[phase-2] AI gateway error (${response.status}):`, errText);
            break;
          }

          const aiResult = await response.json();
          result = aiResult.choices?.[0]?.message?.content;
        } else {
          const googleApiKey = keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");
          if (!googleApiKey) {
            console.error("[phase-2] No AI API key available");
            break;
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${fastProvider.model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": googleApiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  maxOutputTokens: 16384,
                },
              }),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            console.error(`[phase-2] Gemini error (${response.status}):`, errText);
            break;
          }

          const aiResult = await response.json();
          result = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!result) {
          console.error("[phase-2] Empty AI response for batch", i);
          continue;
        }

        let cleaned = result.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned
            .replace(/^```(?:json)?\s*\n?/, "")
            .replace(/\n?```\s*$/, "");
        }

        const batchAssignments = repairAndExtractAssignments(cleaned);
        if (!batchAssignments) {
          console.error("[phase-2] Failed to parse or repair AI response, skipping batch", i);
          continue;
        }

        const sectionIds = new Set(sections.map((s: any) => s.id));

        for (const [itemId, value] of Object.entries(batchAssignments)) {
          if (value && typeof value === "object") {
            const v = value as { section_ids?: string[]; section_id?: string; confidence?: string };
            const ids = v.section_ids || (v.section_id ? [v.section_id] : []);
            const validIds = ids.filter((id) => sectionIds.has(id));

            if (validIds.length > 0) {
              allAssignments[itemId] = {
                section_ids: validIds,
                confidence: v.confidence || "medium",
              };
            }
          }
        }
      }
    }

    await logAIUsage(
      serviceClient,
      userId,
      "auto_tag_sections",
      fastProvider.name,
      keyResult.keySource || "lovable"
    );

    return new Response(
      JSON.stringify({ assignments: allAssignments }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-auto-tag-sections error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
