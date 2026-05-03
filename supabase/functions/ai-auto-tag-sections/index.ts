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
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch (_) {
    // Fall through to repair
  }

  // Extract individual entries using regex
  const results: Record<string, any> = {};
  const entryPattern = /\"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\"\s*:\s*\{\s*\"section_id\"\s*:\s*\"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\"\s*,\s*\"confidence\"\s*:\s*\"(high|medium|low)\"\s*\}/g;
  
  let match;
  while ((match = entryPattern.exec(raw)) !== null) {
    results[match[1]] = { section_id: match[2], confidence: match[3] };
  }

  return Object.keys(results).length > 0 ? results : null;
}

/**
 * PHASE 1 — YouTube video analysis via Gemini's native video understanding.
 * For each lecture with a youtube_video_id, Gemini watches the video and returns
 * which section it most closely belongs to.
 *
 * Uses Gemini's `fileData` part type with mimeType "video/*" and a YouTube URL.
 * Requires Gemini 1.5 Flash/Pro or Gemini 2.0+.
 */
// Convert MM:SS or HH:MM:SS string to total seconds
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

async function geminiVideoCall(
  videoUrl: string,
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
    return null;
  }
  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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

/**
 * PASS 1 — Ask Gemini to watch the video and produce a timestamped outline.
 * No section list is given here — pure video comprehension with no anchoring bias.
 */
async function extractVideoOutline(
  videoUrl: string,
  model: string,
  apiKey: string,
): Promise<Array<{ timestamp: string; topic: string }>> {
  const prompt = `You are a medical education assistant. Watch this medical lecture video and produce a chronological outline of every distinct clinical topic the doctor teaches.

For each topic segment provide:
- timestamp: when it starts in MM:SS format
- topic: a concise 1-2 sentence description of exactly what the doctor is teaching in that segment

Rules:
- Skip intro/outro, administrative talk, and slide housekeeping
- Each entry should represent a meaningful shift in clinical topic (a new disease, a new concept, a new management step)
- Be precise with timestamps — scrub through the video to confirm

Return raw JSON only:
{"outline": [{"timestamp": "01:20", "topic": "Definition and epidemiology of acute cystitis"}, {"timestamp": "08:45", "topic": "Causative organisms and pathophysiology"}, ...]}`;

  const raw = await geminiVideoCall(videoUrl, prompt, model, apiKey, 2048);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(cleanJson(raw));
    if (Array.isArray(parsed?.outline)) return parsed.outline;
  } catch {
    console.error("[pass1] Failed to parse outline:", raw);
  }
  return [];
}

/**
 * PASS 2 — Pure text: match the outline entries to the section list.
 * Returns which sections are covered and at what timestamp each starts.
 */
async function matchOutlineToSections(
  outline: Array<{ timestamp: string; topic: string }>,
  sections: Array<{ id: string; name: string; ilo?: string }>,
  model: string,
  apiKey: string,
): Promise<Array<{ section_id: string; start_time_seconds: number }>> {
  if (!outline.length) return [];

  const sectionList = sections
    .map((s) => {
      let line = `- ID: "${s.id}" | Name: "${s.name}"`;
      if (s.ilo) line += ` | Learning objective: "${s.ilo}"`;
      return line;
    })
    .join("\n");

  const outlineText = outline
    .map((e) => `- ${e.timestamp}: ${e.topic}`)
    .join("\n");

  const prompt = `You are a medical curriculum organizer. Match each video outline entry below to the most relevant section from the list, if one clearly fits.

SECTIONS:
${sectionList}

VIDEO OUTLINE:
${outlineText}

RULES:
1. Only match an outline entry to a section if the topic is a clear, direct match to that section's clinical content — not a loose association.
2. If multiple consecutive outline entries cover the same section, use the timestamp of the FIRST one.
3. Each section should appear at most once in the output.
4. If an outline entry does not clearly map to any section, skip it.
5. Return raw JSON only — no markdown.

RESPONSE FORMAT:
{"matches": [{"section_id": "uuid-1", "start_time": "01:20"}, {"section_id": "uuid-2", "start_time": "18:45"}]}`;

  const raw = await geminiTextCall(prompt, model, apiKey, 1024);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(cleanJson(raw));
    if (!Array.isArray(parsed?.matches)) return [];

    return parsed.matches
      .map((m: { section_id: string; start_time: string }) => ({
        section_id: m.section_id,
        start_time_seconds: parseTimestamp(m.start_time) ?? 0,
      }))
      .filter((m: { section_id: string }) => sections.some((s) => s.id === m.section_id));
  } catch {
    console.error("[pass2] Failed to parse matches:", raw);
    return [];
  }
}

async function analyzeYouTubeVideos(
  ytItems: Array<{ id: string; youtube_video_id: string; content: string }>,
  sections: Array<{ id: string; name: string; ilo?: string }>,
  googleApiKey: string,
  geminiModel: string,
): Promise<Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }>> {
  const assignments: Record<string, { section_ids: string[]; start_times: Record<string, number>; confidence: string }> = {};

  // Use a model that supports video. Pin to gemini-1.5-flash if current model is too old.
  const videoCapableModels = [
    "gemini-2.5-pro-preview",
    "gemini-2.5-flash-preview",
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-preview",
    "gemini-3-flash-preview",
  ];

  const isVideoCapable = videoCapableModels.some((m) =>
    geminiModel.includes(m) || m.includes(geminiModel.replace(/:.*$/, "").trim())
  );
  const videoModel = isVideoCapable ? geminiModel : "gemini-1.5-flash";
  // Pass 2 is text-only, use a fast model
  const textModel = "gemini-2.0-flash";

  console.log(`[youtube-analysis] Analyzing ${ytItems.length} videos | video model: ${videoModel} | text model: ${textModel}`);

  for (const item of ytItems) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${item.youtube_video_id}`;
    console.log(`[youtube-analysis] Processing: "${item.youtube_video_id}"`);

    try {
      // ── Pass 1: extract timestamped outline from video ──
      const outline = await extractVideoOutline(youtubeUrl, videoModel, googleApiKey);
      console.log(`[pass1] Outline for ${item.youtube_video_id}: ${outline.length} entries`);

      if (!outline.length) {
        console.warn(`[pass1] No outline extracted for ${item.youtube_video_id}, skipping`);
        continue;
      }

      // ── Pass 2: match outline entries to sections (text only) ──
      const matches = await matchOutlineToSections(outline, sections, textModel, googleApiKey);
      console.log(`[pass2] Matched ${matches.length} sections for ${item.youtube_video_id}`);

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
    } catch (err) {
      console.error(`[youtube-analysis] Failed for ${item.youtube_video_id}:`, err);
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

    const allAssignments: Record<string, { section_id: string; confidence: string } | null> = {};

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1 — YouTube Video Analysis
    // For each lecture with a youtube_video_id, Gemini watches the actual video
    // and returns which section it belongs to. This replicates the manual workflow
    // of going to YouTube and asking Gemini to summarize + match sections.
    // ─────────────────────────────────────────────────────────────────────────
    const ytItems = cappedItems.filter(
      (item: any) => item.table === "lectures" && item.youtube_video_id
    ) as Array<{ id: string; youtube_video_id: string; content: string }>;

    if (ytItems.length > 0) {
      console.log(`[phase-1] Analyzing ${ytItems.length} YouTube lectures via Gemini video understanding`);

      // YouTube video analysis requires Gemini (not the Lovable gateway)
      const googleApiKey = keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");

      if (!googleApiKey) {
        console.warn("[phase-1] No Google API key available; skipping YouTube video analysis");
      } else {
        const ytAssignments = await analyzeYouTubeVideos(
          ytItems,
          sections,
          googleApiKey,
          fastProvider.model,
        );

        for (const [itemId, assignment] of Object.entries(ytAssignments)) {
          allAssignments[itemId] = assignment;
        }

        console.log(`[phase-1] Assigned ${Object.keys(ytAssignments).length} / ${ytItems.length} YouTube lectures`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2 — Text-Based Batch Matching (existing logic, unchanged)
    // Handles MCQs, resources, study resources, essays, practicals, OSCEs,
    // matching questions, T/F questions, virtual patients, mind maps,
    // AND any lectures that didn't have a YouTube ID (text-based fallback).
    // ─────────────────────────────────────────────────────────────────────────
    const textItems = cappedItems.filter(
      (item: any) => !allAssignments[item.id] // skip anything already assigned in Phase 1
    );

    if (textItems.length > 0) {
      console.log(`[phase-2] Text-based matching for ${textItems.length} items`);

      // Build section list with ILOs if available
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
