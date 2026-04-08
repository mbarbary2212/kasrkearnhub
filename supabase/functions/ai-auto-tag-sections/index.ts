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

const MAX_ITEMS_PER_BATCH = 40;
const MAX_TOTAL_ITEMS = 200;

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

    // Build section list with ILOs if available
    const sectionList = sections
      .map((s: any) => {
        let line = `- ID: "${s.id}" | Name: "${s.name}"`;
        if (s.ilo) line += ` | ILO: "${s.ilo}"`;
        return line;
      })
      .join("\n");

    const systemPrompt = `You are a curriculum organizer for a medical education platform. You will be given a list of SECTIONS and a list of CONTENT ITEMS. Your task is to assign each content item to the most relevant section.

SECTIONS:
${sectionList}

RULES:
1. Consider medical topic relationships, synonyms, hierarchical concepts, and abbreviations.
2. Match based on clinical concept and learning objective (ILO) alignment.
3. Prefer the MOST SPECIFIC matching section.
4. You MUST assign every item to a section. NEVER return null. If uncertain, pick the closest match.
5. For each assignment, provide a confidence level: "high", "medium", or "low".
6. Return ONLY a JSON object. No explanation, no markdown.

RESPONSE FORMAT (raw JSON, no markdown):
{"item-id-1": {"section_id": "section-id-1", "confidence": "high"}, "item-id-2": {"section_id": "section-id-2", "confidence": "medium"}}`;

    const allAssignments: Record<string, { section_id: string; confidence: string } | null> = {};

    for (let i = 0; i < cappedItems.length; i += MAX_ITEMS_PER_BATCH) {
      const batch = cappedItems.slice(i, i + MAX_ITEMS_PER_BATCH);

      const itemList = batch
        .map((item: any) => `- ID: "${item.id}" | Content: "${item.content || item.title || ''}"`)
        .join("\n");

      const userPrompt = `Assign each content item below to the most relevant section. You MUST assign every item — never skip. Return raw JSON only.\n\nCONTENT ITEMS:\n${itemList}`;

      let result;

      if (fastProvider.name === "lovable") {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableApiKey) {
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          break;
        }

        const aiResult = await response.json();
        result = aiResult.choices?.[0]?.message?.content;
      } else {
        const googleApiKey = keyResult.apiKey || Deno.env.get("GOOGLE_API_KEY");
        if (!googleApiKey) {
          return new Response(
            JSON.stringify({ error: "No AI API key available" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
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
        result = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (!result) {
        console.error("Empty AI response for batch", i);
        continue;
      }

      let cleaned = result.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\s*\n?/, "")
          .replace(/\n?```\s*$/, "");
      }

      try {
        const batchAssignments = JSON.parse(cleaned);
        const sectionIds = new Set(sections.map((s: any) => s.id));
        
        for (const [itemId, value] of Object.entries(batchAssignments)) {
          // Handle both old format (string) and new format ({section_id, confidence})
          if (typeof value === 'string') {
            if (sectionIds.has(value)) {
              allAssignments[itemId] = { section_id: value, confidence: 'medium' };
            }
          } else if (value && typeof value === 'object') {
            const v = value as { section_id?: string; confidence?: string };
            if (v.section_id && sectionIds.has(v.section_id)) {
              allAssignments[itemId] = {
                section_id: v.section_id,
                confidence: v.confidence || 'medium',
              };
            }
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse AI response:", cleaned, parseErr);
        continue;
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
