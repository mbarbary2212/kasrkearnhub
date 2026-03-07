import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, MessageCircle, Mic, MicOff, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorySectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HistoryTakingProps extends SectionComponentProps<HistorySectionData> {
  avatarUrl?: string;
  avatarName?: string;
  historyInteractionMode?: string;
  caseId?: string;
  studentName?: string;
}

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
}: HistoryTakingProps) {
  const isTextMode = historyInteractionMode === 'text' || !historyInteractionMode;
  const canChat = historyInteractionMode === 'voice' || historyInteractionMode === 'chat';

  const [phase, setPhase] = useState<Phase>(previousAnswer ? 'questions' : 'interact');
  const [selectedMode, setSelectedMode] = useState<'chat' | 'voice' | null>(
    isTextMode ? null : null
  );
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

  // Comprehension answers
  const [answers, setAnswers] = useState<Record<string, string>>(
    (previousAnswer?.comprehension_answers as Record<string, string>) || {}
  );

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
        },
      });

      if (error) throw error;

      const reply = fnData?.reply || 'Sorry, I could not respond.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      // Voice mode: speak the response
      if (selectedMode === 'voice' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = 'ar-EG';
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
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
    recognition.lang = 'ar-EG';
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

  // ══════════════════════════════════════════════════════
  // PHASE 1: Interaction
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
              <Avatar className="w-12 h-12 border-2 border-primary/20">
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

    // ── Landing screen: choose Chat or Voice ──
    if (!selectedMode) {
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
            <p className="text-sm text-muted-foreground">Choose how you want to take the history</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setSelectedMode('chat');
                // Send initial greeting
                sendChatMessageInitial('chat');
              }}
            >
              <MessageCircle className="w-5 h-5" />
              Chat (English)
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
              Voice (عربي)
            </Button>
          </div>
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
            <div>
              <p className="text-sm font-medium">{avatarName || 'Patient'}</p>
              <p className="text-xs text-muted-foreground">Chat Mode — English</p>
            </div>
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
              placeholder="Ask the patient a question..."
              disabled={isSending}
              className="text-sm"
            />
            <Button
              size="icon"
              onClick={() => sendChatMessage(chatInput)}
              disabled={!chatInput.trim() || isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleFinishInteraction}
            variant="secondary"
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            End Conversation — Proceed to Questions
          </Button>
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
            disabled={isSending}
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
                placeholder="اكتب سؤالك هنا..."
                disabled={isSending}
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
                disabled={!voiceFallbackInput.trim() || isSending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleFinishInteraction}
            variant="secondary"
            className="w-full max-w-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
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
    // Trigger the AI to send the first greeting
    const initMsg: ChatMessage = { role: 'user', content: mode === 'voice' ? 'السلام عليكم' : 'Hello' };
    setChatMessages([initMsg]);
    setIsSending(true);

    supabase.functions
      .invoke('patient-history-chat', {
        body: {
          case_id: caseId,
          messages: [{ role: initMsg.role, content: initMsg.content }],
          mode,
        },
      })
      .then(({ data: fnData, error }) => {
        if (error) throw error;
        const reply = fnData?.reply || (mode === 'voice' ? 'أهلاً يا دكتور' : 'Hello doctor');
        setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

        if (mode === 'voice' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.lang = 'ar-EG';
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      })
      .catch(err => {
        console.error('Initial chat error:', err);
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', content: mode === 'voice' ? 'أهلاً يا دكتور' : 'Hello doctor, how can I help?' },
        ]);
      })
      .finally(() => setIsSending(false));
  }
}
