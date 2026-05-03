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

interface TimedTextTrack {
  id: string;
  name: string;
  langCode: string;
  langOriginal: string;
  isDefault: boolean;
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

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function parseXmlAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = attrPattern.exec(raw)) !== null) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }

  return attrs;
}

function parseTimedTextEntries(raw: string): TranscriptEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    return events
      .map((event: { tStartMs?: number; segs?: Array<{ utf8?: string }> }) => {
        const text = (event.segs || [])
          .map((s) => (s.utf8 || "").replace(/\n/g, " "))
          .join("")
          .trim();
        return {
          timestamp: formatTimestamp(Math.floor((event.tStartMs || 0) / 1000)),
          text,
        };
      })
      .filter((entry: TranscriptEntry) => entry.text);
  } catch (_) {
    // Fall through to XML parsing.
  }

  const entries: TranscriptEntry[] = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match;

  while ((match = textPattern.exec(trimmed)) !== null) {
    const attrs = parseXmlAttributes(match[1]);
    const start = Number(attrs.start || "0");
    const text = decodeXmlEntities(match[2]).replace(/\s+/g, " ").trim();

    if (text) {
      entries.push({
        timestamp: formatTimestamp(start),
        text,
      });
    }
  }

  return entries;
}

function parseTimedTextTracks(raw: string): TimedTextTrack[] {
  const tracks: TimedTextTrack[] = [];
  const trackPattern = /<track\b([^>]*)\/?>/g;
  let match;

  while ((match = trackPattern.exec(raw)) !== null) {
    const attrs = parseXmlAttributes(match[1]);
    tracks.push({
      id: attrs.id || "",
      name: attrs.name || "",
      langCode: attrs.lang_code || "",
      langOriginal: attrs.lang_original || "",
      isDefault: attrs.lang_default === "true",
    });
  }

  return tracks;
}

function extractBalancedJson(raw: string, startIndex: number): string | null {
  const openIndex = raw.indexOf("{", startIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(openIndex, i + 1);
    }
  }

  return null;
}

function extractYtInitialPlayerResponse(html: string): any | null {
  const markers = [
    "ytInitialPlayerResponse =",
    "window[\"ytInitialPlayerResponse\"] =",
    "var ytInitialPlayerResponse =",
  ];

  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx < 0) continue;

    const json = extractBalancedJson(html, idx + marker.length);
    if (!json) continue;

    try {
      return JSON.parse(json);
    } catch (e) {
      console.warn("[watch-page] Failed to parse ytInitialPlayerResponse:", e);
    }
  }

  return null;
}

async function fetchCaptionTrackEntries(
  baseUrl: string,
  userAgent: string,
): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("fmt", "json3");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
    });

    if (!response.ok) {
      return { entries: [], error: `Caption download failed: ${response.status}` };
    }

    const entries = parseTimedTextEntries(await response.text());
    return entries.length > 0
      ? { entries }
      : { entries: [], error: "Caption track was empty" };
  } catch (e) {
    return { entries: [], error: `Caption track error: ${e}` };
  }
}

function chooseCaptionTrack<T extends { baseUrl: string; languageCode?: string; kind?: string }>(
  tracks: T[],
): T | null {
  if (!tracks.length) return null;

  const asrAr = tracks.find((t) => t.kind === "asr" && t.languageCode?.startsWith("ar"));
  const manualAr = tracks.find((t) => t.languageCode?.startsWith("ar"));
  const asrEn = tracks.find((t) => t.kind === "asr" && t.languageCode?.startsWith("en"));
  const manualEn = tracks.find((t) => t.languageCode?.startsWith("en"));
  return asrAr || manualAr || asrEn || manualEn || tracks[0];
}

async function fetchWatchPageTranscript(videoId: string): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const watchUrls = [
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US&has_verified=1&bpctr=9999999999`,
    `https://m.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en&gl=US`,
  ];
  let lastError = "";

  for (const watchUrl of watchUrls) {
    try {
      const response = await fetch(watchUrl, {
        headers: {
          "User-Agent": userAgent,
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      });

      if (!response.ok) {
        lastError = `Watch page failed: ${response.status}`;
        continue;
      }

      const playerResponse = extractYtInitialPlayerResponse(await response.text());
      const tracks: Array<{ baseUrl: string; languageCode?: string; kind?: string }> =
        playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      const chosen = chooseCaptionTrack(tracks);

      if (!chosen) {
        lastError = "Watch page returned no caption tracks";
        continue;
      }

      console.log(
        `[watch-page] Track: lang=${chosen.languageCode} kind=${chosen.kind || "manual"} (${tracks.length} total)`,
      );

      const result = await fetchCaptionTrackEntries(chosen.baseUrl, userAgent);
      if (result.entries.length > 0) return result;
      lastError = result.error || "Watch page caption track was empty";
    } catch (e) {
      lastError = `Watch page error: ${e}`;
    }
  }

  return { entries: [], error: lastError || "Watch page transcript failed" };
}

async function fetchTimedTextTranscript(videoId: string): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  try {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const listUrls = [
      `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
      `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
    ];

    let tracks: TimedTextTrack[] = [];
    let listError = "";

    for (const listUrl of listUrls) {
      const listResp = await fetch(listUrl, {
        headers: {
          "User-Agent": userAgent,
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      });

      if (!listResp.ok) {
        listError = `TimedText list failed: ${listResp.status}`;
        continue;
      }

      tracks = parseTimedTextTracks(await listResp.text());
      if (tracks.length > 0) break;
      listError = "TimedText returned no caption tracks";
    }

    if (!tracks.length) {
      return { entries: [], error: listError || "TimedText returned no caption tracks" };
    }

    const chosen =
      tracks.find((t) => t.langCode.startsWith("ar")) ||
      tracks.find((t) => t.isDefault) ||
      tracks.find((t) => t.langCode.startsWith("en")) ||
      tracks[0];

    const params = new URLSearchParams({
      v: videoId,
      lang: chosen.langCode,
      fmt: "json3",
    });
    if (chosen.name) params.set("name", chosen.name);
    if (chosen.id) params.set("id", chosen.id);

    console.log(
      `[timedtext] Track: lang=${chosen.langCode} name=${chosen.name || "(empty)"} id=${chosen.id || "(empty)"} (${tracks.length} total)`,
    );

    const transcriptResp = await fetch(`https://www.youtube.com/api/timedtext?${params.toString()}`, {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
    });

    if (!transcriptResp.ok) {
      return { entries: [], error: `TimedText transcript failed: ${transcriptResp.status}` };
    }

    const entries = parseTimedTextEntries(await transcriptResp.text());
    return entries.length > 0
      ? { entries }
      : { entries: [], error: "TimedText transcript was empty" };
  } catch (e) {
    return { entries: [], error: `TimedText error: ${e}` };
  }
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
 * Fetch timestamped transcript segments from TranscriptAPI.
 */
async function fetchTranscriptApiTranscript(
  videoId: string,
  apiKey: string,
): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const url = new URL("https://transcriptapi.com/api/v2/youtube/transcript");
  url.searchParams.set("video_url", videoUrl);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        entries: [],
        error: `TranscriptAPI ${response.status}: ${errText.slice(0, 300)}`,
      };
    }

    const data = await response.json();
    const rawTranscript = Array.isArray(data?.transcript)
      ? data.transcript
      : Array.isArray(data?.content?.transcript)
        ? data.content.transcript
        : [];

    const entries: TranscriptEntry[] = rawTranscript
      .map((segment: any) => {
        const text = String(segment?.text ?? segment?.content ?? "").replace(/\s+/g, " ").trim();
        const start =
          typeof segment?.start === "number"
            ? segment.start
            : typeof segment?.start_time === "number"
              ? segment.start_time
              : typeof segment?.startMs === "number"
                ? segment.startMs / 1000
                : typeof segment?.start_ms === "number"
                  ? segment.start_ms / 1000
                  : 0;

        return text ? { timestamp: formatTimestamp(start), text } : null;
      })
      .filter((entry: TranscriptEntry | null): entry is TranscriptEntry => Boolean(entry));

    return entries.length > 0
      ? { entries }
      : { entries: [], error: "TranscriptAPI returned no transcript segments" };
  } catch (e) {
    return { entries: [], error: `TranscriptAPI request error: ${e}` };
  }
}

async function fetchYouTubeTranscript(
  videoId: string,
  transcriptApiKey?: string | null,
): Promise<{ entries: TranscriptEntry[]; error?: string }> {
  if (transcriptApiKey) {
    return fetchTranscriptApiTranscript(videoId, transcriptApiKey);
  }

  return { entries: [], error: "TRANSCRIPTAPI_API_KEY is not configured" };
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
  transcriptApiKey: string | null,
  serviceClient: any,
): Promise<Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }>> {
  const assignments: Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }> = {};

  const textModel = "gemini-2.5-flash";

  console.log(`[youtube-analysis] ${ytItems.length} videos | transcript source: TranscriptAPI | text model: ${textModel}`);

  for (const item of ytItems) {
    const vid = item.youtube_video_id;
    console.log(`[youtube-analysis] Processing: ${vid}`);

    let matches: Array<{ section_id: string; start_time_seconds: number }> = [];
    let transcriptCount = 0;
    let notes = "";
    let method = "";

    try {
      // ── Step 1: Try transcript (fast, no frame limits) ──
      const { entries, error: transcriptError } = await fetchYouTubeTranscript(vid, transcriptApiKey);
      transcriptCount = entries.length;

      if (entries.length > 0) {
        console.log(`[transcript] ${vid}: ${entries.length} entries`);
        method = "transcriptapi";
        matches = await matchTranscriptToSections(entries, sections, textModel, googleApiKey);
        notes = `transcript:${entries.length} matches:${matches.length}`;
      } else {
        console.warn(`[transcript] ${vid}: TranscriptAPI returned no usable transcript (${transcriptError})`);
        method = "transcriptapi-empty";
        notes = `transcriptapi-failed:${transcriptError}`;
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

    // Phase 1: YouTube video analysis (captions first).
    const ytItems = cappedItems.filter(
      (item: any) => item.table === "lectures" && item.youtube_video_id
    ) as Array<{ id: string; youtube_video_id: string; content: string }>;

    if (ytItems.length > 0) {
      const googleApiKey = keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");
      if (!googleApiKey) {
        console.warn("[phase-1] No Google API key; skipping YouTube analysis");
      } else {
        const transcriptApiKey =
          Deno.env.get("TRANSCRIPTAPI_API_KEY") || Deno.env.get("TRANSCRIPT_API_KEY") || null;
        if (!transcriptApiKey) {
          console.warn("[phase-1] TRANSCRIPTAPI_API_KEY not configured; YouTube transcript tagging will return no transcript");
        }
        const ytAssignments = await analyzeYouTubeVideos(
          ytItems,
          sections,
          googleApiKey,
          transcriptApiKey,
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
