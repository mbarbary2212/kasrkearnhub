import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedSection {
  section_number: string;
  name: string;
}

/**
 * Try to extract numbered section headings from PDF text using regex.
 * Matches patterns like "7.1 Title", "7.1. Title", "3.10 Title", "III.2 Title"
 */
function extractByRegex(pdfText: string): ExtractedSection[] {
  const lines = pdfText.split("\n");
  const sections: ExtractedSection[] = [];

  // Match numbered headings: "7.1 Title" or "7.1. Title" or "3.10 Heading text"
  // Also matches patterns like "1.1", "1.2", "10.3" etc at the start of a line
  const pattern = /^\s*(\d{1,3}(?:\.\d{1,3})+)\.?\s+([A-Z][^\n]{2,80})/;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      const sectionNumber = match[1];
      const name = match[2].trim().replace(/\s+/g, " ");
      // Skip very short names or lines that look like page numbers / references
      if (name.length >= 3 && !name.match(/^page\s/i) && !name.match(/^\d+$/)) {
        sections.push({ section_number: sectionNumber, name });
      }
    }
  }

  // Deduplicate by section_number (keep first occurrence)
  const seen = new Set<string>();
  return sections.filter((s) => {
    if (seen.has(s.section_number)) return false;
    seen.add(s.section_number);
    return true;
  });
}

/**
 * Use AI to extract section headings from text.
 */
async function extractByAI(
  pdfText: string,
  chapterTitle: string
): Promise<ExtractedSection[]> {
  // Try admin's configured key first, fall back to LOVABLE_API_KEY
  const googleKey = Deno.env.get("GOOGLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  // Truncate text to ~30k chars to stay within context limits
  const truncated = pdfText.substring(0, 30000);

  const systemPrompt = `You are a textbook section extractor. Given the text of a chapter, identify the main section headings and their numbers. Return ONLY a JSON array of objects with "section_number" and "name" fields. Example: [{"section_number":"7.1","name":"Classification of Hemorrhage"},{"section_number":"7.2","name":"Pathophysiology"}]. If there are no clear sections, return an empty array [].`;

  const userPrompt = `Extract the main sections from this chapter titled "${chapterTitle}":

${truncated}`;

  let responseText = "";

  if (googleKey) {
    // Use Gemini directly
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json();
    responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  } else if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error: ${res.status}`);
    const data = await res.json();
    responseText = data.content?.[0]?.text || "[]";
  } else if (lovableKey) {
    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );
    if (!res.ok) throw new Error(`Lovable AI error: ${res.status}`);
    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content || "[]";
  } else {
    throw new Error("No AI API key configured (GOOGLE_API_KEY, ANTHROPIC_API_KEY, or LOVABLE_API_KEY)");
  }

  // Parse the response - strip fences if present
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.sections && Array.isArray(parsed.sections)) return parsed.sections;
    return [];
  } catch {
    console.error("Failed to parse AI response:", cleaned.substring(0, 200));
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapter_id } = await req.json();
    if (!chapter_id) {
      return new Response(
        JSON.stringify({ error: "chapter_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chapter with pdf_text
    const { data: chapter, error: chapterError } = await supabase
      .from("module_chapters")
      .select("id, title, pdf_text")
      .eq("id", chapter_id)
      .single();

    if (chapterError || !chapter) {
      return new Response(
        JSON.stringify({ error: "Chapter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chapter.pdf_text || chapter.pdf_text.trim().length < 50) {
      return new Response(
        JSON.stringify({ sections: [], method: "none", message: "No PDF text available for this chapter" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Try regex extraction
    let sections = extractByRegex(chapter.pdf_text);
    let method = "regex";

    console.log(`Regex extracted ${sections.length} sections for chapter ${chapter_id}`);

    // Step 2: If regex found fewer than 2 sections, try AI
    if (sections.length < 2) {
      console.log("Regex insufficient, falling back to AI extraction...");
      try {
        sections = await extractByAI(chapter.pdf_text, chapter.title || "");
        method = "ai";
        console.log(`AI extracted ${sections.length} sections`);
      } catch (aiError) {
        console.error("AI extraction failed:", aiError);
        return new Response(
          JSON.stringify({
            sections: sections.length > 0 ? sections : [],
            method: sections.length > 0 ? "regex" : "failed",
            message: `AI extraction failed: ${aiError instanceof Error ? aiError.message : "Unknown error"}`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ sections, method }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-pdf-sections error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
