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

const MAX_ITEMS_PER_BATCH = 50;
const MAX_TOTAL_ITEMS = 200;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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

    // Check user role
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
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { items, sections } = await req.json();

    if (!items?.length || !sections?.length) {
      return new Response(
        JSON.stringify({ assignments: {}, message: "No items or sections" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cap items
    const cappedItems = items.slice(0, MAX_TOTAL_ITEMS);

    // Get AI settings and provider
    const settings = await getAISettings(serviceClient);
    const provider = getAIProvider(settings);

    // Override to use fast model for this task
    const fastProvider = {
      ...provider,
      model:
        provider.name === "lovable"
          ? "google/gemini-3-flash-preview"
          : provider.model,
    };

    // Resolve API key
    const keyResult = await resolveApiKey(
      serviceClient,
      userId,
      userRole,
      settings
    );
    if (keyResult.error) {
      return new Response(
        JSON.stringify({ error: keyResult.error, errorCode: keyResult.errorCode }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build section list string
    const sectionList = sections
      .map((s: any) => `- ID: "${s.id}" | Name: "${s.name}"`)
      .join("\n");

    const systemPrompt = `You are a curriculum organizer for a medical education platform. You will be given a list of SECTIONS and a list of CONTENT ITEMS. Your task is to assign each content item to the most relevant section.

SECTIONS:
${sectionList}

RULES:
1. Consider medical topic relationships, synonyms, hierarchical concepts, and abbreviations.
2. For example, "Primary intention healing" belongs to a section about "Wound healing".
3. "Femoral triangle boundaries" belongs to a section about "Lower limb anatomy".
4. If NO section is a reasonable match for an item, assign null.
5. Return ONLY a JSON object mapping item IDs to section IDs (or null).
6. Do NOT include any explanation or markdown formatting. Return raw JSON only.

RESPONSE FORMAT (raw JSON, no markdown):
{"item-id-1": "section-id-1", "item-id-2": "section-id-2", "item-id-3": null}`;

    const allAssignments: Record<string, string | null> = {};

    // Process in batches
    for (let i = 0; i < cappedItems.length; i += MAX_ITEMS_PER_BATCH) {
      const batch = cappedItems.slice(i, i + MAX_ITEMS_PER_BATCH);

      const itemList = batch
        .map((item: any) => `- ID: "${item.id}" | Content: "${item.content || item.title || ''}"`)
        .join("\n");

      const userPrompt = `Assign each content item below to the most relevant section based on its content. Return raw JSON only.\n\nCONTENT ITEMS:\n${itemList}`;

      let result;

      // Call AI based on provider
      if (fastProvider.name === "lovable") {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
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
              temperature: 0.1,
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error(`AI gateway error (${response.status}):`, errText);
          // Graceful fallback - return what we have so far
          break;
        }

        const aiResult = await response.json();
        result = aiResult.choices?.[0]?.message?.content;
      } else {
        // Gemini direct
        const googleApiKey =
          keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");
        if (!googleApiKey) {
          return new Response(
            JSON.stringify({ error: "No AI API key available" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
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
                  parts: [
                    { text: `${systemPrompt}\n\n${userPrompt}` },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Gemini error (${response.status}):`, errText);
          break;
        }

        const aiResult = await response.json();
        result =
          aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (!result) {
        console.error("Empty AI response for batch", i);
        continue;
      }

      // Parse the JSON response - strip markdown fences if present
      let cleaned = result.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\s*\n?/, "")
          .replace(/\n?```\s*$/, "");
      }

      try {
        const batchAssignments = JSON.parse(cleaned);
        // Validate: only accept known section IDs
        const sectionIds = new Set(sections.map((s: any) => s.id));
        for (const [itemId, sectionId] of Object.entries(batchAssignments)) {
          if (sectionId === null || sectionIds.has(sectionId as string)) {
            allAssignments[itemId] = sectionId as string | null;
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse AI response:", cleaned, parseErr);
        continue;
      }
    }

    // Log usage
    await logAIUsage(
      serviceClient,
      userId,
      "auto_tag_sections",
      fastProvider.name,
      keyResult.keySource || "lovable"
    );

    return new Response(
      JSON.stringify({ assignments: allAssignments }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("ai-auto-tag-sections error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
