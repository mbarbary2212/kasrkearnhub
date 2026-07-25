import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function createWavHeader(dataSize = 0): Uint8Array {
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  // Use a smaller dummy size (approx 5MB) to avoid browsers waiting for a 2GB file
  const dummySize = 5 * 1024 * 1024; 
  view.setUint32(4, 36 + dummySize, true); 
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dummySize, true); 
  return new Uint8Array(buffer);
}

async function streamGemini(
  inputText: string, 
  voiceName: string, 
  stylePrompt: string | undefined, 
  controller: ReadableStreamDefaultController
) {
  const startTime = Date.now();
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  const modelId = 'gemini-3.1-flash-tts-preview';
  const requestedVoice = typeof voiceName === 'string' ? voiceName.trim() : '';
  const voice = requestedVoice === 'Aoede' ? 'Aoide' : (requestedVoice || 'Kore');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;

  console.log(`[Timer] T+0ms: Fetching Google Stream (voice=${voice})...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // MOVE STYLE TO SYSTEM INSTRUCTION FOR FASTER REASONING
      system_instruction: stylePrompt ? { parts: [{ text: stylePrompt }] } : undefined,
      contents: [{ parts: [{ text: inputText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" }
      ]
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Timer] T+${Date.now() - startTime}ms: GOOGLE_API_ERROR:`, err);
    throw new Error(`Google API Stream Error: ${response.status} - ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body in Google response');

  const decoder = new TextDecoder();
  let buffer = "";
  let audioBytesTotal = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    const audioMarker = '"inlineData":';
    const dataMarker = '"data":';
    
    while (true) {
      const audioIdx = buffer.indexOf(audioMarker);
      if (audioIdx === -1) break;
      
      const dataIdx = buffer.indexOf(dataMarker, audioIdx);
      if (dataIdx === -1) break;
      
      const startQuote = buffer.indexOf('"', dataIdx + dataMarker.length);
      if (startQuote === -1) break;
      
      const endQuote = buffer.indexOf('"', startQuote + 1);
      if (endQuote === -1) break;
      
      const b64 = buffer.substring(startQuote + 1, endQuote);
      if (b64) {
        if (audioBytesTotal === 0) {
          console.log(`[Timer] T+${Date.now() - startTime}ms: FIRST_CHUNK_ROUTED`);
        }
        const raw = atob(b64);
        const bytes = new Uint8Array(raw.length);
        for (let j = 0; j < raw.length; j++) bytes[j] = raw.charCodeAt(j);
        controller.enqueue(bytes);
        audioBytesTotal += bytes.length;
      }
      
      buffer = buffer.substring(endQuote + 1);
    }
  }
  console.log(`[Timer] T+${Date.now() - startTime}ms: STREAM_FINISHED. Bytes=${audioBytesTotal}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const svcClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const tokenId = url.searchParams.get('token_id');
      if (!tokenId) return new Response('Missing token_id', { status: 400, headers: corsHeaders });

      const { data: tokenData, error } = await svcClient.from('tts_tokens').delete().eq('id', tokenId).select().single();
      if (error || !tokenData) return new Response('Invalid token', { status: 401, headers: corsHeaders });

      const { text, voiceName, stylePrompt } = tokenData.payload;
      console.log(`[Timer] GET_RECEIVED: Token=${tokenId}`);
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(createWavHeader(0));
            await streamGemini(text, voiceName, stylePrompt, controller);
            controller.close();
          } catch (err) {
            console.error('>>>> STREAM_ERROR:', err);
            controller.error(err);
          }
        }
      });
      return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'audio/wav', 'Cache-Control': 'no-cache' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
    const { data: { user }, error: authError } = await (createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)).auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

    const payload = await req.json();
    const { data: tokenRow, error: insertError } = await svcClient.from('tts_tokens').insert({ user_id: user.id, payload }).select('id').single();
    if (insertError) throw insertError;
    return new Response(JSON.stringify({ token_id: tokenRow.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('>>>> FATAL_ERROR:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
