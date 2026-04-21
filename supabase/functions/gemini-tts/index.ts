import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function createWavHeader(dataSize = 0): Uint8Array {
  const numChannels = 1;
  const sampleRate = 24000; // Updated to 24kHz
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, dataSize > 0 ? 36 + dataSize : 0x7FFFFFFF, true); 
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
  view.setUint32(40, dataSize > 0 ? dataSize : 0x7FFFFFFF, true); 

  return new Uint8Array(buffer);
}

async function streamGemini(
  inputText: string, 
  voiceName: string, 
  stylePrompt: string | undefined, 
  controller: ReadableStreamDefaultController
) {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
  const modelId = 'gemini-3.1-flash-tts-preview';
  const voice = (voiceName === 'Aoide' || voiceName === 'Aoede') ? 'Aoide' : 'Kore';
  const prompt = stylePrompt ? `${stylePrompt}\n\n${inputText}` : inputText;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
      }
    }),
  });

  if (!response.ok) throw new Error(`Google API Stream Error: ${response.status} - ${await response.text()}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body in Google response');

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
        const cleaned = line.trim().replace(/^,/, '').replace(/^\[/, '').replace(/\]$/, '');
        if (!cleaned) continue;

        try {
            const json = JSON.parse(cleaned);
            const base64Audio = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const raw = atob(base64Audio);
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                controller.enqueue(bytes);
            }
        } catch (e) {
            // Keep in buffer for next cycle
            buffer = line + buffer;
            break;
        }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // LOGGING: Verify keys are present (masked)
  console.log(`>>>> INIT: URL=${supabaseUrl.substring(0, 20)}... | KEY=${serviceRoleKey ? 'PRESENT' : 'MISSING'}`);

  const svcClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const tokenId = url.searchParams.get('token_id');
      console.log(`>>>> GET_REQUEST: tokenId=${tokenId}`);

      if (!tokenId) return new Response('Missing token_id', { status: 400, headers: corsHeaders });

      // Fetch and delete token in one go
      const { data: tokenData, error: tokenError } = await svcClient
        .from('tts_tokens')
        .delete()
        .eq('id', tokenId)
        .select()
        .single();

      if (tokenError) {
          console.error(`>>>> DB_ERROR: ${tokenError.message} (Code: ${tokenError.code})`);
          return new Response(`Token verification failed: ${tokenError.message}`, { 
              status: 401, 
              headers: { ...corsHeaders, 'X-Error-Code': tokenError.code } 
          });
      }

      if (!tokenData) {
          console.error('>>>> TOKEN_NOT_FOUND: Token might be expired or already used.');
          return new Response('Token not found or expired', { status: 401, headers: corsHeaders });
      }

      console.log(`>>>> TOKEN_VERIFIED: Starting stream for user ${tokenData.user_id}`);

      const { text, voiceName, stylePrompt } = tokenData.payload;
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('>>>> STREAM_START: Sending WAV header');
            controller.enqueue(createWavHeader(0));
            console.log('>>>> STREAMING: Calling Gemini');
            await streamGemini(text, voiceName, stylePrompt, controller);
            console.log('>>>> STREAM_DONE');
            controller.close();
          } catch (err) {
            console.error('>>>> STREAM_ERROR:', err);
            controller.error(err);
          }
        }
      });

      return new Response(stream, { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache'
        } 
      });
    }

    // POST Handshake
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });

    const { data: { user }, error: authError } = await (createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)).auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

    const payload = await req.json();
    console.log(`>>>> HANDSHAKE: Creating token for user ${user.id}`);

    const { data: tokenRow, error: insertError } = await svcClient
      .from('tts_tokens')
      .insert({ user_id: user.id, payload })
      .select('id')
      .single();

    if (insertError) {
        console.error(`>>>> INSERT_ERROR: ${insertError.message}`);
        throw insertError;
    }

    console.log(`>>>> HANDSHAKE_SUCCESS: token_id=${tokenRow.id}`);
    return new Response(JSON.stringify({ token_id: tokenRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('>>>> FATAL_ERROR:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
