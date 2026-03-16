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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Module-level reference to the currently playing ElevenLabs audio */
let currentAudio: HTMLAudioElement | null = null;

/** Stop all TTS playback immediately (ElevenLabs + browser) */
export function stopAllTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
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
  provider: 'browser' | 'elevenlabs',
  voiceId?: string,
  tone?: PatientTone,
  preUnlockedAudio?: HTMLAudioElement
): Promise<void> {
  // Stop any ongoing playback
  stopAllTTS();

  if (provider === 'elevenlabs' && voiceId) {
    try {
      // Get the user's session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No session token — user not logged in');

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ text, voiceId, tone, speed: getToneVoiceSettings(tone).speed }),
        }
      );

      if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status}`);

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = preUnlockedAudio || new Audio();
      audio.src = audioUrl;
      currentAudio = audio;

      // Return a Promise that resolves when playback finishes
      return new Promise<void>((resolve) => {
        audio.addEventListener('ended', () => {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
        audio.addEventListener('error', () => {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve(); // resolve gracefully — don't block callers
        });
        // If externally stopped via stopAllTTS(), the pause event fires
        audio.addEventListener('pause', () => {
          // Only resolve if this audio was cleared (stopAllTTS sets src='')
          if (!audio.src || audio.src === '') {
            URL.revokeObjectURL(audioUrl);
            resolve();
          }
        });
        audio.play().catch(() => {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
      });
    } catch (err) {
      console.error('ElevenLabs TTS failed, falling back to browser:', err);
      // Fall through to browser TTS
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
