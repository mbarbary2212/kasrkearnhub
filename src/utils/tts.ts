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
  audio.play().catch(() => {}); // unlock for autoplay policy
  audio.pause();
  return audio;
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
      const params = new URLSearchParams({
        text,
        token: accessToken,
      });

      if (provider === 'elevenlabs') {
        params.append('voiceId', voiceId);
        if (tone) params.append('tone', tone);
        params.append('speed', getToneVoiceSettings(tone).speed.toString());
      } else {
        params.append('voiceName', voiceId);
        if (stylePrompt) params.append('stylePrompt', stylePrompt);
      }

      const streamingUrl = `${SUPABASE_URL}/functions/v1/${functionName}?${params.toString()}`;
      console.log(`[TTS] Streaming from ${provider}, function: ${functionName}`);

      const audio = preUnlockedAudio || new Audio();
      audio.src = streamingUrl;
      currentAudio = audio;

      return new Promise<void>((resolve) => {
        const handlePlaying = () => {
          console.log('[TTS] Audio started playing (streaming)');
          onPlaybackStarted?.();
          audio.removeEventListener('playing', handlePlaying);
        };
        audio.addEventListener('playing', handlePlaying);

        audio.addEventListener('ended', () => {
          if (currentAudio === audio) currentAudio = null;
          resolve();
        });
        audio.addEventListener('error', (e) => {
          console.error('[TTS] Streaming audio error:', e);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        });
        audio.addEventListener('pause', () => {
          if (!audio.src || audio.src === '') resolve();
        });

        audio.play().catch((err) => {
          console.error('[TTS] Play failed:', err);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        });
      });
    } catch (err) {
      console.error(`[TTS] ${provider} streaming failed:`, err);
    }
  }

  // Browser fallback (also default for provider === 'browser')
  if ('speechSynthesis' in window) {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG';
      utterance.rate = 1.1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}
