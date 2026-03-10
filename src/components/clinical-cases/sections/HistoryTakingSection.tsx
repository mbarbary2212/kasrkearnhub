import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { toast } from 'sonner';
import { speakArabic, PatientTone } from '@/utils/tts';
import { useAISettings, getSettingValue } from '@/hooks/useAISettings';

interface HistoryTakingProps extends SectionComponentProps<HistorySectionData> {
  avatarUrl?: string;
  avatarName?: string;
  historyInteractionMode?: string;
  caseId?: string;
  studentName?: string;
  patientTone?: PatientTone;
  estimatedMinutes?: number;
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
  patientTone,
  estimatedMinutes,
}: HistoryTakingProps) {
  const isTextMode = historyInteractionMode === 'text' || !historyInteractionMode;
  const canChat = historyInteractionMode === 'voice' || historyInteractionMode === 'chat';

  // TTS settings
  const { data: ttsSettings } = useAISettings();
  const ttsProvider = (getSettingValue(ttsSettings, 'tts_provider', 'browser') as 'browser' | 'elevenlabs');

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
  const [lastSpoken, setLastSpoken] = useState('');
  const recognitionRef = useRef<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceErrorCount, setVoiceErrorCount] = useState(0);
  const [showVoiceFallbackInput, setShowVoiceFallbackInput] = useState(false);
  const [voiceFallbackInput, setVoiceFallbackInput] = useState('');
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('mute_ai_voice') === 'true'; } catch { return false; }
  });

  // Comprehension answers
  const [answers, setAnswers] = useState<Record<string, string>>(
    (previousAnswer?.comprehension_answers as Record<string, string>) || {}
  );

  // ── Time & message limits ─────────────────────────────
  const timeLimitMs = useMemo(
    () => (estimatedMinutes ? Math.ceil(estimatedMinutes * 0.4) : 5) * 60 * 1000,
    [estimatedMinutes]
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

  // ── Chat send ──────────────────────────────────────────
  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || !caseId) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsSending(true);

    try {
      const { data: fnData, error } = await supabase.functions.invoke('patient-history-chat', {
        body: {
          case_id: caseId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          mode: selectedMode || 'chat',
          language: selectedLanguage || 'en',
        },
      });

      if (error) throw error;

      const reply = fnData?.reply || 'Sorry, I could not respond.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Voice mode: speak the response (unless muted)
      if (selectedMode === 'voice' && !isMuted) {
        const gender = getSettingValue(ttsSettings, 'tts_voice_gender', 'male') as string;
        const voiceId = gender === 'female'
          ? getSettingValue(ttsSettings, 'tts_elevenlabs_female_voice', 'RCubfxZlU5rlyEKAEsSN') as string
          : getSettingValue(ttsSettings, 'tts_elevenlabs_male_voice', 'DWMVT5WflKt0P8OPpIrY') as string;
        speakArabic(reply, ttsProvider, voiceId, patientTone);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة أخرى.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [chatMessages, caseId, selectedMode]);

  // ── Voice recognition ──────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = LANGUAGE_LABELS[selectedLanguage || 'ar']?.speechLocale || 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onaudiostart = () => {
      // Mic is capturing — no action needed
    };

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
      setVoiceErrorCount(prev => {
        const next = prev + 1;
        if (next >= 2) {
          setShowVoiceFallbackInput(true);
          toast.info('Voice input unavailable. You can type your message instead.');
        }
        return next;
      });
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, sendChatMessage]);

  // ── Phase transition ───────────────────────────────────
  const handleFinishInteraction = () => {
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
          <div className="text-center">
            <p className="text-lg font-semibold">{avatarName || 'Patient'}</p>
            <Badge variant="outline" className="gap-1 mt-1">
              <Globe className="w-3 h-3" />
              {langInfo.label}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">Choose how you want to take the history</p>
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
              className="gap-2"
              onClick={() => {
                setSelectedMode('voice');
                sendChatMessageInitial('voice');
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
        <div className="space-y-3 relative">
          {watermark}
          {/* Header */}
          <div className="flex items-center gap-3">
            {avatarUrl && (
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
                <AvatarFallback>{avatarName?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{avatarName || 'Patient'}</p>
              <p className="text-xs text-muted-foreground">Chat Mode — {LANGUAGE_LABELS[selectedLanguage || 'en']?.label || 'English'}</p>
            </div>
            {timerBadge}
          </div>

          {/* Messages */}
          <ScrollArea className="h-[320px] border rounded-lg p-3 bg-muted/20">
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'bg-card border text-card-foreground'
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Warning banner */}
          {warningBanner}

          {/* Input */}
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
            />
            <Button
              size="icon"
              onClick={() => sendChatMessage(chatInput)}
              disabled={!chatInput.trim() || isSending || shouldDisableInput}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Message counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {studentMessageCount}/{MAX_STUDENT_MESSAGES} questions
            </span>
            <Button
              onClick={handleFinishInteraction}
              variant={isOverTime || isAtMessageCap ? 'default' : 'secondary'}
              className={cn('gap-2', (isOverTime || isAtMessageCap) && 'animate-pulse')}
            >
              <CheckCircle2 className="w-4 h-4" />
              End Conversation — Proceed to Questions
            </Button>
          </div>
        </div>
      );
    }

    // ── Voice mode ──
    if (selectedMode === 'voice') {
      return (
        <div className="flex flex-col items-center gap-6 py-6 relative">
          {watermark}
          <div className={cn(
            'rounded-full',
            isListening && 'animate-pulse-ring'
          )}>
            {avatarUrl && (
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} alt={avatarName || 'Patient'} />
                <AvatarFallback className="text-2xl">{avatarName?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{avatarName || 'Patient'}</p>
            <p className="text-xs text-muted-foreground">وضع الصوت — العامية المصرية</p>
            <div className="mt-1">{timerBadge}</div>
          </div>

          {/* Last spoken */}
          {lastSpoken && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 max-w-xs text-center">
              "{lastSpoken}"
            </div>
          )}

          {/* Last AI reply */}
          {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'assistant' && (
            <div className="text-sm bg-card border rounded-lg px-4 py-2 max-w-xs text-center">
              {chatMessages[chatMessages.length - 1].content}
            </div>
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري التفكير...
            </div>
          )}

          <Button
            size="lg"
            variant={isListening ? 'destructive' : 'default'}
            className="gap-2 rounded-full w-16 h-16"
            onClick={toggleVoice}
            disabled={isSending || shouldDisableInput}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
          {/* Listening indicator + interim transcript */}
          {isListening && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-sm text-primary">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                جاري الاستماع... اضغط لإيقاف
              </div>
              {interimTranscript && (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-1 max-w-xs text-center italic" dir="rtl">
                  {interimTranscript}
                </p>
              )}
            </div>
          )}
          {!isListening && (
            <p className="text-xs text-muted-foreground">اضغط للتحدث</p>
          )}

          {/* Warning banner */}
          {warningBanner && <div className="w-full max-w-xs">{warningBanner}</div>}

          {/* Fallback text input */}
          {showVoiceFallbackInput && (
            <div className="flex gap-2 w-full max-w-xs" dir="rtl">
              <Input
                value={voiceFallbackInput}
                onChange={e => setVoiceFallbackInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (voiceFallbackInput.trim()) {
                      sendChatMessage(voiceFallbackInput);
                      setVoiceFallbackInput('');
                    }
                  }
                }}
                placeholder={shouldDisableInput ? 'تم الوصول للحد الأقصى' : 'اكتب سؤالك هنا...'}
                disabled={isSending || shouldDisableInput}
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={() => {
                  if (voiceFallbackInput.trim()) {
                    sendChatMessage(voiceFallbackInput);
                    setVoiceFallbackInput('');
                  }
                }}
                disabled={!voiceFallbackInput.trim() || isSending || shouldDisableInput}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Message counter + End button */}
          <span className="text-xs text-muted-foreground">
            {studentMessageCount}/{MAX_STUDENT_MESSAGES} questions
          </span>
          <Button
            onClick={handleFinishInteraction}
            variant={isOverTime || isAtMessageCap ? 'default' : 'secondary'}
            className={cn('w-full max-w-xs gap-2', (isOverTime || isAtMessageCap) && 'animate-pulse')}
          >
            <CheckCircle2 className="w-4 h-4" />
            End Conversation — Proceed to Questions
          </Button>
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
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                onPaste={e => e.preventDefault()}
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

  // ── Helper: send initial greeting ──────────────────────
  function sendChatMessageInitial(mode: 'chat' | 'voice') {
    const lang = selectedLanguage || 'en';
    const langInfo = LANGUAGE_LABELS[lang] || LANGUAGE_LABELS.en;
    const initMsg: ChatMessage = { role: 'user', content: langInfo.greeting };
    setChatMessages([initMsg]);
    setIsSending(true);

    supabase.functions
      .invoke('patient-history-chat', {
        body: {
          case_id: caseId,
          messages: [{ role: initMsg.role, content: initMsg.content }],
          mode,
          language: lang,
        },
      })
      .then(({ data: fnData, error }) => {
        if (error) throw error;
        const fallbackGreeting = lang === 'ar' ? 'أهلاً يا دكتور' : 'Hello doctor';
        const reply = fnData?.reply || fallbackGreeting;
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

        if (mode === 'voice' && lang === 'ar') {
          const gender = getSettingValue(ttsSettings, 'tts_voice_gender', 'male') as string;
          const voiceId = gender === 'female'
            ? getSettingValue(ttsSettings, 'tts_elevenlabs_female_voice', 'RCubfxZlU5rlyEKAEsSN') as string
            : getSettingValue(ttsSettings, 'tts_elevenlabs_male_voice', 'DWMVT5WflKt0P8OPpIrY') as string;
          speakArabic(reply, ttsProvider, voiceId, patientTone);
        }
      })
      .catch(err => {
        console.error('Initial chat error:', err);
        const fallback = lang === 'ar' ? 'أهلاً يا دكتور' : 'Hello doctor, how can I help?';
        setChatMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
      })
      .finally(() => setIsSending(false));
  }
}
