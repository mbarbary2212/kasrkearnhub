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
 */
function extractByRegex(pdfText: string): ExtractedSection[] {
  const lines = pdfText.split("\n");
  const sections: ExtractedSection[] = [];
  const pattern = /^\s*(\d{1,3}(?:\.\d{1,3})+)\.?\s+([A-Z][^\n]{2,80})/;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      const sectionNumber = match[1];
      const name = match[2].trim().replace(/\s+/g, " ");
      if (name.length >= 3 && !name.match(/^page\s/i) && !name.match(/^\d+$/)) {
        sections.push({ section_number: sectionNumber, name });
      }
    }
  }

  const seen = new Set<string>();
  return sections.filter((s) => {
    if (seen.has(s.section_number)) return false;
    seen.add(s.section_number);
    return true;
  });
}

/**
 * Download PDF from storage and send directly to AI for section extraction.
 */
async function extractSectionsFromPdf(
  pdfBytes: Uint8Array,
  chapterTitle: string
): Promise<ExtractedSection[]> {
  const googleKey = Deno.env.get("GOOGLE_API_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    const chunk = pdfBytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  const pdfBase64 = btoa(binary);

  const systemPrompt = `You are a textbook section extractor. Given a PDF chapter, identify the main section headings and their numbers. Return ONLY a JSON array of objects with "section_number" and "name" fields. Example: [{"section_number":"7.1","name":"Classification of Hemorrhage"},{"section_number":"7.2","name":"Pathophysiology"}]. If there are no clear sections, return an empty array [].`;

  let responseText = "";

  if (googleKey) {
    // Gemini supports PDF as inline_data
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
              { text: `${systemPrompt}\n\nExtract the main sections from this chapter titled "${chapterTitle}".` },
            ],
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
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
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: `Extract the main sections from this chapter titled "${chapterTitle}".` },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error: ${res.status}`);
    const data = await res.json();
    responseText = data.content?.[0]?.text || "[]";
  } else if (lovableKey) {
    // Lovable gateway doesn't support PDF attachments, so we can't use it here
    throw new Error("PDF section extraction requires GOOGLE_API_KEY or ANTHROPIC_API_KEY for direct PDF processing");
  } else {
    throw new Error("No AI API key configured (GOOGLE_API_KEY or ANTHROPIC_API_KEY required for PDF processing)");
  }

  // Parse response
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chapter title
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

    // Step 1: If pdf_text exists, try regex first
    if (chapter.pdf_text && chapter.pdf_text.trim().length >= 50) {
      const regexSections = extractByRegex(chapter.pdf_text);
      if (regexSections.length >= 2) {
        console.log(`Regex extracted ${regexSections.length} sections for chapter ${chapter_id}`);
        return new Response(
          JSON.stringify({ sections: regexSections, method: "regex" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Find linked PDF in admin_documents
    const { data: doc } = await supabase
      .from("admin_documents")
      .select("id, storage_path, storage_bucket")
      .eq("chapter_id", chapter_id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!doc) {
      return new Response(
        JSON.stringify({ sections: [], method: "none", message: "No PDF document linked to this chapter. Upload a PDF first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Download the PDF
    console.log(`Downloading PDF from ${doc.storage_bucket}/${doc.storage_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error("PDF download error:", downloadError);
      return new Response(
        JSON.stringify({ sections: [], method: "failed", message: "Failed to download the linked PDF" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    console.log(`PDF downloaded: ${pdfBytes.length} bytes`);

    // Step 4: Send PDF directly to AI for section extraction
    try {
      const sections = await extractSectionsFromPdf(pdfBytes, chapter.title || "");
      console.log(`AI extracted ${sections.length} sections from PDF`);

      return new Response(
        JSON.stringify({ sections, method: "ai" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("AI extraction failed:", aiError);
      return new Response(
        JSON.stringify({
          sections: [],
          method: "failed",
          message: `AI extraction failed: ${aiError instanceof Error ? aiError.message : "Unknown error"}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("extract-pdf-sections error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
