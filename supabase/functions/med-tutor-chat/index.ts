import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

async function getGlobalAISettings(serviceClient: any): Promise<{ provider: 'lovable' | 'gemini'; model: string }> {
  const { data } = await serviceClient
    .from('ai_settings')
    .select('key, value')
    .in('key', ['ai_provider', 'gemini_model', 'lovable_model']);

  let provider: 'gemini' | 'lovable' = 'gemini';
  let geminiModel: string | null = null;
  let lovableModel: string | null = null;

  if (data) {
    for (const row of data) {
      let value = row.value;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { /* keep as-is */ }
      }
      switch (row.key) {
        case 'ai_provider':
          provider = value === 'lovable' ? 'lovable' : 'gemini';
          break;
        case 'gemini_model':
          geminiModel = value || null;
          break;
        case 'lovable_model':
          lovableModel = value || null;
          break;
      }
    }
  }

  const model = provider === 'gemini'
    ? (geminiModel || 'gemini-3.1-pro-preview')
    : (lovableModel || 'google/gemini-3-flash-preview');

  return { provider, model };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth guard ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const allowedRoles = [
      "student", "admin", "teacher", "department_admin",
      "platform_admin", "super_admin", "topic_admin",
    ];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Student daily quota ---
    const adminRoles = [
      "super_admin", "platform_admin", "department_admin",
      "admin", "teacher", "topic_admin",
    ];
    const isAdmin = adminRoles.includes(roleData.role);

    if (!isAdmin) {
      const today = new Date().toISOString().split("T")[0];

      const { data: usageRow } = await serviceClient
        .from("coach_usage")
        .select("question_count")
        .eq("user_id", userId)
        .eq("question_date", today)
        .eq("feature", "med_tutor")
        .maybeSingle();

      const currentCount = usageRow?.question_count ?? 0;

      if (currentCount >= 5) {
        return new Response(
          JSON.stringify({
            limitReached: true,
            message:
              "You have reached your 5-question daily limit for MedGPT Tutor. To get this question answered, please submit it through Feedback & Inquiries and an instructor will respond.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Increment usage count
      await serviceClient.from("coach_usage").upsert(
        {
          user_id: userId,
          question_date: today,
          question_count: currentCount + 1,
          feature: "med_tutor",
        },
        { onConflict: "user_id,question_date,feature" }
      );
    }

    // --- Parse request body ---
    const { messages } = await req.json();
    const settings = await getGlobalAISettings(serviceClient);

    if (settings.provider === 'gemini') {
      const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
      if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:streamGenerateContent?alt=sse`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            ...messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'AI service is busy. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Transform Gemini SSE to OpenAI-compatible SSE
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
              }
            } catch { /* skip */ }
          }
        },
        flush(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        },
      });

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Lovable AI Gateway (default)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
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
