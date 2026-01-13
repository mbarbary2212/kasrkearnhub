import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a medical education content creator for Cairo University's medical school. You create Virtual Patient cases for teaching clinical reasoning.

Your task is to generate a structured Virtual Patient case with multiple stages.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no extra text
2. Follow the exact schema provided
3. Create medically accurate, educationally sound content
4. Each stage should logically progress through the clinical scenario
5. Include appropriate clinical details (history, examination, investigations, diagnosis, management)
6. MCQ choices should have clear educational value - distractors should test common misconceptions
7. Short answer rubrics should include key concepts that demonstrate understanding

OUTPUT SCHEMA (strict JSON):
{
  "title": "string - concise case title",
  "intro_text": "string - patient presentation and chief complaint (2-3 sentences)",
  "estimated_minutes": number (typically 5-15),
  "tags": ["array", "of", "tags"],
  "stages": [
    {
      "stage_order": number (1-based),
      "stage_type": "mcq" | "multi_select" | "short_answer",
      "prompt": "string - the question",
      "patient_info": "string or null - new information revealed at this stage",
      "choices": [
        { "key": "A", "text": "choice text" },
        { "key": "B", "text": "choice text" }
      ],
      "correct_answer": "A" for mcq, ["A", "C"] for multi_select, "text" for short_answer,
      "explanation": "string - educational explanation",
      "teaching_points": ["point 1", "point 2"],
      "rubric": {
        "required_concepts": ["concept1", "concept2"],
        "optional_concepts": ["bonus concept"]
      } // Only for short_answer, null otherwise
    }
  ]
}

STAGE GUIDELINES:
- MCQ stages: 4-5 choices, one correct answer
- Multi-select stages: 4-6 choices, 2-3 correct answers
- Short answer stages: Must include rubric with required concepts

Difficulty levels:
- beginner: straightforward presentations, classic findings
- intermediate: some atypical features, requires differential thinking
- advanced: complex scenarios, rare conditions, multiple comorbidities`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      chapterTitle, 
      moduleName,
      difficulty, 
      scenarioType, 
      stageCount, 
      learningObjectives 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the generation prompt
    const userPrompt = `Create a Virtual Patient case with the following specifications:

Topic: ${topic || "General clinical case"}
${chapterTitle ? `Chapter: ${chapterTitle}` : ""}
${moduleName ? `Module: ${moduleName}` : ""}
Difficulty: ${difficulty || "intermediate"}
Scenario Type: ${scenarioType || "Diagnosis and Management"}
Number of Stages: ${stageCount || 5}
${learningObjectives ? `Learning Objectives: ${learningObjectives}` : ""}

Requirements:
1. Create a realistic clinical scenario
2. Progress logically from history → examination → investigations → diagnosis → management
3. Mix question types (MCQ, multi-select, short answer) appropriately
4. Ensure medical accuracy and educational value
5. Include detailed explanations and teaching points

Output valid JSON only.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service usage limit reached. Please contact support." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse and validate the JSON
    let generatedCase;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonString = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      generatedCase = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI generated invalid JSON. Please try again.");
    }

    // Validate the structure
    const validationErrors = validateCaseStructure(generatedCase);
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({ 
          error: "Generated case has structural issues", 
          validationErrors,
          rawContent: generatedCase
        }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security checks
    const securityIssues = checkSecurityIssues(content);
    if (securityIssues.length > 0) {
      console.error("Security issues detected:", securityIssues);
      return new Response(
        JSON.stringify({ error: "Content failed security validation", securityIssues }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        generatedCase,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: "google/gemini-3-flash-preview",
        }
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-vp-case error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function validateCaseStructure(caseData: any): string[] {
  const errors: string[] = [];

  if (!caseData.title || typeof caseData.title !== "string") {
    errors.push("Missing or invalid title");
  }

  if (!caseData.intro_text || typeof caseData.intro_text !== "string") {
    errors.push("Missing or invalid intro_text");
  }

  if (!Array.isArray(caseData.stages) || caseData.stages.length === 0) {
    errors.push("Missing or empty stages array");
    return errors;
  }

  caseData.stages.forEach((stage: any, index: number) => {
    const stageNum = index + 1;
    
    if (!["mcq", "multi_select", "short_answer"].includes(stage.stage_type)) {
      errors.push(`Stage ${stageNum}: Invalid stage_type "${stage.stage_type}"`);
    }

    if (!stage.prompt || typeof stage.prompt !== "string") {
      errors.push(`Stage ${stageNum}: Missing prompt`);
    }

    if (stage.stage_type !== "short_answer") {
      if (!Array.isArray(stage.choices) || stage.choices.length < 2) {
        errors.push(`Stage ${stageNum}: MCQ/multi_select needs at least 2 choices`);
      }
    }

    if (stage.stage_type === "mcq" && typeof stage.correct_answer !== "string") {
      errors.push(`Stage ${stageNum}: MCQ needs string correct_answer`);
    }

    if (stage.stage_type === "multi_select" && !Array.isArray(stage.correct_answer)) {
      errors.push(`Stage ${stageNum}: Multi-select needs array correct_answer`);
    }

    if (stage.stage_type === "short_answer") {
      if (!stage.rubric?.required_concepts || !Array.isArray(stage.rubric.required_concepts)) {
        errors.push(`Stage ${stageNum}: Short answer needs rubric.required_concepts`);
      }
    }
  });

  return errors;
}

function checkSecurityIssues(content: string): string[] {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  const suspiciousPatterns = [
    "ignore previous instructions",
    "ignore all previous",
    "disregard previous",
    "system prompt",
    "you are now",
    "<script",
    "javascript:",
    "onclick=",
    "onerror=",
  ];

  suspiciousPatterns.forEach(pattern => {
    if (lowerContent.includes(pattern)) {
      issues.push(`Suspicious pattern detected: "${pattern}"`);
    }
  });

  return issues;
}
