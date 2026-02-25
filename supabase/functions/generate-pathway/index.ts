import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAISettings, getAIProvider, callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a medical education content creator. You create interactive clinical decision pathways (decision trees) for teaching clinical reasoning.

Your task is to generate a structured pathway with multiple interconnected nodes.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations, no extra text
2. Follow the exact schema provided
3. Create medically accurate, educationally sound content
4. Each pathway should model a realistic clinical decision-making process
5. Decision nodes must have 2-4 mutually exclusive options
6. All branches must eventually reach an "end" node
7. Use appropriate node types for each step

NODE TYPES:
- "decision": A branching point where the user makes a choice (MUST have "options" array)
- "action": A clinical action to take (e.g., "Order CBC and CMP")
- "information": Context or findings (e.g., "Patient is tachycardic, BP 90/60")
- "emergency": Urgent/critical action (e.g., "Call Code Blue immediately")
- "end": Terminal node with outcome summary

OUTPUT SCHEMA (strict JSON):
{
  "title": "string - pathway title",
  "description": "string - brief description of the pathway",
  "nodes": [
    {
      "id": "node_1",
      "type": "information" | "decision" | "action" | "emergency" | "end",
      "content": "string - the step content or question",
      "next_node_id": "string | null - next node for non-decision types (null for end/decision nodes)",
      "options": [
        {
          "id": "node_1_opt_0",
          "text": "string - option text",
          "next_node_id": "string | null - target node"
        }
      ]
    }
  ]
}

PATHWAY GUIDELINES:
- Start with patient presentation or initial assessment (information node)
- Use decision nodes at key clinical reasoning points
- Action nodes for interventions, tests, treatments
- Emergency nodes for critical/urgent situations
- End nodes for final outcomes/dispositions
- 5-10 nodes for manageable complexity
- Ensure logical clinical flow
- Options array ONLY for decision nodes, omit for all other types`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      chapterTitle, 
      moduleName,
      pathwayType,
      nodeCount,
      additionalInstructions
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const aiSettings = await getAISettings(serviceClient);
    const provider = getAIProvider(aiSettings);

    console.log(`Using AI provider: ${provider.name}, model: ${provider.model}`);

    const userPrompt = `Create a clinical decision pathway with the following specifications:

Topic: ${topic || "General clinical pathway"}
${chapterTitle ? `Chapter: ${chapterTitle}` : ""}
${moduleName ? `Module: ${moduleName}` : ""}
Pathway Type: ${pathwayType || "Assessment and Management"}
Approximate Number of Nodes: ${nodeCount || 7}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ""}

Requirements:
1. Start with patient presentation or initial assessment
2. Include meaningful decision points with clinically relevant branching
3. Progress logically through assessment → investigation → diagnosis → management
4. Include at least 2 decision nodes with 2-3 options each
5. All branches must terminate at an "end" node
6. Use emergency nodes for critical situations if clinically appropriate
7. Make the pathway educationally valuable for medical students

Output valid JSON only.`;

    const result = await callAI(SYSTEM_PROMPT, userPrompt, provider);

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

    let generatedPathway;
    try {
      let jsonString = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      generatedPathway = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI generated invalid JSON. Please try again.");
    }

    // Validate
    const validationErrors = validatePathwayStructure(generatedPathway);
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({ 
          error: "Generated pathway has structural issues", 
          validationErrors,
          rawContent: generatedPathway
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
        generatedPathway,
        metadata: {
          generatedAt: new Date().toISOString(),
          provider: provider.name,
          model: provider.model,
        }
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-pathway error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function validatePathwayStructure(data: any): string[] {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== "string") {
    errors.push("Missing or invalid title");
  }

  if (!Array.isArray(data.nodes) || data.nodes.length < 3) {
    errors.push("Pathway must have at least 3 nodes");
    return errors;
  }

  const validTypes = ["decision", "action", "information", "emergency", "end"];
  const nodeIds = new Set(data.nodes.map((n: any) => n.id));
  let hasEnd = false;
  let hasDecision = false;

  data.nodes.forEach((node: any, index: number) => {
    const num = index + 1;

    if (!node.id) errors.push(`Node ${num}: missing id`);
    if (!validTypes.includes(node.type)) errors.push(`Node ${num}: invalid type "${node.type}"`);
    if (!node.content || node.content.length < 5) errors.push(`Node ${num}: content too short`);

    if (node.type === "decision") {
      hasDecision = true;
      if (!Array.isArray(node.options) || node.options.length < 2) {
        errors.push(`Node ${num}: decision needs at least 2 options`);
      } else {
        node.options.forEach((opt: any, oi: number) => {
          if (!opt.text) errors.push(`Node ${num}, Option ${oi + 1}: missing text`);
        });
      }
    }

    if (node.type === "end") hasEnd = true;
  });

  if (!hasEnd) errors.push("Pathway must have at least one 'end' node");
  if (!hasDecision) errors.push("Pathway must have at least one 'decision' node");

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
