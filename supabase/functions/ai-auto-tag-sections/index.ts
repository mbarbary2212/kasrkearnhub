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
async function analyzeYouTubeVideos(
  ytItems: Array<{ id: string; youtube_video_id: string; content: string }>,
  sections: Array<{ id: string; name: string; ilo?: string }>,
  googleApiKey: string,
  geminiModel: string,
): Promise<Record<string, { section_id: string; confidence: string }>> {
  const assignments: Record<string, { section_id: string; confidence: string }> = {};

  // Build section list for the prompt
  const sectionList = sections
    .map((s) => {
      let line = `- ID: "${s.id}" | Name: "${s.name}"`;
      if (s.ilo) line += ` | Learning objective: "${s.ilo}"`;
      return line;
    })
    .join("\n");

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

  // Check if model name contains any video-capable identifier; fallback to 1.5-flash
  const isVideoCapable = videoCapableModels.some((m) =>
    geminiModel.includes(m) || m.includes(geminiModel.replace(/:.*$/, "").trim())
  );
  const model = isVideoCapable ? geminiModel : "gemini-1.5-flash";

  console.log(`[youtube-analysis] Analyzing ${ytItems.length} videos with model: ${model}`);

  for (const item of ytItems) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${item.youtube_video_id}`;
    console.log(`[youtube-analysis] Processing: "${item.title}" (${item.youtube_video_id})`);

    const prompt = `You are a medical curriculum expert.
Watch this YouTube video and determine which existing sections from the list below are covered IN DETAIL.

SECTIONS:
${sectionList}

RULES:
1. Watch the video carefully. Focus on clinical and educational depth.
2. DETAILED COVERAGE ONLY: Only include a section if it is a primary topic of discussion. If the video spends significant time explaining or demonstrating the section's topic, include it.
3. EXCLUDE BRIEF MENTIONS: If a section's topic is only mentioned in passing, as a side-note, or as a quick comparison, DO NOT include it.
4. If a video is actually a comprehensive review covering multiple sections (e.g., 5-6 topics) with significant detail for each, you SHOULD include all of them.
5. Provide a confidence level: "high", "medium", or "low".
6. Return raw JSON only.

RESPONSE FORMAT:
{"section_ids": ["uuid-1", "uuid-2"], "confidence": "high"}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
                parts: [
                  {
                    fileData: {
                      mimeType: "video/*",
                      fileUri: youtubeUrl,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 256,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[youtube-analysis] Gemini error for video ${item.youtube_video_id} (${response.status}):`,
          errText
        );
        continue;
      }

      const aiResult = await response.json();
      const raw = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!raw) {
        console.error(`[youtube-analysis] Empty response for "${item.title}"`);
        continue;
      }

      console.log(`[youtube-analysis] Raw AI response for "${item.title}":`, raw);

      // Clean markdown fences if present
      let cleaned = raw.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }

      let parsed: { section_ids?: string[]; section_id?: string; confidence?: string } | null = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Simple fallback
        const m = cleaned.match(/"section_ids"\s*:\s*\[([^\]]+)\]/);
        if (m) {
          const ids = m[1].replace(/["\s]/g, "").split(",");
          parsed = { section_ids: ids, confidence: "medium" };
        }
      }

      const validIds = (parsed?.section_ids || (parsed?.section_id ? [parsed.section_id] : []))
        .filter(sid => sections.some(s => s.id === sid));

      if (validIds.length > 0) {
        assignments[item.id] = {
          section_ids: validIds,
          confidence: parsed?.confidence ?? "medium",
        } as any;
        console.log(
          `[youtube-analysis] Assigned video ${item.youtube_video_id} → ${validIds.length} sections`
        );
      }
    } catch (err) {
      console.error(
        `[youtube-analysis] Failed to analyze video ${item.youtube_video_id}:`,
        err
      );
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

      const systemPrompt = `You are a medical curriculum organizer. Assign CONTENT ITEMS to the SINGLE most relevant SECTION.

SECTIONS:
${sectionList}

RULES:
1. Match based on clinical concept and learning objective (ILO) alignment.
2. Be CONSERVATIVE: Only match if there is a strong relationship.
3. Pick ONLY the primary section. Do not return multiple sections for one item.
4. Provide a confidence level: "high", "medium", or "low".
5. Return raw JSON without markdown formatting.

RESPONSE FORMAT:
{"item-id": {"section_id": "section-uuid", "confidence": "high"}}`;

      for (let i = 0; i < textItems.length; i += MAX_ITEMS_PER_BATCH) {
        const batch = textItems.slice(i, i + MAX_ITEMS_PER_BATCH);

        const itemList = batch
          .map((item: any) => `- ID: "${item.id}" | Content: "${item.content || item.title || ''}"`)
          .join("\n");

        const userPrompt = `Assign each content item below to the most relevant section. You MUST assign every item — never skip. Return raw JSON only.\n\nCONTENT ITEMS:\n${itemList}`;

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
          if (typeof value === "string") {
            if (sectionIds.has(value)) {
              allAssignments[itemId] = { section_id: value, confidence: "medium" };
            }
          } else if (value && typeof value === "object") {
            const v = value as { section_id?: string; confidence?: string };
            if (v.section_id && sectionIds.has(v.section_id)) {
              allAssignments[itemId] = {
                section_id: v.section_id,
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
