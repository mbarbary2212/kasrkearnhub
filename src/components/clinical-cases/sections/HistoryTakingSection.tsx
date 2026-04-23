import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, MessageCircle, Mic, MicOff, Send, CheckCircle2, Globe, Clock, AlertTriangle, VolumeX, Volume2 } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { cn } from '@/lib/utils';
import { HistorySectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { captureWithContext, addAppBreadcrumb } from '@/lib/sentry';
import { SUPABASE_URL as SUPABASE_URL_FALLBACK } from '@/lib/supabaseUrl';
import { toast } from 'sonner';
import { speakArabic, createUnlockedAudio, PatientTone, stopAllTTS, registerCurrentAudio, registerSpeechRecognition, registerCleanupCallback } from '@/utils/tts';
import { useAISettings, getSettingValue } from '@/hooks/useAISettings';
import { useAuth } from '@/hooks/useAuth';
import { PerformanceMetrics, INITIAL_METRICS } from '@/utils/performanceTelemetry';
import { PerformanceDebugConsole } from '../PerformanceDebugConsole';

interface HistoryTakingProps extends SectionComponentProps<HistorySectionData> {
  avatarUrl?: string;
  avatarName?: string;
  historyInteractionMode?: string;
  caseId?: string;
  studentName?: string;
  studentAvatarUrl?: string;
  patientTone?: PatientTone;
  estimatedMinutes?: number;
  voiceIdOverride?: string;
  historyTimeLimitMinutes?: number;
  patientGender?: string;
  patientAge?: number | string;
  chiefComplaint?: string;
}

const MAX_STUDENT_MESSAGES = 15;

type Phase = 'interact' | 'questions';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function HistoryTakingSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
  avatarUrl,
  avatarName,
  historyInteractionMode,
  caseId,
  studentName,
  studentAvatarUrl,
  patientTone,
  estimatedMinutes,
  voiceIdOverride,
  historyTimeLimitMinutes,
  patientGender,
  patientAge,
  chiefComplaint,
}: HistoryTakingProps) {
  const isTextMode = historyInteractionMode === 'text' || !historyInteractionMode;
  const canChat = historyInteractionMode === 'voice' || historyInteractionMode === 'chat';

  const { isSuperAdmin, isPlatformAdmin, role } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL_METRICS);
  const lastPartialTimeRef = useRef<number>(0);
  const sttLatencyRef = useRef<number>(0);

  // Debug role access
  useEffect(() => {
    if (isPlatformAdmin) {
      console.log('[Telemetry] Admin access confirmed, role:', role);
    }
  }, [isPlatformAdmin, role]);

  // TTS settings
  const { data: ttsSettings, isLoading: ttsSettingsLoading } = useAISettings();
  const ttsProvider = (getSettingValue(ttsSettings, 'tts_provider', 'browser') as 'browser' | 'elevenlabs' | 'gemini');
  const ttsGeminiVoice = patientGender === 'female'
    ? getSettingValue(ttsSettings, 'tts_gemini_female_voice', 'Aoide') as string
    : getSettingValue(ttsSettings, 'tts_gemini_male_voice', 'Kore') as string;
  const toneStyleMap: Record<string, string> = {
    worried:   '[تحدث بالعامية المصرية. نبرتك قلقة وخايف من الموضوع]',
    in_pain:   '[تحدث بالعامية المصرية. نبرتك تعبانة وحاسس بألم شديد]',
    anxious:   '[تحدث بالعامية المصرية. نبرتك متوترة ومش قادر تتمالك نفسك]',
    calm:      '[تحدث بالعامية المصرية. نبرتك هادية ومتعاون مع الدكتور]',
    exhausted: '[تحدث بالعامية المصرية. نبرتك تعبانة جداً ومش قادر تتكلم بسهولة]',
  };
  const geminiStylePrompt = toneStyleMap[patientTone || 'calm'] ?? toneStyleMap['calm'];

  const [phase, setPhase] = useState<Phase>(previousAnswer ? 'questions' : 'interact');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'chat' | 'voice' | null>(
    isTextMode ? null : null
  );

  const availableLanguages = data.available_languages?.length ? data.available_languages : ['en', 'ar'];

  const LANGUAGE_LABELS: Record<string, { label: string; native: string; greeting: string; speechLocale: string }> = {
    en: { label: 'English', native: 'English', greeting: 'Hello', speechLocale: 'en-US' },
    ar: { label: 'Arabic', native: 'عربي', greeting: 'السلام عليكم', speechLocale: 'ar-EG' },
    fr: { label: 'French', native: 'Français', greeting: 'Bonjour', speechLocale: 'fr-FR' },
    de: { label: 'German', native: 'Deutsch', greeting: 'Hallo', speechLocale: 'de-DE' },
    es: { label: 'Spanish', native: 'Español', greeting: 'Hola', speechLocale: 'es-ES' },
  };
  const [showHandover, setShowHandover] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForAi, setIsWaitingForAi] = useState(false);
  const [ttsFirstByte, setTtsFirstByte] = useState(false);
  const [lastSpoken, setLastSpoken] = useState('');
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceErrorCount, setVoiceErrorCount] = useState(0);
  const [showVoiceFallbackInput, setShowVoiceFallbackInput] = useState(false);
  const [voiceFallbackInput, setVoiceFallbackInput] = useState('');
  const [scribeConnecting, setScribeConnecting] = useState(false);
  
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('mute_ai_voice') === 'true'; } catch { return false; }
  });

  // Ref to hold latest sendChatMessage for scribe callbacks
  const sendChatMessageRef = useRef<(text: string) => void>(() => {});
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceBubbleRef = useRef<HTMLDivElement>(null);

  // ElevenLabs Scribe hook (always called — hooks can't be conditional)
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.5, // 1.5s silence before committing — prevents cut-off during natural Arabic pauses
    onCommittedTranscript: (data) => {
      console.log('[Scribe] Committed transcript:', data.text);
      if (data.text?.trim()) {
        // Measure STT latency: from last partial to commitment
        sttLatencyRef.current = lastPartialTimeRef.current ? Date.now() - lastPartialTimeRef.current : 0;
        
        setLastSpoken(data.text);
        setVoiceErrorCount(0);
        sendChatMessageRef.current(data.text);
        // Immediately disconnect to prevent echo/phantom responses during TTS
        // Auto-reconnect happens in sendChatMessage after TTS finishes
        safeDisconnect();
      }
    },
    onPartialTranscript: (data) => {
      lastPartialTimeRef.current = Date.now();
      setInterimTranscript(data.text || '');
    },
  });

  // Sync scribe.isConnected → isListening
  useEffect(() => {
    setIsListening(scribe.isConnected);
    if (!scribe.isConnected) {
      setInterimTranscript('');
    }
  }, [scribe.isConnected]);

  // Cleanup: disconnect scribe on unmount to prevent WS race condition
  const scribeRef = useRef(scribe);
  scribeRef.current = scribe;
  const disconnectingRef = useRef(false);
  const wsFailCountRef = useRef(0);
  const scribeDisabledRef = useRef(false);

  const safeDisconnect = useCallback(async () => {
    if (disconnectingRef.current) return;
    disconnectingRef.current = true;
    try {
      if (scribeRef.current.isConnected) {
        await scribeRef.current.disconnect();
      }
    } catch {
      wsFailCountRef.current++;
      if (wsFailCountRef.current >= 3) {
        scribeDisabledRef.current = true;
        toast.error('Voice connection lost. Please refresh.');
      }
    } finally {
      disconnectingRef.current = false;
    }
  }, []);

  // Register scribe disconnect with global cleanup so stopAllTTS() kills the mic
  useEffect(() => {
    const unregister = registerCleanupCallback(() => {
      safeDisconnect();
    });
    return () => {
      unregister();
      wsFailCountRef.current = 0;
      scribeDisabledRef.current = false;
      safeDisconnect();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        registerSpeechRecognition(null);
      }
      setIsListening(false);
      stopAllTTS();
    };
  }, [safeDisconnect]);


  // Comprehension answers
  const [answers, setAnswers] = useState<Record<string, string>>(
    (previousAnswer?.comprehension_answers as Record<string, string>) || {}
  );

  // ── Time & message limits ─────────────────────────────
  const timeLimitMs = useMemo(
    () => (historyTimeLimitMinutes
      ? historyTimeLimitMinutes
      : estimatedMinutes ? Math.ceil(estimatedMinutes * 0.4) : 5) * 60 * 1000,
    [historyTimeLimitMinutes, estimatedMinutes]
  );
  const [interactionStart] = useState(Date.now());
  const [timeRemaining, setTimeRemaining] = useState(timeLimitMs);

  const studentMessageCount = chatMessages.filter(m => m.role === 'user').length;
  const isOverTime = timeRemaining <= 0;
  const isNearLimit = timeRemaining > 0 && timeRemaining < timeLimitMs * 0.25;
  const isAtMessageCap = studentMessageCount >= MAX_STUDENT_MESSAGES;
  const shouldDisableInput = isAtMessageCap;

  // Countdown timer (only during Phase 1 interactive modes)
  useEffect(() => {
    if (phase !== 'interact' || isTextMode || !selectedMode) return;
    const interval = setInterval(() => {
      setTimeRemaining(Math.max(0, timeLimitMs - (Date.now() - interactionStart)));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isTextMode, selectedMode, timeLimitMs, interactionStart]);

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handover = data.atmist_handover;
  const questions = data.comprehension_questions || [];
  const allAnswered = questions.every(q => answers[q.id]?.trim());

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Last AI message for voice bubble
  const lastAiMessage = chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant'
    ? chatMessages[chatMessages.length - 1].content
    : '';

  // Typewriter animation state — synced to TTS duration
  const [displayedText, setDisplayedText] = useState('');
  const ttsDurationRef = useRef<number>(0);
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If we're waiting for AI or TTS hasn't started playing yet, show text in dimmed state
    if (isWaitingForAi || (isSpeaking && !ttsFirstByte)) {
      setDisplayedText(lastAiMessage); // Show it, but we'll style it to be dimmed
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
      return;
    }

    // Hard sync: when TTS stops, show full text immediately
    if (!isSpeaking) {
      setDisplayedText(lastAiMessage);
      setTtsFirstByte(false);
      return;
    }

    // Start typewriter when actual playback (first byte) begins
    if (isSpeaking && ttsFirstByte && lastAiMessage && !typewriterTimerRef.current) {
      const text = lastAiMessage;
      const charDelay = 35; // Standard Arabic reading speed
      let idx = 0;
      setDisplayedText('');

      typewriterTimerRef.current = setInterval(() => {
        idx++;
        if (idx >= text.length) {
          setDisplayedText(text);
          if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        } else {
          setDisplayedText(text.slice(0, idx));
        }
      }, charDelay);
    }

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
    };
  }, [lastAiMessage, isSpeaking, ttsFirstByte, isWaitingForAi]);

  // Auto-scroll voice bubble to bottom as typewriter reveals text
  useEffect(() => {
    if (voiceBubbleRef.current) {
      voiceBubbleRef.current.scrollTo({ top: voiceBubbleRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [displayedText]);

  // ── Chat send ──────────────────────────────────────────
  const sendChatMessage = useCallback(async (text: string) => {
    console.log('[sendChatMessage] called with:', text);
    if (!text.trim() || !caseId) return;

    // Pre-unlock audio element while still in user gesture context
    const preUnlockedAudio = selectedMode === 'voice' && !isMuted
      ? (unlockedAudioRef.current ?? createUnlockedAudio())
      : undefined;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsSending(true);
    setIsWaitingForAi(true);

    const llmStart = Date.now();
    let llmEnd = 0;
    let ttsEnd = 0;

    try {
      addAppBreadcrumb('ai_call', 'patient-history-chat starting', {
        case_id: caseId,
        mode: selectedMode || 'chat',
        language: selectedLanguage || 'en',
        message_count: updatedMessages.length,
      });
      const { data: fnData, error } = await supabase.functions.invoke('patient-history-chat', {
        body: {
          case_id: caseId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          mode: selectedMode || 'chat',
          language: selectedLanguage || 'en',
        },
      });

      if (error) throw error;

      llmEnd = Date.now();
      const reply = fnData?.reply || 'Sorry, I could not respond.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Voice mode: speak the response (unless muted), then auto-reconnect mic
      if (selectedMode === 'voice') {
        // Ensure scribe is disconnected during TTS to prevent echo
        await safeDisconnect();

        if (!isMuted) {
          const gender = getSettingValue(ttsSettings, 'tts_voice_gender', 'male') as string;
          const voiceId = voiceIdOverride || (
            ttsProvider === 'gemini'
              ? (gender === 'female' ? getSettingValue(ttsSettings, 'tts_gemini_female_voice', 'Aoide') : getSettingValue(ttsSettings, 'tts_gemini_male_voice', 'Kore'))
              : (gender === 'female' ? getSettingValue(ttsSettings, 'tts_elevenlabs_female_voice', 'RCubfxZlU5rlyEKAEsSN') : getSettingValue(ttsSettings, 'tts_elevenlabs_male_voice', 'DWMVT5WflKt0P8OPpIrY'))
          ) as string;
          
          setIsSpeaking(true);
          setTtsFirstByte(false);
          try {
            await speakArabic(
              reply,
              ttsProvider,
              voiceId,
              patientTone,
              preUnlockedAudio,
              ttsProvider === 'gemini' ? geminiStylePrompt : undefined,
              () => { 
                ttsEnd = Date.now(); 
                setTtsFirstByte(true);
              }
            );
            
            // Fallback if onPlaybackStarted didn't fire for some reason
            if (!ttsEnd) ttsEnd = Date.now();
          } finally {
            setIsSpeaking(false);
            unlockedAudioRef.current = createUnlockedAudio();
          }
          // 800ms conversational pause before re-opening mic
          await new Promise(r => setTimeout(r, 800));
        } else {
          // Muted: short pause then reconnect
          await new Promise(r => setTimeout(r, 200));
        }

        // Auto-reconnect scribe for the next question (if not at limits)
        if (!shouldDisableInput && !isOverTime && phase === 'interact') {
          connectScribe();
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      captureWithContext(err, {
        tags: {
          feature: 'ai_call',
          ai_task: 'clinical_case_reply',
          provider: 'edge_function',
          subfeature: 'patient_history_chat',
        },
        extra: {
          case_id: caseId,
          mode: selectedMode,
          language: selectedLanguage,
          message_count: updatedMessages.length,
          error_message: (err as Error)?.message,
        },
      });
      const msg = (err as Error).message || 'An unexpected error occurred';
      toast.error(msg);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة أخرى.' },
      ]);
    } finally {
      setIsSending(false);
      
      // Update performance metrics for super_admins
      if (isSuperAdmin) {
        const llmLatency = llmEnd ? llmEnd - llmStart : 0;
        const ttAudioEnd = Date.now();
        const fullTtsDuration = ttsEnd ? ttAudioEnd - llmEnd : 0;
        const ttfbLatency = ttsEnd && llmEnd ? ttsEnd - llmEnd : 0;

        setMetrics({
          stt: sttLatencyRef.current,
          llm: llmLatency,
          tts: fullTtsDuration,
          ttfb: ttfbLatency,
          total: sttLatencyRef.current + llmLatency + fullTtsDuration,
          timestamp: Date.now()
        });
        
        // Reset STT for next turn
        sttLatencyRef.current = 0;
        lastPartialTimeRef.current = 0;
      }
    }
  }, [chatMessages, caseId, selectedMode, isMuted, selectedLanguage, ttsProvider, ttsSettings, voiceIdOverride, patientTone, shouldDisableInput, isOverTime, phase, isSuperAdmin]);

  // Keep ref in sync with latest sendChatMessage
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  }, [sendChatMessage]);

  // ── Browser STT fallback ───────────────────────────────
  const startBrowserSTT = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = LANGUAGE_LABELS[selectedLanguage || 'ar']?.speechLocale || 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setLastSpoken(final);
        setVoiceErrorCount(0);
        sendChatMessage(final);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Skip user-cancelled and "no speech" — those are expected.
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        captureWithContext(new Error(`Browser STT error: ${event.error}`), {
          tags: {
            feature: 'interactive_case',
            subfeature: 'stt',
            provider: 'browser',
            stt_error_code: event.error,
          },
          extra: {
            case_id: caseId,
            language: selectedLanguage,
            mode: selectedMode,
          },
        });
      }
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
        'no-speech': 'No speech detected. Please try again.',
        'language-not-supported': 'Arabic speech recognition is not supported on this device.',
        'network': 'Network error. Please check your connection.',
        'aborted': 'Speech recognition was aborted.',
      };
      toast.error(errorMessages[event.error] || `Speech error: ${event.error}`);
      setIsListening(false);
      setInterimTranscript('');
      setVoiceErrorCount(prev => prev + 1);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    registerSpeechRecognition(recognition);
    recognition.start();
    setIsListening(true);
  }, [sendChatMessage, selectedLanguage, selectedMode]);

  // ── Reusable scribe connect helper ──────────────────────
  const connectScribe = useCallback(async () => {
    if (scribeDisabledRef.current) {
      console.warn('[Scribe] Disabled after repeated failures, falling back to browser STT');
      startBrowserSTT();
      return;
    }
    setScribeConnecting(true);
    try {
      console.log('[Scribe] Requesting token from elevenlabs-scribe-token...');
      addAppBreadcrumb('ai_call', 'elevenlabs-scribe-token starting', {
        case_id: caseId,
      });
      const { data: tokenData, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      console.log('[Scribe] Token response:', { tokenData, error });
      if (error || !tokenData?.token) {
        throw new Error(error?.message || 'No token received');
      }
      disconnectingRef.current = false;
      await scribe.connect({
        token: tokenData.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      wsFailCountRef.current = 0;
      console.log('[Scribe] Connected successfully');
      toast.success('Scribe connected to ElevenLabs');
    } catch (err) {
      wsFailCountRef.current++;
      console.warn(`ElevenLabs Scribe failed (${wsFailCountRef.current}/3), falling back to browser STT:`, err);
      captureWithContext(err, {
        tags: {
          feature: 'interactive_case',
          subfeature: 'stt',
          provider: 'elevenlabs',
        },
        extra: {
          case_id: caseId,
          fail_count: wsFailCountRef.current,
          will_fallback_to_browser_stt: wsFailCountRef.current < 3,
          error_message: (err as Error)?.message,
        },
      });
      if (wsFailCountRef.current >= 3) {
        scribeDisabledRef.current = true;
        toast.error('Voice connection lost. Please refresh.');
      } else {
        startBrowserSTT();
      }
    } finally {
      setScribeConnecting(false);
    }
  }, [scribe, startBrowserSTT]);

  // ── Voice toggle (ElevenLabs Scribe with browser STT fallback) ──
  const toggleVoice = useCallback(async () => {
    // If currently listening, stop
    if (isListening || scribe.isConnected) {
      await safeDisconnect();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    // Pre-unlock audio element within user tap gesture context
    unlockedAudioRef.current = createUnlockedAudio();
    unlockedAudioRef.current.play().catch(() => {});

    // Connect scribe (or fallback)
    await connectScribe();
  }, [isListening, scribe, connectScribe]);

  // ── Phase transition ───────────────────────────────────
  const handleFinishInteraction = () => {
    // Disconnect scribe if active
    safeDisconnect();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setPhase('questions');
  };

  // ── Submit (Phase 2) ───────────────────────────────────
  const handleSubmit = () => {
    onSubmit({
      comprehension_answers: answers,
      questions_answered: Object.keys(answers).filter(k => answers[k]?.trim()).length,
      total_questions: questions.length,
      conversation_transcript: chatMessages.length > 0 ? chatMessages : undefined,
      interaction_mode: isTextMode ? 'text' : selectedMode,
    });
  };

  // ── Watermark ──────────────────────────────────────────
  const watermark = (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10 opacity-[0.04]">
      <span className="text-6xl font-bold text-foreground rotate-[-30deg] whitespace-nowrap select-none">
        KALMHUB
      </span>
    </div>
  );

  // ── Timer badge (inline) ───────────────────────────────
  const timerBadge = selectedMode && (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-xs tabular-nums',
        isOverTime && 'border-destructive text-destructive',
        isNearLimit && !isOverTime && 'border-amber-500 text-amber-600 dark:text-amber-400',
      )}
    >
      <Clock className="w-3 h-3" />
      {isOverTime ? '0:00' : formatTime(timeRemaining)}
    </Badge>
  );

  // ── Warning banner ─────────────────────────────────────
  const warningBanner = (() => {
    if (isAtMessageCap) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You've reached the maximum number of questions ({MAX_STUDENT_MESSAGES}). Please end the conversation and proceed.
        </div>
      );
    }
    if (isOverTime) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Time's up! Please end the conversation and proceed to questions.
        </div>
      );
    }
    if (isNearLimit) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <Clock className="w-4 h-4 shrink-0" />
          Consider wrapping up your questions soon.
        </div>
      );
    }
    return null;
  })();


  // ══════════════════════════════════════════════════════
  if (phase === 'interact') {
    // ── Text mode: show ATMIST handover ──
    if (isTextMode) {
      return (
        <div className="space-y-5 relative">
          {watermark}

          {/* Examiner Avatar */}
          {avatarUrl && (
            <div className="flex items-center gap-3">
              <Avatar className="w-16 h-16 ring-2 ring-primary/20 border-2 border-background shadow-md">
                <AvatarImage src={avatarUrl} alt={avatarName || 'Examiner'} />
                <AvatarFallback>{avatarName?.charAt(0) || 'E'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{avatarName || 'Examiner'}</p>
                <p className="text-xs text-muted-foreground">Text Mode</p>
              </div>
            </div>
          )}

          {/* ATMIST Handover */}
          {handover && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Paramedic Handover (ATMIST)</Label>
                <Badge
                  variant="outline"
                  className="text-xs ml-auto cursor-pointer"
                  onClick={() => setShowHandover(!showHandover)}
                >
                  {showHandover ? 'Collapse' : 'Expand'}
                </Badge>
              </div>
              {showHandover && (
                <Card className="bg-muted/30">
                  <CardContent className="py-3 px-4 space-y-2 text-sm">
                    {[
                      { key: 'A — Age/Time', value: handover.age_time },
                      { key: 'M — Mechanism', value: handover.mechanism },
                      { key: 'I — Injuries', value: handover.injuries },
                      { key: 'S — Signs', value: handover.signs },
                      { key: 'T — Treatment', value: handover.treatment },
                    ].map(item => (
                      <div key={item.key}>
                        <span className="font-semibold text-primary">{item.key}:</span>{' '}
                        <span className="text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!readOnly && (
            <Button onClick={handleFinishInteraction} className="w-full" variant="default">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finished Reading — Proceed to Questions
            </Button>
          )}
        </div>
      );
    }

    // ── Language selection screen ──
    if (!selectedLanguage) {
      return (
        <div className="flex flex-col items-center gap-6 py-8 relative">
          {watermark}
          {avatarUrl && (
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
              <AvatarFallback className="text-2xl">{avatarName?.charAt(0) || 'P'}</AvatarFallback>
            </Avatar>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold">{avatarName || 'Patient'}</p>
            <p className="text-sm text-muted-foreground">Choose the language for the conversation</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {availableLanguages.map(lang => {
              const info = LANGUAGE_LABELS[lang];
              if (!info) return null;
              return (
                <Button
                  key={lang}
                  size="lg"
                  variant="outline"
                  className="gap-2 min-w-[140px]"
                  onClick={() => setSelectedLanguage(lang)}
                >
                  <Globe className="w-5 h-5" />
                  {info.label} ({info.native})
                </Button>
              );
            })}
          </div>
        </div>
      );
    }

    // ── Mode selection screen: choose Chat or Voice ──
    if (!selectedMode) {
      const langInfo = LANGUAGE_LABELS[selectedLanguage] || LANGUAGE_LABELS.en;
      return (
        <div className="flex flex-col items-center gap-6 py-8 relative">
          {watermark}
          {avatarUrl && (
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
              <AvatarFallback className="text-2xl">{avatarName?.charAt(0) || 'P'}</AvatarFallback>
            </Avatar>
          )}
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">{avatarName || 'Patient'}</p>
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              {langInfo.label}
            </Badge>
            {(patientAge || patientGender || chiefComplaint) && (
              <div className="bg-muted/50 rounded-lg px-4 py-2.5 text-sm space-y-1 max-w-xs mx-auto">
                {(patientAge || patientGender) && (
                  <p className="font-medium text-foreground">
                    {[patientAge && `Age: ${patientAge}`, patientGender].filter(Boolean).join(' · ')}
                  </p>
                )}
                {chiefComplaint && (
                  <p className="text-muted-foreground line-clamp-2">
                    <span className="font-medium text-foreground">CC:</span> {chiefComplaint}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">Choose how you want to take the history</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setSelectedMode('chat');
                sendChatMessageInitial('chat');
              }}
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`gap-2 ${ttsSettingsLoading ? 'opacity-50' : ''}`}
              disabled={ttsSettingsLoading}
              onClick={() => {
                if (ttsSettingsLoading) return;
                // Pre-unlock audio in direct user gesture context (before any async)
                const preAudio = createUnlockedAudio();
                unlockedAudioRef.current = preAudio;
                setSelectedMode('voice');
                setShowVoiceFallbackInput(true); // Show text fallback by default
                sendChatMessageInitial('voice', preAudio);
              }}
            >
              <Mic className="w-5 h-5" />
              Voice
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedLanguage(null)} className="text-muted-foreground">
            ← Change language
          </Button>
        </div>
      );
    }

    // ── Chat mode ──
    if (selectedMode === 'chat') {
      return (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px] relative">
          {watermark}
          {isPlatformAdmin && <PerformanceDebugConsole metrics={metrics} />}

          {/* Three-column face-to-face layout */}
          <div className="flex gap-4 flex-1 min-h-0 px-2 pt-2">
            {/* Left column: Patient avatar */}
            <div className="w-24 flex flex-col items-center sticky top-0 self-start pt-2">
              {avatarUrl && (
                <div className={cn('rounded-full', isSending && 'animate-pulse-ring-amber')}>
                  <Avatar className="w-20 h-20 ring-2 ring-primary/20 border-2 border-background shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)]">
                    <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
                    <AvatarFallback>{avatarName?.charAt(0) || 'P'}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Center column: Scrollable messages */}
            <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg p-3 bg-muted/20">
              <div className="space-y-3">
                {chatMessages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const userMsgIndex = isUser
                    ? chatMessages.slice(0, i + 1).filter(m => m.role === 'user').length
                    : 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                        isUser
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'bg-card border text-card-foreground'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-1">{msg.content}</span>
                        {isUser && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 ml-1">
                            Q{userMsgIndex}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isSending && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Right column: Student avatar */}
            <div className="w-24 flex flex-col items-center sticky top-0 self-start pt-2">
              <Avatar className="w-20 h-20 ring-2 ring-primary/20 border-2 border-background shadow-md">
                {studentAvatarUrl ? (
                  <AvatarImage src={studentAvatarUrl} alt="You" />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {studentName ? studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'أنت'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="pt-3 space-y-2 shrink-0">
            {/* Warning banner */}
            {warningBanner}

            {/* Input row */}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage(chatInput);
                  }
                }}
                placeholder={shouldDisableInput ? 'Message limit reached' : 'Ask the patient a question...'}
                disabled={isSending || shouldDisableInput}
                className="text-sm"
                autoFocus
              />
              <Button
                size="icon"
                onClick={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim() || isSending || shouldDisableInput}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Footer row: timer + count + end button */}
            <div className="flex items-center gap-3">
              {timerBadge}
              <span className="text-xs text-muted-foreground">
                {studentMessageCount} questions asked
              </span>
              <div className="flex-1" />
              <Button
                onClick={handleFinishInteraction}
                variant={isOverTime || isAtMessageCap ? 'default' : 'secondary'}
                size="sm"
                className={cn('gap-2', (isOverTime || isAtMessageCap) && 'animate-pulse')}
              >
                <CheckCircle2 className="w-4 h-4" />
                End Conversation — Proceed to Questions
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // ── Voice mode ──
    if (selectedMode === 'voice') {

      return (
        <div className="flex flex-col h-[calc(100vh-360px)] min-h-[220px] relative">
          {watermark}
          {isSuperAdmin && <PerformanceDebugConsole metrics={metrics} />}

          {/* Three-column face-to-face layout */}
          <div className="flex gap-4 flex-1 min-h-0 px-2 pt-2">
            {/* Left column: Patient avatar + speech bubble */}
            <div className="w-24 flex flex-col items-center sticky top-0 self-start pt-2">
              <div className={cn('rounded-full', isSpeaking ? 'animate-pulse-ring-blue' : isSending ? 'animate-pulse-ring-amber' : isListening ? 'animate-pulse-ring-green' : '')}>
                {avatarUrl && (
                  <Avatar className="w-20 h-20 ring-2 ring-primary/20 border-2 border-background shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)]">
                    <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
                    <AvatarFallback>{avatarName?.charAt(0) || 'P'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>

            {/* Center column: Mic button + status */}
            <div className="flex-1 flex flex-col items-center self-start pt-2 gap-3">
              <div className="h-20 flex items-center">
                <Button
                  size="lg"
                  variant={isListening ? 'destructive' : 'default'}
                  className="gap-2 rounded-full w-14 h-14"
                  onClick={toggleVoice}
                  disabled={isSending || shouldDisableInput || scribeConnecting || isSpeaking}
                >
                  {scribeConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
              </div>


              {isListening && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  جاري الاستماع...
                </div>
              )}

              {isSpeaking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  Patient is speaking...
                </div>
              )}

              {isSending && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جاري التفكير...
                </div>
              )}

              {/* Mic prompt — before student speaks */}
              {!isListening && !isSending && !isSpeaking && chatMessages.filter(m => m.role === 'user').length === 0 && (
                <div className="flex items-center gap-2 text-base text-foreground/70 dark:text-slate-300 animate-pulse">
                  <Mic className="w-4 h-4" />
                  <span>{selectedLanguage === 'ar' ? '🎤 اضغط على الميكروفون لبدء الأسئلة' : '🎤 Press the microphone to start asking questions'}</span>
                </div>
              )}

              {/* Patient speech bubble — enlarged, centered */}
              <div
                ref={voiceBubbleRef}
                className={cn(
                  'rounded-xl border px-4 py-3 text-base max-w-sm w-full max-h-40 overflow-y-auto transition-all duration-500',
                  displayedText ? 'opacity-100' : 'opacity-0',
                  (isWaitingForAi || (isSpeaking && !ttsFirstByte)) 
                    ? 'bg-muted/50 text-muted-foreground italic scale-95 border-dashed blur-[0.5px]' 
                    : 'bg-card text-card-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.15)]'
                )}
                dir="rtl"
              >
                {(isWaitingForAi || (isSpeaking && !ttsFirstByte)) && (
                  <span className="inline-flex gap-1 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                  </span>
                )}
                {displayedText || '\u00A0'}
              </div>
            </div>

            {/* Right column: Student avatar */}
            <div className="w-24 flex flex-col items-center sticky top-0 self-start pt-2">
              <div className={cn('rounded-full', isListening && 'animate-pulse-ring-green')}>
                <Avatar className="w-20 h-20 ring-2 ring-primary/20 border-2 border-background shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)]">
                  {studentAvatarUrl ? (
                    <AvatarImage src={studentAvatarUrl} alt="You" />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                    {studentName ? studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'أنت'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="pt-3 space-y-2 shrink-0">
            {/* Warning banner */}
            {warningBanner}

            {/* Footer row: timer + count + end button */}
            <div className="flex items-center gap-3">
              {timerBadge}
              <span className="text-xs text-muted-foreground">
                {studentMessageCount} questions asked
              </span>
              <div className="flex-1" />
              <Button
                onClick={handleFinishInteraction}
                variant={isOverTime || isAtMessageCap ? 'default' : 'secondary'}
                size="sm"
                className={cn('gap-2', (isOverTime || isAtMessageCap) && 'animate-pulse')}
              >
                <CheckCircle2 className="w-4 h-4" />
                End Conversation — Proceed to Questions
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ══════════════════════════════════════════════════════
  // PHASE 2: Comprehension Questions
  // ══════════════════════════════════════════════════════
  return (
    <div className="space-y-5 relative">
      {watermark}
      {isPlatformAdmin && <PerformanceDebugConsole metrics={metrics} />}

      {questions.length > 0 && (
        <div className="space-y-3">
          <Label className="font-medium">Comprehension Questions</Label>
          <p className="text-xs text-muted-foreground">
            Answer the following questions based on the history you just reviewed.
          </p>
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-1">
              <Label className="text-sm">
                Q{i + 1}: {q.question}
                <span className="text-xs text-muted-foreground ml-2">({q.points} pts)</span>
              </Label>
              <Input
                id={`comp-q-${i}`}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                onPaste={e => e.preventDefault()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const next = document.getElementById(`comp-q-${i + 1}`);
                    if (next) next.focus();
                  }
                }}
                disabled={readOnly}
                placeholder="Type your answer... (type 'pass' to skip)"
                className="text-sm"
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button onClick={handleSubmit} disabled={isSubmitting || !allAnswered} className="w-full">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit History Taking
        </Button>
      )}
    </div>
  );

  // ── Helper: send initial greeting (local only — no edge function call) ──
  async function sendChatMessageInitial(mode: 'chat' | 'voice', preUnlockedAudio?: HTMLAudioElement) {
    const lang = selectedLanguage || 'en';
    const greeting = lang === 'ar'
      ? 'السلام عليكم يا دكتور'
      : 'Hello doctor';

    // Show patient greeting locally — student sends the first real message
    setChatMessages([{ role: 'assistant', content: greeting }]);

  }
}
