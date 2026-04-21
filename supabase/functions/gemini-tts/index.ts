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
  if (!apiKey) {
      console.error('>>>> MISSING_API_KEY: Neither GOOGLE_API_KEY nor GEMINI_API_KEY found');
      throw new Error('Server configuration error: Missing API Key');
  }

  const modelId = 'gemini-3.1-flash-tts-preview';
  const voice = (voiceName === 'Aoide' || voiceName === 'Aoede') ? 'Aoide' : 'Kore';
  const prompt = stylePrompt ? `${stylePrompt}\n\n${inputText}` : inputText;

  console.log(`>>>> GOOGLE_STREAM_START: mode=${voice}, textLen=${inputText.length}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    }),
  });

  if (!response.ok) {
      const errorText = await response.text();
      console.error(`>>>> GOOGLE_HTTP_ERROR: ${response.status} - ${errorText}`);
      throw new Error(`Google API Stream Error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No body in Google response');

  const decoder = new TextDecoder();
  let buffer = "";
  let chunkCount = 0;
  let audioFound = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
        console.log(`>>>> GOOGLE_STREAM_DONE: totalChunks=${chunkCount}, audioFound=${audioFound}`);
        break;
    }

    const text = decoder.decode(value, { stream: true });
    buffer += text;
    
    // Process each character to find balanced JSON objects in the stream
    // Google's stream is weird, sometimes it's [, {...}, {...}, ] 
    // We try to find objects between { and }
    let lastIndex = 0;
    while (true) {
        const start = buffer.indexOf('{', lastIndex);
        if (start === -1) break;
        
        let depth = 0;
        let end = -1;
        for (let i = start; i < buffer.length; i++) {
            if (buffer[i] === '{') depth++;
            else if (buffer[i] === '}') {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }

        if (end === -1) break; // Incomplete object

        const objStr = buffer.substring(start, end + 1);
        try {
            const json = JSON.parse(objStr);
            chunkCount++;
            
            const base64Audio = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                audioFound = true;
                const raw = atob(base64Audio);
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                controller.enqueue(bytes);
                if (chunkCount % 50 === 0) console.log(`>>>> AUDIO_CHUNK: count=${chunkCount}, bytes=${bytes.length}`);
            } else {
                // Log non-audio chunks for debugging (safety flags etc)
                if (json?.promptFeedback || json?.candidates?.[0]?.finishReason) {
                    console.log(`>>>> NON_AUDIO_CHUNK: ${JSON.stringify(json).substring(0, 500)}`);
                }
            }
        } catch (e) {
            console.error(`>>>> JSON_PARSE_ERROR in chunk: ${e.message}`);
        }
        
        lastIndex = end + 1;
    }
    buffer = buffer.substring(lastIndex);
  }
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

      console.log(`>>>> RETRIEVAL_START: ${tokenId}`);

      let tokenData = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data, error } = await svcClient
          .from('tts_tokens')
          .delete()
          .eq('id', tokenId)
          .select()
          .single();

        if (!error && data) {
          tokenData = data;
          break;
        }

        lastError = error;
        if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!tokenData) {
          console.error(`>>>> FATAL_RETRIEVAL_FAILURE: ${lastError?.message || 'Row not found'}`);
          return new Response(`Invalid token`, { status: 401, headers: corsHeaders });
      }

      const { text, voiceName, stylePrompt } = tokenData.payload;
      console.log(`>>>> TOKEN_VALIDATED: Starting Gemini stream for "${text.substring(0, 50)}..."`);
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(createWavHeader(0));
            await streamGemini(text, voiceName, stylePrompt, controller);
            console.log('>>>> STREAM_COMPLETE_SUCCESSFULLY');
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
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff'
        } 
      });
    }

    // POST Handshake
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });

    const { data: { user }, error: authError } = await (createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)).auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Invalid auth', { status: 401 });

    const payload = await req.json();
    console.log(`>>>> HANDSHAKE: user=${user.id}`);

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
