import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const allowedRoles = [
      "super_admin",
      "platform_admin",
      "admin",
      "teacher",
      "department_admin",
    ];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chapter_id } = await req.json();
    if (!chapter_id) {
      return new Response(
        JSON.stringify({ error: "chapter_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch MCQs without ai_confidence for this chapter
    const { data: mcqs, error: mcqError } = await supabase
      .from("mcqs")
      .select("id, stem, choices, correct_key, explanation")
      .eq("chapter_id", chapter_id)
      .eq("is_deleted", false)
      .is("ai_confidence", null);

    if (mcqError) {
      throw new Error(`Failed to fetch MCQs: ${mcqError.message}`);
    }

    if (!mcqs || mcqs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No MCQs need confidence rating",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find linked PDF document for this chapter
    const { data: doc } = await supabase
      .from("admin_documents")
      .select("storage_path, storage_bucket")
      .eq("chapter_id", chapter_id)
      .eq("is_deleted", false)
      .limit(1)
      .single();

    let pdfBase64: string | null = null;

    if (doc) {
      // Download PDF from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from(doc.storage_bucket)
        .download(doc.storage_path);

      if (!dlError && fileData) {
        const buffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Chunked base64 encoding to avoid stack overflow
        const chunkSize = 24576; // 24KB chunks (multiple of 3)
        const chunks: string[] = [];
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const slice = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
          chunks.push(btoa(String.fromCharCode(...slice)));
        }
        pdfBase64 = chunks.join("");
      }
    }

    // Process MCQs in batches of 10
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let processed = 0;
    const batchSize = 10;

    for (let i = 0; i < mcqs.length; i += batchSize) {
      const batch = mcqs.slice(i, i + batchSize);

      const mcqDescriptions = batch
        .map((m, idx) => {
          const choices = (m.choices as { key: string; text: string }[]) || [];
          const choiceText = choices
            .map((c) => `  ${c.key}: ${c.text}`)
            .join("\n");
          return `MCQ ${idx + 1} (ID: ${m.id}):\nStem: ${m.stem}\nChoices:\n${choiceText}\nCorrect Answer: ${m.correct_key}\nExplanation: ${m.explanation || "None provided"}`;
        })
        .join("\n\n---\n\n");

      const prompt = `You are a medical education quality reviewer. Rate each MCQ below on a scale of 0-10 for accuracy and quality.

Rating criteria:
- 10: Question, correct answer, and explanation are perfectly accurate and well-grounded
- 7-9: Mostly accurate with minor issues
- 4-6: Some inaccuracies or unclear wording
- 1-3: Significant errors or misleading content
- 0: Completely wrong or nonsensical

${pdfBase64 ? "Use the attached PDF document as the source of truth for verifying accuracy." : "Rate based on general medical knowledge since no source PDF is available."}

For each MCQ, respond with ONLY a JSON array of objects with "id" (the MCQ ID) and "confidence" (integer 0-10). No other text.

MCQs to rate:

${mcqDescriptions}`;

      const parts: Array<Record<string, unknown>> = [
        { text: prompt },
      ];

      if (pdfBase64) {
        parts.unshift({
          inline_data: {
            mime_type: "application/pdf",
            data: pdfBase64,
          },
        });
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        console.error(
          `Gemini API error: ${geminiResponse.status}`,
          await geminiResponse.text()
        );
        continue;
      }

      const geminiData = await geminiResponse.json();
      const responseText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON from response
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const ratings: { id: string; confidence: number }[] = JSON.parse(
            jsonMatch[0]
          );

          for (const rating of ratings) {
            const confidence = Math.max(0, Math.min(10, Math.round(rating.confidence)));
            await supabase
              .from("mcqs")
              .update({ ai_confidence: confidence })
              .eq("id", rating.id);
            processed++;
          }
        }
      } catch (parseErr) {
        console.error("Failed to parse AI response:", parseErr, responseText);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        total: mcqs.length,
        hadPdf: !!pdfBase64,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
