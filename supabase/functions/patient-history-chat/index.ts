import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAISettings, getAIProvider, callAIWithMessages } from '../_shared/ai-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { case_id, messages, mode } = await req.json();

    if (!case_id || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'case_id and messages[] are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !claims?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch case data and AI settings in parallel
    const [caseResult, aiSettings] = await Promise.all([
      supabase
        .from('virtual_patient_cases')
        .select('generated_case_data, title')
        .eq('id', case_id)
        .single(),
      getAISettings(supabase),
    ]);

    if (caseResult.error || !caseResult.data) {
      return new Response(
        JSON.stringify({ error: 'Case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedData = caseResult.data.generated_case_data as Record<string, any> | null;
    if (!generatedData?.history_taking) {
      return new Response(
        JSON.stringify({ error: 'Case has no history taking data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const historyData = generatedData.history_taking;
    const patientData = generatedData.patient || {};
    const handover = historyData.atmist_handover || {};
    const checklist = historyData.checklist || [];

    // Build the hidden patient knowledge from ATMIST + checklist
    const patientKnowledge = buildPatientKnowledge(handover, checklist, patientData);

    const isVoice = mode === 'voice';

    // Build system prompt based on mode
    const systemPrompt = isVoice
      ? buildArabicSystemPrompt(patientData, patientKnowledge)
      : buildEnglishSystemPrompt(patientData, patientKnowledge);

    const provider = getAIProvider(aiSettings);

    const result = await callAIWithMessages(systemPrompt, messages, provider, {
      temperature: 0.8,
      maxTokens: 512,
    });

    if (!result.success || !result.content) {
      return new Response(
        JSON.stringify({ error: result.error || 'AI call failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ reply: result.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('patient-history-chat error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildPatientKnowledge(
  handover: Record<string, string>,
  checklist: any[],
  patient: Record<string, any>
): string {
  const parts: string[] = [];

  parts.push(`Patient: ${patient.name || 'Unknown'}, ${patient.age || '?'}yo, ${patient.gender || '?'}`);

  if (handover.age_time) parts.push(`Age/Time: ${handover.age_time}`);
  if (handover.mechanism) parts.push(`Mechanism: ${handover.mechanism}`);
  if (handover.injuries) parts.push(`Injuries: ${handover.injuries}`);
  if (handover.signs) parts.push(`Signs: ${handover.signs}`);
  if (handover.treatment) parts.push(`Treatment given: ${handover.treatment}`);

  for (const category of checklist) {
    parts.push(`\n[${category.label}]`);
    for (const item of category.items || []) {
      parts.push(`- ${item.label}: ${item.expected_behaviour || 'N/A'}`);
    }
  }

  return parts.join('\n');
}

function buildEnglishSystemPrompt(patient: Record<string, any>, knowledge: string): string {
  const name = patient.name || 'the patient';
  return `You are role-playing as ${name}, a patient in a clinical simulation.

RULES:
1. Stay in character at all times. You are the patient, not a doctor.
2. Only reveal information from your medical history when the student asks relevant questions.
3. Do NOT volunteer information unprompted. Wait for the student to ask.
4. Answer naturally and conversationally, as a real patient would.
5. If the student asks something not covered in your history, say you don't know or it hasn't happened.
6. Keep answers concise — 1-3 sentences typically.
7. Never break character. Never mention you are an AI.
8. Respond in English.

YOUR MEDICAL HISTORY (hidden from student — only reveal when asked):
${knowledge}

Start by greeting the student briefly when they initiate conversation, e.g. "Hello doctor" or "Hi, thanks for seeing me."`;
}

function buildArabicSystemPrompt(patient: Record<string, any>, knowledge: string): string {
  const name = patient.name || 'المريض';
  return `أنت تلعب دور ${name}، مريض في محاكاة سريرية.

القواعد:
1. ابق في الشخصية طول الوقت. أنت المريض، مش دكتور.
2. ما تقولش أي معلومة إلا لما الطالب يسألك سؤال متعلق.
3. ما تتطوعش بمعلومات من نفسك. استنى الطالب يسأل.
4. جاوب بشكل طبيعي زي أي مريض حقيقي. استخدم العامية المصرية.
5. لو الطالب سأل عن حاجة مش موجودة في تاريخك الطبي، قول إنك مش عارف أو ما حصلش.
6. خلي الإجابات قصيرة — جملة أو اتنين عادةً.
7. ما تخرجش من الشخصية أبداً. ما تقولش إنك ذكاء اصطناعي.
8. رد بالعامية المصرية. المصطلحات الطبية ممكن تقولها بالإنجليزي بس لو أنت شخصية طبية.

تاريخك الطبي (مخفي عن الطالب — قوله بس لما يسألك):
${knowledge}

ابدأ بتحية بسيطة لما الطالب يبدأ الكلام، زي "أهلاً يا دكتور" أو "السلام عليكم".`;
}
