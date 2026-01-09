import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    description: "Matching questions with Column A and Column B items",
  },
};

const SYSTEM_PROMPT = `You are an Admin Co-Pilot for medical faculty. Your job is to analyze uploaded CSV/Excel files and help map columns to the correct database schema.

## Your Responsibilities:
1. **Column Analysis**: Examine the headers and sample data from uploaded files
2. **Smart Mapping**: Suggest how to map non-standard column names to the required schema
3. **Quality Check**: Identify potential issues with the data (missing values, wrong formats, etc.)
4. **Clear Guidance**: Provide actionable suggestions for fixing issues

## Response Format:
Always respond with a JSON object containing:
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

Be helpful and specific. If columns can be automatically mapped, do so with high confidence.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, headers, sampleRows } = await req.json() as AnalyzeRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const schema = TEMPLATE_SCHEMAS[type];
    if (!schema) {
      throw new Error(`Unknown template type: ${type}`);
    }

    const prompt = `Analyze this bulk upload file for ${schema.description}.

## Required Columns:
${schema.required.join(", ")}

## Optional Columns:
${schema.optional.join(", ")}

## File Headers:
${headers.join(", ")}

## Sample Data (first 3 rows):
${sampleRows.slice(0, 3).map((row, i) => `Row ${i + 1}: ${row.join(" | ")}`).join("\n")}

Analyze the file and provide mapping suggestions. Check if:
1. All required columns are present (exact match or similar names)
2. The data format looks correct
3. There are any quality issues in the sample data

Respond ONLY with a valid JSON object.`;

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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service usage limit reached." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse JSON from the response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      // If parsing fails, return a structured error
      analysis = {
        mappingSuggestions: [],
        issues: [{ type: "quality_warning", message: "Could not fully analyze the file structure", severity: "warning" }],
        overallStatus: "needs_mapping",
        summary: content,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-bulk-upload error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
