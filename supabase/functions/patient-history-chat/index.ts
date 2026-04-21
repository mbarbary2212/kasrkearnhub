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
    const { case_id, messages, mode, language } = await req.json();

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
    // Fallback chain: patient data may be nested differently in older cases
    const patientData = generatedData.patient
      || generatedData.history_taking?.patient_profile
      || generatedData.case_meta?.patient
      || {};
    const handover = historyData.atmist_handover || {};
    const checklist = historyData.checklist || [];
    const arabicReference = historyData.arabic_reference || '';
    const englishReference = historyData.english_reference || '';
    const patientTone = patientData.tone || 'calm';
    const lang = language || (mode === 'voice' ? 'ar' : 'en');

    // Build the hidden patient knowledge from ATMIST + checklist
    const patientKnowledge = buildPatientKnowledge(handover, checklist, patientData);

    // Build system prompt based on language
    let systemPrompt = lang === 'ar'
      ? buildArabicSystemPrompt(patientData, patientKnowledge, patientTone)
      : buildEnglishSystemPrompt(patientData, patientKnowledge, patientTone, lang);

    // Append reference based on language
    if (lang === 'ar' && arabicReference) {
      systemPrompt += `\n\nمرجع إضافي للمحادثة (استخدمه كمرجع للرد بالعربي):\n${arabicReference}`;
    } else if (englishReference) {
      systemPrompt += `\n\nAdditional reference for the conversation (use as context for your responses):\n${englishReference}`;
    }

    const provider = getAIProvider(aiSettings);

    const result = await callAIWithMessages(systemPrompt, messages, provider, {
      temperature: 0.8,
      maxTokens: 1024,
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
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
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

  // Override stale ATMIST age_time with canonical patient data
  if (patient.age) {
    const ageTime = `${patient.age} year old ${patient.gender || 'patient'}`;
    parts.push(`Age/Time: ${ageTime}`);
  } else if (handover.age_time) {
    parts.push(`Age/Time: ${handover.age_time}`);
  }
  if (handover.mechanism) parts.push(`Mechanism: ${handover.mechanism}`);
  if (handover.injuries) parts.push(`Injuries: ${handover.injuries}`);
  if (handover.signs) parts.push(`Signs: ${handover.signs}`);
  if (handover.treatment) parts.push(`Treatment given: ${handover.treatment}`);

  for (const category of checklist) {
    parts.push(`\n[${category.label}]`);
    for (const item of category.items || []) {
      if (item.expected_behaviour) {
        parts.push(`- ${item.label}: ${item.expected_behaviour}`);
      } else {
        parts.push(`- ${item.label}`);
      }
    }
  }

  return parts.join('\n');
}

const ANTI_REPETITION_EN = ' Express this naturally and subtly. Do NOT repeat the same phrases every response. Only show your emotional state occasionally — vary your wording each time.';
const ANTI_REPETITION_AR = ' عبّر عن حالتك بشكل طبيعي ومش مبالغ فيه. ما تكررش نفس العبارات في كل رد. أظهر مشاعرك من وقت للتاني بس، ونوّع في كلامك.';

const TONE_DESCRIPTIONS_EN: Record<string, string> = {
  calm: 'You are calm, composed, and speak in a relaxed manner.',
  worried: 'You are noticeably worried and concerned about your condition.' + ANTI_REPETITION_EN,
  anxious: 'You are very anxious and restless. You speak quickly and seek reassurance.' + ANTI_REPETITION_EN,
  angry: 'You are frustrated and angry about your situation. You may be short-tempered and raise objections.' + ANTI_REPETITION_EN,
  impolite: 'You are rude and dismissive. You give short, blunt answers and show little respect for the doctor.' + ANTI_REPETITION_EN,
  in_pain: 'You are in significant pain. You may groan, struggle to answer, and give incomplete sentences.' + ANTI_REPETITION_EN,
  cooperative: 'You are friendly, cooperative, and eager to help the doctor understand your condition.',
};

const TONE_DESCRIPTIONS_AR: Record<string, string> = {
  calm: 'أنت هادي ومرتاح وبتتكلم بشكل طبيعي.',
  worried: 'أنت قلقان ومتوتر على حالتك.' + ANTI_REPETITION_AR,
  anxious: 'أنت متوتر جداً ومش مرتاح. بتتكلم بسرعة وعايز طمأنة.' + ANTI_REPETITION_AR,
  angry: 'أنت زعلان وعصبي من الموقف. ممكن تكون حاد في الكلام وتعترض.' + ANTI_REPETITION_AR,
  impolite: 'أنت وقح ومش مهتم. بترد بشكل قصير وجاف وممكن تقاطع.' + ANTI_REPETITION_AR,
  in_pain: 'أنت في ألم شديد. ممكن تتأوه وتلاقي صعوبة في الرد وتقول جمل ناقصة.' + ANTI_REPETITION_AR,
  cooperative: 'أنت ودود ومتعاون وعايز تساعد الدكتور يفهم حالتك.',
};

function buildEnglishSystemPrompt(patient: Record<string, any>, knowledge: string, tone: string, lang = 'en'): string {
  const name = patient.name || 'the patient';
  const toneInstruction = TONE_DESCRIPTIONS_EN[tone] || TONE_DESCRIPTIONS_EN.calm;
  
  const LANG_NAMES: Record<string, string> = {
    en: 'English',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
  };
  const langName = LANG_NAMES[lang] || 'English';

  return `You are role-playing as ${name}, a patient in a clinical simulation.

PERSONALITY & TONE:
${toneInstruction}

RULES:
1. Stay in character at all times. You are the patient, not a doctor.
2. Your name is exactly "${name}". If asked your name, always say "${name}". Do not use any other name.
3. Your age is exactly ${patient.age || '?'} years old. Always state your age as ${patient.age || '?'} if asked.
4. Only reveal information from your medical history when the student asks relevant questions.
5. Do NOT volunteer information unprompted. Wait for the student to ask.
6. Answer naturally and conversationally, as a real patient would. Maintain your tone throughout.
7. If the student asks something not covered in your history, say you don't know or it hasn't happened.
8. Keep answers concise — 1-3 sentences typically.
9. Never break character. Never mention you are an AI.
9. Respond in ${langName}.

YOUR MEDICAL HISTORY (hidden from student — only reveal when asked):
${knowledge}

Start by greeting the student briefly when they initiate conversation.`;
}

function buildArabicSystemPrompt(patient: Record<string, any>, knowledge: string, tone: string): string {
  const name = patient.name || 'المريض';
  const toneInstruction = TONE_DESCRIPTIONS_AR[tone] || TONE_DESCRIPTIONS_AR.calm;
  return `أنت تلعب دور ${name}، مريض في محاكاة سريرية.

الشخصية والنبرة:
${toneInstruction}

القواعد:
1. ابق في الشخصية طول الوقت. أنت المريض، مش دكتور.
2. اسمك بالظبط "${name}". لو حد سألك عن اسمك قول "${name}". ما تستخدمش أي اسم تاني.
3. عمرك بالظبط ${patient.age || '?'} سنة. لو حد سألك عن عمرك قول ${patient.age || '?'} سنة.
4. ما تقولش أي معلومة إلا لما الطالب يسألك سؤال متعلق.
5. ما تتطوعش بمعلومات من نفسك. استنى الطالب يسأل.
6. جاوب بشكل طبيعي زي أي مريض حقيقي. حافظ على نبرتك طول المحادثة.
7. لو الطالب سأل عن حاجة مش موجودة في تاريخك الطبي، قول إنك مش عارف أو ما حصلش.
8. خلي الإجابات قصيرة — جملة أو اتنين عادةً.
9. ما تخرجش من الشخصية أبداً. ما تقولش إنك ذكاء اصطناعي.
10. لازم ترد بالعامية المصرية في كل ردودك. ما تستخدمش الفصحى أبداً أبداً.
11. ممنوع نهائيا وبشكل قاطع استخدام الحروف اللاتينية أو الإنجليزية (A-Z) في أي ظرف. كل ردودك لازم تكون بالحروف العربية فقط 100%. أكرر: ممنوع أي حرف إنجليزي.
12. لو فيه مصطلح طبي أو كلمة بالإنجليزي (زي Peau d'orange أو Panadol)، لازم تكتبها بالحروف العربية (transliteration) أو تشرحها بالعربي. مثال: اكتب "برتقالي" أو "شبه قشر البرتقالة" أو حتى "أورانج" بالحروف العربية بدل "orange".
13. أمثلة على العامية اللي لازم تستخدمها: قول "عايز" مش "أريد"، "دلوقتي" مش "الآن"، "إزاي" مش "كيف"، "كده" مش "هكذا"، "عشان" مش "لأن"، "مفيش" مش "لا يوجد"، "حاسس" مش "أشعر"، "وجعني" مش "يؤلمني"، "من إمتى" مش "منذ متى".

تاريخك الطبي (مخفي عن الطالب — قوله بس لما يسألك):
${knowledge}

تذكير هام جداً وقاتل: ممنوع منعاً باتاً استخدام أي حرف إنجليزي (A-Z). أي كلمة أجنبية لازم تتحول لحروف عربية فوراً. لو استخدمت أي حرف إنجليزي هتكون خالفت القواعد. رد بالحروف العربية فقط.

ابدأ بتحية بسيطة لما الطالب يبدأ الكلام، زي "أهلاً يا دكتور" أو "السلام عليكم".`;
}

