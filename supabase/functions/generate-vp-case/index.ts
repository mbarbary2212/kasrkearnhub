import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider, callAI } from "../_shared/ai-provider.ts";
import { getBlueprintContext } from "../_shared/blueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGED_SYSTEM_PROMPT = `You are a medical education content creator for Cairo University's medical school. You create Virtual Patient cases for teaching clinical reasoning.

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

const AI_DRIVEN_SYSTEM_PROMPT = `You are a medical education content creator for Cairo University's medical school. You create AI-driven clinical case scenarios for OSCE-style examinations.

Your task is to generate a case OVERVIEW only (no stages/questions). The AI examiner will dynamically run the case at runtime.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no extra text
2. Follow the exact schema provided
3. Create medically accurate, educationally sound content
4. The intro_text should set up a realistic clinical scenario with patient demographics, chief complaint, and relevant context

OUTPUT SCHEMA (strict JSON):
{
  "title": "string - concise case title (e.g. 'Acute Chest Pain in a 55-year-old Male')",
  "intro_text": "string - patient presentation with demographics, chief complaint, and brief context (2-4 sentences)",
  "estimated_minutes": number (typically 10-20 for AI cases),
  "tags": ["array", "of", "relevant", "clinical", "tags"],
  "learning_objectives": "string - comma-separated or paragraph of key learning objectives for this case"
}

Difficulty levels:
- beginner: straightforward presentations, classic findings, common conditions
- intermediate: some atypical features, requires differential thinking
- advanced: complex scenarios, rare conditions, multiple comorbidities`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth guard ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient.from('user_roles').select('role').eq('user_id', userId).single();
    const userRole = roleData?.role || 'student';
    const allowedRoles = ['super_admin', 'platform_admin', 'admin', 'teacher', 'department_admin'];
    if (!allowedRoles.includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { 
      topic, 
      chapterTitle, 
      moduleName,
      difficulty, 
      scenarioType, 
      stageCount, 
      learningObjectives,
      aiDriven,
    } = await req.json();

    // Reuse serviceClient for AI settings
    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);

    console.log(`Using AI provider: ${provider.name}, model: ${provider.model}, aiDriven: ${!!aiDriven}`);

    const systemPrompt = aiDriven ? AI_DRIVEN_SYSTEM_PROMPT : STAGED_SYSTEM_PROMPT;

    // Build the generation prompt
    const userPrompt = aiDriven
      ? `Create an AI-driven clinical case overview with the following specifications:

Topic: ${topic || "General clinical case"}
${chapterTitle ? `Chapter: ${chapterTitle}` : ""}
${moduleName ? `Module: ${moduleName}` : ""}
Difficulty: ${difficulty || "intermediate"}
Scenario Type: ${scenarioType || "Diagnosis and Management"}
${learningObjectives ? `Learning Objectives to incorporate: ${learningObjectives}` : ""}

Requirements:
1. Create a realistic, detailed clinical scenario introduction
2. The intro_text should paint a vivid clinical picture that an AI examiner can use to run the case dynamically
3. Include relevant patient demographics and presenting complaint
4. Tags should cover relevant clinical domains
5. Learning objectives should be specific and measurable

Output valid JSON only.`
      : `Create a Virtual Patient case with the following specifications:

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

    // Use the shared AI provider abstraction
    const result = await callAI(systemPrompt, userPrompt, provider);

    if (!result.success) {
      console.error("AI call failed:", result.error);
      
      if (result.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (result.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service usage limit reached. Please contact support." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: result.error || "AI service temporarily unavailable" }), 
        { status: result.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = result.content;

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

    // Validate structure — only validate stages for non-AI-driven cases
    if (!aiDriven) {
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
    } else {
      // Minimal validation for AI-driven cases
      const errors = validateAIDrivenCase(generatedCase);
      if (errors.length > 0) {
        console.error("AI-driven validation errors:", errors);
        return new Response(
          JSON.stringify({ error: "Generated case has structural issues", validationErrors: errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
          provider: provider.name,
          model: provider.model,
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

function validateAIDrivenCase(caseData: any): string[] {
  const errors: string[] = [];
  if (!caseData.title || typeof caseData.title !== "string") {
    errors.push("Missing or invalid title");
  }
  if (!caseData.intro_text || typeof caseData.intro_text !== "string") {
    errors.push("Missing or invalid intro_text");
  }
  return errors;
}

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
