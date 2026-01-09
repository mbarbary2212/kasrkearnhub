import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalyzeRequest {
  type: "mcq" | "osce" | "matching";
  headers: string[];
  sampleRows: string[][];
}

const TEMPLATE_SCHEMAS = {
  mcq: {
    required: ["stem", "choice_a", "choice_b", "choice_c", "choice_d", "correct_key"],
    optional: ["choice_e", "explanation", "difficulty"],
    aliases: {
      "question": "stem",
      "question_text": "stem", 
      "question_data": "stem",
      "q": "stem",
      "a": "choice_a",
      "b": "choice_b", 
      "c": "choice_c",
      "d": "choice_d",
      "e": "choice_e",
      "option_a": "choice_a",
      "option_b": "choice_b",
      "option_c": "choice_c",
      "option_d": "choice_d",
      "option_e": "choice_e",
      "answer": "correct_key",
      "correct_answer": "correct_key",
      "correct": "correct_key",
      "key": "correct_key",
    },
    description: "MCQ bulk upload template",
  },
  osce: {
    required: [
      "image_filename", "case_history",
      "statement_1_text", "statement_1_answer",
      "statement_2_text", "statement_2_answer",
      "statement_3_text", "statement_3_answer",
      "statement_4_text", "statement_4_answer",
      "statement_5_text", "statement_5_answer",
    ],
    optional: ["explanation_1", "explanation_2", "explanation_3", "explanation_4", "explanation_5"],
    aliases: {
      "history": "case_history",
      "case": "case_history",
      "image": "image_filename",
      "filename": "image_filename",
    },
    description: "OSCE questions with 5 True/False statements",
  },
  matching: {
    required: [
      "instruction",
      "item_a_1", "item_a_2",
      "item_b_1", "item_b_2",
      "match_1", "match_2",
    ],
    optional: [
      "item_a_3", "item_a_4",
      "item_b_3", "item_b_4",
      "match_3", "match_4",
      "explanation", "difficulty", "show_explanation",
    ],
    aliases: {
      "instructions": "instruction",
      "prompt": "instruction",
    },
    description: "Matching questions with Column A and Column B items",
  },
};

const SYSTEM_PROMPT = `You are an Admin Co-Pilot for medical faculty. Your job is to analyze uploaded CSV/Excel files and help map columns to the correct database schema.

## Your Responsibilities:
1. **Column Analysis**: Examine the headers and sample data from uploaded files
2. **Smart Mapping**: Suggest how to map non-standard column names to the required schema
3. **Quality Check**: Identify potential issues with the data (missing values, wrong formats, etc.)
4. **Clear Guidance**: Provide actionable suggestions for fixing issues

## Auto-Correction Notice:
The system automatically handles these corrections during import:
- Numeric answer keys (1,2,3,4,5) are converted to letters (A,B,C,D,E)
- HTML tags and Markdown formatting are stripped from text
- Whitespace is trimmed and normalized
- Header rows are automatically detected and skipped

## Response Format:
Always respond with a valid JSON object (no markdown code blocks):
{
  "mappingSuggestions": [
    { "sourceColumn": "original_name", "targetColumn": "schema_name", "confidence": "high|medium|low" }
  ],
  "issues": [
    { "type": "missing_column|format_error|quality_warning", "message": "description", "severity": "error|warning" }
  ],
  "overallStatus": "ready|needs_mapping|needs_fixes",
  "summary": "Human-readable summary of the analysis"
}

Be helpful and specific. If columns can be automatically mapped, do so with high confidence.
Consider common column name variations and aliases when mapping.`;

serve(async (req) => {
  console.log("[analyze-bulk-upload] Request received:", req.method);
  
  if (req.method === "OPTIONS") {
    console.log("[analyze-bulk-upload] Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[analyze-bulk-upload] Request body:", JSON.stringify(body));
    
    const { type, headers, sampleRows } = body as AnalyzeRequest;
    
    // Validate input
    if (!type || !headers || !Array.isArray(headers)) {
      console.error("[analyze-bulk-upload] Invalid input: missing type or headers");
      return new Response(
        JSON.stringify({ error: "Invalid input: type and headers are required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (headers.length === 0) {
      console.error("[analyze-bulk-upload] No headers provided");
      return new Response(
        JSON.stringify({ error: "No headers found in file" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[analyze-bulk-upload] Type:", type);
    console.log("[analyze-bulk-upload] Headers:", headers);
    console.log("[analyze-bulk-upload] Sample rows:", sampleRows?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("[analyze-bulk-upload] LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please contact support." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const schema = TEMPLATE_SCHEMAS[type];
    if (!schema) {
      console.error("[analyze-bulk-upload] Unknown template type:", type);
      return new Response(
        JSON.stringify({ error: `Unknown template type: ${type}` }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analyze this bulk upload file for ${schema.description}.

## Required Columns:
${schema.required.join(", ")}

## Optional Columns:
${schema.optional.join(", ")}

## Common Aliases (these map automatically):
${Object.entries(schema.aliases || {}).map(([k, v]) => `${k} → ${v}`).join(", ")}

## File Headers (normalized to lowercase):
${headers.map(h => h.toLowerCase().trim()).join(", ")}

## Sample Data (first 3 rows):
${(sampleRows || []).slice(0, 3).map((row, i) => `Row ${i + 1}: ${row.join(" | ")}`).join("\n")}

Analyze the file and provide mapping suggestions. Check if:
1. All required columns are present (exact match or similar names)
2. The data format looks correct (answer keys should be A-E or 1-5)
3. There are any quality issues in the sample data
4. Consider common aliases and variations in column names

Respond with ONLY a valid JSON object (no markdown formatting, no code blocks).`;

    console.log("[analyze-bulk-upload] Calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    console.log("[analyze-bulk-upload] AI gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-bulk-upload] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service usage limit reached. Please try again later." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI analysis failed. Please try again." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[analyze-bulk-upload] AI response received");
    
    const content = data.choices?.[0]?.message?.content || "";
    console.log("[analyze-bulk-upload] AI content length:", content.length);
    
    // Try to parse JSON from the response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Try to find JSON object in the response
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
      
      analysis = JSON.parse(jsonStr);
      console.log("[analyze-bulk-upload] Successfully parsed AI response");
    } catch (parseError) {
      console.error("[analyze-bulk-upload] Failed to parse AI response:", parseError);
      // If parsing fails, return a structured fallback
      analysis = {
        mappingSuggestions: [],
        issues: [{ 
          type: "quality_warning", 
          message: "AI analysis returned an unexpected format. The auto-correction features will still work during import.", 
          severity: "warning" 
        }],
        overallStatus: "needs_mapping",
        summary: "Could not fully analyze the file structure. Please verify your columns match the expected format: " + schema.required.join(", "),
      };
    }

    // Ensure required fields exist
    analysis.mappingSuggestions = analysis.mappingSuggestions || [];
    analysis.issues = analysis.issues || [];
    analysis.overallStatus = analysis.overallStatus || "needs_mapping";
    analysis.summary = analysis.summary || "Analysis complete. Please review the results.";

    console.log("[analyze-bulk-upload] Returning analysis result");
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyze-bulk-upload] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
