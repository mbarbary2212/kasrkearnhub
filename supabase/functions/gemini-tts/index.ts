import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function addWavHeader(
  pcmBase64: string,
  inputSampleRate = 24000,
  outputSampleRate = 16000,
  numChannels = 1,
  bitsPerSample = 16
): ArrayBuffer {
  try {
    const rawData = atob(pcmBase64.trim());
    const pcmBuffer = new Int16Array(
      Uint8Array.from(rawData, c => c.charCodeAt(0)).buffer
    );

    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(pcmBuffer.length / ratio);
    const downsampled = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        const pos = i * ratio;
        const index = Math.floor(pos);
        const frac = pos - index;
        const a = pcmBuffer[index] ?? 0;
        const b = pcmBuffer[index + 1] ?? 0;
        downsampled[i] = Math.round(a + frac * (b - a));
    }

    const dataSize = downsampled.byteLength;
    const byteRate = outputSampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++)
        view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, outputSampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    new Uint8Array(buffer).set(new Uint8Array(downsampled.buffer), 44);
    return buffer;
  } catch (err) {
    console.error('>>>> WAV_HEADER_ERROR:', err);
    return new ArrayBuffer(44); 
  }
}

async function callGemini(inputText: string, voiceName: string, stylePrompt?: string) {
  const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('API Key missing');

  const modelId = 'gemini-2.0-flash-exp';
  const voice = (voiceName === 'Aoide' || voiceName === 'Aoede') ? 'Aoide' : 'Kore';
  const prompt = stylePrompt ? `${stylePrompt}\n\n${inputText}` : inputText;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
  
  console.log(`>>>> Gemini Request: ${modelId} | Voice: ${voice} | Prompt snippet: ${inputText.substring(0, 30)}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        }
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const data = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error('No audio data returned from Gemini');
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const svcClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const tokenId = url.searchParams.get('token_id');
      if (!tokenId) return new Response('Missing token_id', { status: 400, headers: corsHeaders });

      const { data: tokenData, error: tokenError } = await svcClient
        .from('tts_tokens')
        .delete()
        .eq('id', tokenId)
        .select()
        .single();

      if (tokenError || !tokenData) return new Response('Invalid token', { status: 401, headers: corsHeaders });

      const { text, voiceName, stylePrompt } = tokenData.payload;
      const audioData = await callGemini(text, voiceName, stylePrompt);
      const wavBuffer = addWavHeader(audioData);

      return new Response(wavBuffer, { headers: { ...corsHeaders, 'Content-Type': 'audio/wav' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await (createClient(supabaseUrl, supabaseAnonKey)).auth.getUser(token);
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

    const payload = await req.json();
    const { text, voiceName, stylePrompt } = payload;
    if (!text) return new Response('Missing text in body', { status: 400, headers: corsHeaders });

    // VALIDATION: Try reaching Gemini NOW so we catch errors early
    console.log('>>>> Performing pre-handshake validation...');
    try {
      await callGemini("Connection test", voiceName || "Kore", stylePrompt);
      console.log('>>>> Pre-handshake validation SUCCESS');
    } catch (err) {
      const msg = (err as Error).message;
      console.error('>>>> PRE_HANDSHAKE_FAILED:', msg);
      return new Response(JSON.stringify({ error: `Handshake failed: ${msg}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: tokenRow, error: insertError } = await svcClient
      .from('tts_tokens')
      .insert({ user_id: user.id, payload })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return new Response(JSON.stringify({ token_id: tokenRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const msg = (err as Error).message;
    console.error('>>>> MASTER_ERROR:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json', 
        'X-Error-Message': msg.substring(0, 200).replace(/\n/g, ' ') 
      }
    });
  }
});
