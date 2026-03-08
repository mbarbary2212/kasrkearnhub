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

/**
 * Speak Arabic text using either browser TTS or ElevenLabs streaming.
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
      return { stability: 0.55, similarity_boost: 0.75, style: 0.2, speed: 1.0 };
  }
}

export async function speakArabic(
  text: string,
  provider: 'browser' | 'elevenlabs',
  voiceId?: string,
  tone?: PatientTone
): Promise<void> {
  // Cancel any ongoing browser speech
  window.speechSynthesis?.cancel();

  if (provider === 'elevenlabs' && voiceId) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status}`);

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      await audio.play();
      return;
    } catch (err) {
      console.error('ElevenLabs TTS failed, falling back to browser:', err);
      // Fall through to browser TTS
    }
  }

  // Browser fallback (also default for provider === 'browser')
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }
}
