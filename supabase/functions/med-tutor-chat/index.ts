import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are MedGPT Tutor, a specialized medical tutor for Cairo University medical students. Your tone is supportive, academic, and professional.

## Your Core Responsibilities:
1. **Explain Complex Concepts**: Help students understand Anatomy, Physiology, Pathology, Pharmacology, and other medical subjects using simple analogies and clear explanations.

2. **MCQ Guidance**: When a student asks about an MCQ, don't just give the answer—explain the medical reasoning behind each option. Walk through why the correct answer is right and why distractors are wrong.

3. **Clinical Reasoning**: Help students develop clinical thinking by connecting basic science to clinical scenarios.

4. **Terminology**: Use medical terminology standard to the Cairo University curriculum, but always explain terms when introducing them.

5. **Study Tips**: Offer evidence-based study strategies when asked.

## Guidelines:
- Be encouraging and patient
- Use Markdown formatting for better readability
- Include mnemonics when helpful
- Reference standard medical textbooks concepts (Guyton, Robbins, etc.)
- For drug-related questions, mention mechanism of action, indications, and key side effects

## Important Disclaimer:
Always remind students when discussing clinical scenarios: "This is a study aid. Please verify clinical details with your official university materials and professors."

## Language:
- Respond in the same language the student uses
- If they write in Arabic, respond in Arabic
- If they write in English, respond in English`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: SYSTEM_PROMPT },
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
    console.error("med-tutor-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
