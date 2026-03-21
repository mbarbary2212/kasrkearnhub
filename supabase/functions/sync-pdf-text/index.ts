import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider, callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const userId = claimsData.claims.sub;

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Check role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const allowedRoles = ["super_admin", "platform_admin", "admin", "teacher", "department_admin"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { chapter_id, topic_id } = body;

    if (!chapter_id && !topic_id) {
      return new Response(
        JSON.stringify({ error: "chapter_id or topic_id required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the linked admin_document
    const targetField = chapter_id ? "chapter_id" : "topic_id";
    const targetId = chapter_id || topic_id;

    const { data: doc, error: docError } = await serviceClient
      .from("admin_documents")
      .select("id, storage_path, storage_bucket, file_name")
      .eq(targetField, targetId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docError) throw docError;

    if (!doc) {
      return new Response(
        JSON.stringify({
          error: "No PDF document linked to this " + (chapter_id ? "chapter" : "topic"),
          code: "NO_DOCUMENT",
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF from storage" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Get AI settings
    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);

    // Determine the API key
    let apiKey: string | undefined;
    if (provider.name === "gemini") {
      apiKey = Deno.env.get("GOOGLE_API_KEY");
    } else if (provider.name === "anthropic") {
      apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    }

    // Call AI to extract text from PDF
    const extractedText = await extractTextFromPdf(
      base64,
      provider,
      apiKey
    );

    if (!extractedText || extractedText.length < 50) {
      return new Response(
        JSON.stringify({
          error: "Could not extract meaningful text from the PDF",
          code: "EXTRACTION_FAILED",
        }),
        { status: 422, headers: corsHeaders }
      );
    }

    // Save to the appropriate table
    if (chapter_id) {
      const { error: updateError } = await serviceClient
        .from("module_chapters")
        .update({ pdf_text: extractedText })
        .eq("id", chapter_id);

      if (updateError) throw updateError;
    } else {
      const { error: updateError } = await serviceClient
        .from("topics")
        .update({ pdf_text: extractedText })
        .eq("id", topic_id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        characters: extractedText.length,
        target: chapter_id ? "chapter" : "topic",
        target_id: targetId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-pdf-text error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function extractTextFromPdf(
  base64Pdf: string,
  provider: { name: string; model: string },
  apiKey?: string
): Promise<string> {
  const systemPrompt = `You are a text extraction assistant. Extract ALL text content from this PDF document.
Preserve the structure: headings, numbered sections, paragraphs, bullet points, tables.
Do NOT summarize or paraphrase. Extract verbatim text.
Do NOT add any commentary or introduction. Just output the extracted text.`;

  const userPrompt = "Extract all text from this PDF document, preserving structure and formatting.";

  // Use Gemini vision API for PDF processing (preferred for document understanding)
  if (provider.name === "gemini" || provider.name === "lovable") {
    const geminiKey = apiKey || Deno.env.get("GOOGLE_API_KEY");
    if (!geminiKey) throw new Error("GOOGLE_API_KEY not configured");

    const model = provider.name === "gemini" ? provider.model : "gemini-2.0-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt + "\n\n" + userPrompt },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64Pdf,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 65536,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    return result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // Anthropic with PDF support
  if (provider.name === "anthropic") {
    const anthropicKey = apiKey || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 65536,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf,
                },
              },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    return result?.content?.[0]?.text || "";
  }

  throw new Error(`Unsupported provider: ${provider.name}`);
}
