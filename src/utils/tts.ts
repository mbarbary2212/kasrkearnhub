import { supabase } from '@/integrations/supabase/client';

export interface ElevenLabsVoice {
  id: string;
  name: string;
  label: string;
}

export const ELEVENLABS_VOICES: Record<'male' | 'female', ElevenLabsVoice[]> = {
  male: [
    { id: 'DWMVT5WflKt0P8OPpIrY', name: 'Hanafi',    label: 'Best overall' },
    { id: '68MRVrnQAt8vLbu0FCzw', name: 'Deep',       label: 'Deep & authoritative' },
    { id: 'VqHyN6PYNu3uNKGdbxKs', name: 'Slow',       label: 'Calm & measured' },
    { id: 'IES4nrmZdUBHByLBde0P', name: 'Energetic',  label: 'Lively & expressive' },
    { id: 'wxweiHvoC2r2jFM7mS8b', name: 'Dramatic',   label: 'Dramatic & emotive' },
    { id: 'Jez3JdhBInQTvlAvDOWR', name: 'Calm',       label: 'Soft & reassuring' },
    { id: 'LXrTqFIgiubkrMkwvOUr', name: 'Masry',      label: 'Authentic Egyptian' },
  ],
  female: [
    { id: 'RCubfxZlU5rlyEKAEsSN', name: 'Fatma',      label: 'Patient — warm' },
    { id: 'V3pvijO4r7rCO7TB2tE8', name: 'Laila',      label: 'Mother — assertive' },
    { id: 'L10lEremDiJfPicq5CPh', name: 'Yasmin',     label: 'Expressive' },
  ],
};

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseUrl';

/** Module-level reference to the currently playing audio (ElevenLabs or Gemini) */
let currentAudio: HTMLAudioElement | null = null;

/** Global registry for active SpeechRecognition so stopAllTTS() can kill the mic */
let activeSpeechRecognition: any = null;
const cleanupCallbacks: Set<() => void> = new Set();

export function registerSpeechRecognition(recognition: any) {
  activeSpeechRecognition = recognition;
}

/** Register a callback that stopAllTTS() will invoke. Returns an unregister function. */
export function registerCleanupCallback(cb: () => void): () => void {
  cleanupCallbacks.add(cb);
  return () => { cleanupCallbacks.delete(cb); };
}

/** Register an externally-created Audio element so stopAllTTS() can manage it */
export function registerCurrentAudio(audio: HTMLAudioElement) {
  // Stop any previous audio first
  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
  }
  currentAudio = audio;
}

/** Stop all TTS playback, active SpeechRecognition, and registered cleanup callbacks */
export function stopAllTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();

  // Kill any active SpeechRecognition (mic)
  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch {}
    activeSpeechRecognition = null;
  }

  // Run registered cleanup callbacks (e.g. scribe disconnect)
  cleanupCallbacks.forEach(cb => { try { cb(); } catch {} });
  cleanupCallbacks.clear();
}

/**
 * Speak Arabic text using either browser TTS or ElevenLabs streaming.
 * The returned Promise resolves when playback **ends** (not when it starts).
 * Falls back to browser TTS on any ElevenLabs error.
 */
export type PatientTone = 'calm' | 'worried' | 'anxious' | 'angry' | 'impolite' | 'in_pain' | 'cooperative';

/** Map patient tone to ElevenLabs voice_settings */
function getToneVoiceSettings(tone?: PatientTone) {
  switch (tone) {
    case 'worried':
      return { stability: 0.35, similarity_boost: 0.7, style: 0.4, speed: 1.05 };
    case 'anxious':
      return { stability: 0.25, similarity_boost: 0.65, style: 0.5, speed: 1.15 };
    case 'angry':
      return { stability: 0.3, similarity_boost: 0.8, style: 0.7, speed: 1.1 };
    case 'impolite':
      return { stability: 0.35, similarity_boost: 0.8, style: 0.6, speed: 1.05 };
    case 'in_pain':
      return { stability: 0.2, similarity_boost: 0.7, style: 0.6, speed: 0.9 };
    case 'cooperative':
      return { stability: 0.6, similarity_boost: 0.75, style: 0.3, speed: 1.0 };
    case 'calm':
    default:
      return { stability: 0.55, similarity_boost: 0.75, style: 0.2, speed: 1.1 };
  }
}

/** Create and unlock an Audio element (call synchronously in a user gesture) */
export function createUnlockedAudio(): HTMLAudioElement {
  const audio = new Audio();
  // Unlock the element for the browser's autoplay policy.
  //
  // This used to be `audio.play().catch(() => {}); audio.pause();` — pausing a
  // play() that was never awaited. That is the textbook way to produce
  // "AbortError: The play() request was interrupted by a call to pause()", and
  // because the same element is handed straight into the next utterance as
  // preUnlockedAudio, the pending rejection surfaced on the NEXT reply instead.
  // Await the play, then pause.
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.then(() => audio.pause()).catch(() => {});
  } else {
    audio.pause();
  }
  return audio;
}

/**
 * True when an audio failure means "we interrupted this on purpose" rather than
 * "text-to-speech is broken" — the student navigated away, asked the next
 * question, or a new utterance replaced this one. Never an error worth
 * retrying, charging for, or reporting.
 */
function isBenignAudioAbort(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  const message = (err as { message?: string } | null)?.message ?? '';
  return name === 'AbortError' || /interrupted by a call to pause|interrupted by a new load request/i.test(message);
}

/** True when a play() rejection is a genuine audio-playback abort
 *  (pause/replace/teardown before playback began). Checks err.name ===
 *  'AbortError' and optionally DOMException code 20 (ABORT_ERR). Does NOT
 *  match arbitrary "aborted"-shaped messages from other sources.
 *  Kept exported because HistoryTakingSection.tsx uses it in its outer
 *  chat-error handler to tell a cancelled AI reply from a real failure. */
export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string } | null)?.name;
  const code = (err as { code?: number } | null)?.code;
  return name === 'AbortError' || code === 20;
}

export async function speakArabic(
  text: string,
  provider: 'browser' | 'elevenlabs' | 'gemini',
  voiceId?: string,
  tone?: PatientTone,
  preUnlockedAudio?: HTMLAudioElement,
  stylePrompt?: string,
  onPlaybackStarted?: () => void
): Promise<void> {
  // Stop previous audio without destroying the pre-unlocked element
  if (currentAudio && currentAudio !== preUnlockedAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
  } else if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = null;
  window.speechSynthesis?.cancel();

  if ((provider === 'elevenlabs' || provider === 'gemini') && voiceId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No session token — user not logged in');

      const functionName = provider === 'elevenlabs' ? 'elevenlabs-tts' : 'gemini-tts';

      // PHASE 1: Handshake (POST to get token)
      console.log(`[TTS] Handshake with ${provider}...`);
      const handshakeBody = provider === 'elevenlabs'
        ? { text, voiceId, tone, speed: getToneVoiceSettings(tone).speed }
        : { text, voiceName: voiceId, stylePrompt };

      const handshakeRes = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(handshakeBody),
      });

      if (!handshakeRes.ok) {
        const errText = await handshakeRes.text();
        console.error(`[TTS] Handshake failed (${handshakeRes.status}):`, errText);
        throw new Error(`Handshake failed: ${errText || handshakeRes.status}`);
      }
      const { token_id } = await handshakeRes.json();

      // PHASE 2: Streaming (GET with token_id)
      const streamingUrl = `${SUPABASE_URL}/functions/v1/${functionName}?token_id=${token_id}`;
      console.log(`[TTS] Handshake success. Streaming from token: ${token_id}`);

      const audio = preUnlockedAudio || new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = streamingUrl;
      currentAudio = audio;

      // NOTE: `return await`, not `return`. Returning the promise directly from
      // inside a try block does NOT route its rejection through the catch below
      // — so every streaming failure escaped this function untouched and the
      // "STABLE FALLBACK" further down never ran. Awaiting makes it reachable.
      return await new Promise<void>((resolve, reject) => {
        let ttfbCaptured = false;
        const handlePlaying = () => {
          if (!ttfbCaptured) {
            console.log('[TTS] Audio started playing (streaming)');
            onPlaybackStarted?.();
            ttfbCaptured = true;
          }
        };
        audio.addEventListener('playing', handlePlaying);

        audio.addEventListener('ended', () => {
          console.log('[TTS] Audio ended (streaming)');
          if (currentAudio === audio) currentAudio = null;
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error('[TTS] Streaming audio error event:', audio.error);
          if (currentAudio === audio) currentAudio = null;
          reject(new Error(`Streaming failed: ${audio.error?.message || 'Unknown error'}`));
        });

        audio.addEventListener('pause', () => {
          if (!audio.src || audio.src === '') resolve();
        });

        audio.play().catch((err) => {
          if (currentAudio === audio) currentAudio = null;
          if (isBenignAudioAbort(err)) {
            // Playback was deliberately interrupted. Resolve quietly: retrying
            // would fire a second paid TTS request for speech nobody is
            // waiting to hear.
            console.log('[TTS] Playback interrupted (expected):', (err as Error)?.name);
            resolve();
            return;
          }
          console.error('[TTS] Play promise rejected:', err);
          reject(err);
        });
      });
    } catch (err) {
      console.warn(`[TTS] ${provider} handshake/streaming failed, falling back to blob method:`, err);

      // STABLE FALLBACK: Use the original POST + blob method (10s delay but guaranteed sound)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const functionName = provider === 'elevenlabs' ? 'elevenlabs-tts' : 'gemini-tts';

        const body = provider === 'elevenlabs'
          ? { text, voiceId, tone, speed: getToneVoiceSettings(tone).speed, legacy: true }
          : { text, voiceName: voiceId, stylePrompt, legacy: true };

        console.log(`[TTS] ${provider} fallback: Fetching full blob...`);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[TTS] Fallback failed (${res.status}):`, errText);
            throw new Error(`Fallback failed: ${errText || res.status}`);
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const audio = preUnlockedAudio || new Audio();
        audio.src = blobUrl;
        currentAudio = audio;

        onPlaybackStarted?.(); // Mark started for telemetry

        return new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(blobUrl);
            if (currentAudio === audio) currentAudio = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            if (currentAudio === audio) currentAudio = null;
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      } catch (fallbackErr) {
        console.error('[TTS] Fallback also failed:', fallbackErr);
      }
    }
  }

  // Final fallback (browser native - mostly for dev, no patient tone/voice support)
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 0.9;
    utterance.onstart = () => onPlaybackStarted?.();
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
