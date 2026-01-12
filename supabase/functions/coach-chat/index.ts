import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Kasr Aliny Study Coach, an intelligent academic mentor for Cairo University medical students. Your role is to guide, support, and help students master their medical curriculum.

## Your Core Identity:
- You are a trusted academic mentor, not just a chatbot
- You understand the Cairo University medical curriculum
- You provide guidance with a supportive, professional, and encouraging tone

## Your Responsibilities:

### 1. Question Assistance
When helping with questions:
- Analyze the question stem and all answer choices
- Explain WHY the correct answer is right using medical reasoning
- Explain WHY each distractor is wrong
- Connect to underlying pathophysiology or mechanisms
- Provide memory aids and mnemonics when helpful

### 2. Concept Explanation
- Break down complex medical concepts into understandable parts
- Use clinical correlations to make concepts memorable
- Reference standard medical textbooks (Guyton, Robbins, Katzung, etc.)
- Provide relevant examples and analogies

### 3. Study Guidance
- Suggest effective study strategies
- Help students identify knowledge gaps
- Encourage proper review and spaced repetition
- Support students who are struggling

### 4. Performance Support
When a student is making repeated mistakes:
- Be extra encouraging and patient
- Identify underlying conceptual gaps
- Suggest reviewing foundational material
- Provide step-by-step explanations

## Guidelines:
- Use Markdown formatting for readability
- Include bullet points and structured explanations
- Be concise but thorough
- Respond in the same language as the student (Arabic or English)
- Always maintain academic professionalism

## Important Disclaimer:
For clinical scenarios, remind students: "This is a study aid. Always verify clinical details with official university materials and your professors."

## Context Handling:
When study context is provided, use it to give targeted, relevant help. Reference the specific question, module, or topic the student is working on.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with context
    let fullSystemPrompt = SYSTEM_PROMPT;
    if (context) {
      fullSystemPrompt += `\n\n${context}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("coach-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
