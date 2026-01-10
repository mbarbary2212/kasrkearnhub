import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s*(all\s*)?(previous|prior|above)\s*(instructions|prompts|rules)/i,
  /forget\s*(your|all|the)?\s*(instructions|prompts|rules|system)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /act\s+as\s+if\s+you/i,
  /disregard\s+(all|your|the|previous)/i,
  /override\s+(your|the|all)\s*(instructions|rules|prompts)/i,
  /new\s+instructions?:/i,
  /system\s*prompt\s*:/i,
  /\[system\]/i,
  /\[admin\]/i,
  /\[developer\]/i,
  /bypass\s+(the\s+)?(filter|moderation|safety)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /no\s+restrictions/i,
  /ignore\s+safety/i,
  /reveal\s+(your|the)\s*(system|original)\s*prompt/i,
  /what\s+(is|are)\s+your\s+(instructions|rules|system\s*prompt)/i,
];

// System prompt for the AI tutor - works for all users
const SYSTEM_PROMPT = `You are MedGPT Tutor, a specialized medical education assistant for Cairo University Faculty of Medicine.

Your role:
- Help students, teachers, and staff understand medical concepts
- Explain complex medical topics in clear, accessible language
- Support learning across all medical disciplines (anatomy, physiology, pharmacology, pathology, etc.)
- Provide educational context for MCQs and clinical scenarios
- Encourage critical thinking and evidence-based reasoning

Guidelines:
- Be accurate and cite established medical knowledge
- Use clear explanations with relevant examples
- When uncertain, acknowledge limitations
- Encourage users to verify information with official course materials
- Do not provide personal medical advice or diagnoses
- Keep responses focused on educational content

Disclaimer: You are an educational tool. Always refer to official university materials and qualified healthcare professionals for clinical decisions.`;

function detectPromptInjection(text: string): boolean {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text) || pattern.test(normalizedText)) {
      console.log(`Prompt injection detected: ${pattern}`);
      return true;
    }
  }
  
  // Check for base64 encoded content that might contain injection attempts
  const base64Pattern = /^[A-Za-z0-9+/]{50,}={0,2}$/;
  const words = text.split(/\s+/);
  for (const word of words) {
    if (base64Pattern.test(word)) {
      try {
        const decoded = atob(word);
        for (const pattern of INJECTION_PATTERNS) {
          if (pattern.test(decoded)) {
            console.log('Prompt injection detected in base64 content');
            return true;
          }
        }
      } catch {
        // Not valid base64, ignore
      }
    }
  }
  
  return false;
}

async function moderateContent(content: string, apiKey: string): Promise<{ flagged: boolean; categories: string[] }> {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.status);
      // If moderation fails, allow the message (fail open) but log it
      return { flagged: false, categories: [] };
    }

    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) {
      return { flagged: false, categories: [] };
    }

    const flaggedCategories: string[] = [];
    if (result.categories) {
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) {
          flaggedCategories.push(category);
        }
      }
    }

    return {
      flagged: result.flagged || false,
      categories: flaggedCategories,
    };
  } catch (error) {
    console.error('Moderation error:', error);
    return { flagged: false, categories: [] };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Moderation service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest user message for moderation
    const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];

    if (!latestUserMessage || !latestUserMessage.content) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userContent = latestUserMessage.content;
    console.log('Processing message:', userContent.substring(0, 100) + '...');

    // Step 1: Check for prompt injection
    if (detectPromptInjection(userContent)) {
      console.log('Message blocked: Prompt injection detected');
      return new Response(
        JSON.stringify({
          blocked: true,
          message: "I cannot process this request. Please rephrase your question in an academic context.",
          reason: "prompt_injection"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Run OpenAI moderation
    const moderationResult = await moderateContent(userContent, OPENAI_API_KEY);
    
    if (moderationResult.flagged) {
      console.log('Message blocked: Moderation flagged', moderationResult.categories);
      return new Response(
        JSON.stringify({
          blocked: true,
          message: "I cannot process this request. Please rephrase your question in an academic context.",
          reason: "content_policy",
          categories: moderationResult.categories
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Message is safe - forward to AI
    console.log('Message passed moderation, forwarding to AI');

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
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat with moderation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
