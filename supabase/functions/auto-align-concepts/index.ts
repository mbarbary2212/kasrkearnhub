import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider, callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Content tables and how to extract text from each
const TABLE_CONFIGS: {
  table: string;
  textFields: string[];
  joiner?: string;
}[] = [
  { table: "mcqs", textFields: ["stem"] },
  { table: "essays", textFields: ["title", "question"] },
  { table: "osce_questions", textFields: ["history_text"] },
  { table: "matching_questions", textFields: ["instruction"] },
  { table: "study_resources", textFields: ["title"] },
  { table: "flashcards", textFields: ["front", "back"] },
  { table: "true_false_questions", textFields: ["statement"] },
  { table: "lectures", textFields: ["title"] },
];

const PAGE_SIZE = 100;
const AI_BATCH_SIZE = 30;
const CONFIDENCE_THRESHOLD = 0.6;

interface ConceptInput {
  id: string;
  title: string;
  concept_key: string;
}

interface AlignResult {
  tagged: number;
  skipped_low_confidence: number;
  already_tagged: number;
  errors: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth check
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service client for DB operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // ---- Parse body ----
    const { chapterId, conceptList, retag_all = false } = await req.json();

    if (!chapterId || !Array.isArray(conceptList) || conceptList.length === 0) {
      return new Response(
        JSON.stringify({ error: "chapterId and conceptList are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Permission check: can_manage_chapter_content ----
    const { data: canManage } = await serviceClient.rpc("can_manage_chapter_content", {
      _user_id: userId,
      _chapter_id: chapterId,
    });

    if (!canManage) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to manage this chapter" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Get AI settings ----
    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);

    // Build concept key → id map
    const concepts = conceptList as ConceptInput[];
    const conceptKeyToId = new Map<string, string>();
    for (const c of concepts) {
      conceptKeyToId.set(c.concept_key, c.id);
    }

    const conceptListStr = concepts
      .map((c) => `- "${c.concept_key}" (${c.title})`)
      .join("\n");

    // ---- Process each table sequentially with pagination ----
    const result: AlignResult = {
      tagged: 0,
      skipped_low_confidence: 0,
      already_tagged: 0,
      errors: 0,
    };

    for (const config of TABLE_CONFIGS) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Build query
        let query = serviceClient
          .from(config.table)
          .select("id, " + config.textFields.join(", ") + ", concept_id")
          .eq("chapter_id", chapterId)
          .eq("is_deleted", false)
          .range(offset, offset + PAGE_SIZE - 1);

        if (!retag_all) {
          query = query.is("concept_id", null);
        }

        const { data: items, error: fetchError } = await query;

        if (fetchError) {
          console.error(`Error fetching ${config.table}:`, fetchError.message);
          result.errors++;
          break;
        }

        if (!items || items.length === 0) {
          hasMore = false;
          break;
        }

        // Count already_tagged (only relevant when retag_all is false — they won't appear)
        // When retag_all is true, items with concept_id are included

        // Separate items that need processing
        const toProcess = items.filter((item: any) => {
          if (!retag_all && item.concept_id) {
            result.already_tagged++;
            return false;
          }
          return true;
        });

        // Process in AI batches of 30
        for (let batchStart = 0; batchStart < toProcess.length; batchStart += AI_BATCH_SIZE) {
          const batch = toProcess.slice(batchStart, batchStart + AI_BATCH_SIZE);

          // Build AI prompt
          const itemDescriptions = batch.map((item: any) => {
            const text = config.textFields
              .map((f) => (item as any)[f] || "")
              .filter(Boolean)
              .join(" | ");
            return `{ "item_id": "${item.id}", "text": "${text.replace(/"/g, '\\"').substring(0, 500)}" }`;
          });

          const systemPrompt = `You are a medical curriculum classifier. Given a list of content items and a list of medical concepts, match each item to the SINGLE most relevant concept.

RULES:
- Only return a concept_key if the content STRONGLY relates to that concept.
- If unsure between two or more concepts, return null for concept_key.
- Do NOT guess. Only match when clearly supported by the content.
- Confidence must be between 0 and 1.
- Return ONLY a valid JSON array, no markdown or extra text.

Available concepts:
${conceptListStr}`;

          const userPrompt = `Match each item to the best concept. Return JSON array:
[{ "item_id": "...", "concept_key": "..." or null, "confidence": 0.0-1.0 }]

Items:
[${itemDescriptions.join(",\n")}]`;

          const aiResult = await callAI(systemPrompt, userPrompt, provider);

          if (!aiResult.success || !aiResult.content) {
            console.error(`AI call failed for ${config.table}:`, aiResult.error);
            result.errors += batch.length;
            continue;
          }

          // Parse AI response
          let matches: { item_id: string; concept_key: string | null; confidence: number }[];
          try {
            // Extract JSON from possible markdown wrapper
            let jsonStr = aiResult.content.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            matches = JSON.parse(jsonStr);
          } catch (parseErr) {
            console.error(`Failed to parse AI response for ${config.table}:`, parseErr);
            result.errors += batch.length;
            continue;
          }

          if (!Array.isArray(matches)) {
            console.error(`AI response is not an array for ${config.table}`);
            result.errors += batch.length;
            continue;
          }

          // Apply updates
          for (const match of matches) {
            if (!match.item_id || !match.concept_key) {
              result.skipped_low_confidence++;
              continue;
            }

            if (typeof match.confidence !== "number" || match.confidence < CONFIDENCE_THRESHOLD) {
              result.skipped_low_confidence++;
              continue;
            }

            const conceptId = conceptKeyToId.get(match.concept_key);
            if (!conceptId) {
              console.warn(`Unknown concept_key from AI: ${match.concept_key}`);
              result.skipped_low_confidence++;
              continue;
            }

            const { error: updateError } = await serviceClient
              .from(config.table)
              .update({
                concept_id: conceptId,
                concept_auto_assigned: true,
              } as any)
              .eq("id", match.item_id);

            if (updateError) {
              console.error(`Update failed for ${config.table} id=${match.item_id}:`, updateError.message);
              result.errors++;
            } else {
              result.tagged++;
            }
          }
        }

        // Pagination
        if (items.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-align-concepts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
