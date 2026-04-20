import { useEffect, useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Send, 
  Loader2, 
  User, 
  Sparkles, 
  BookOpen, 
  Stethoscope, 
  Brain, 
  X,
  AlertCircle,
  GraduationCap,
  Download,
} from 'lucide-react';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import remarkGfm from 'remark-gfm';
import { useCoachContext, useCoachPrompt } from '@/contexts/CoachContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import studyCoachIcon from '@/assets/study-coach-icon.png';
import { CoachErrorState, type CoachErrorCode } from './CoachErrorState';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachError {
  code: CoachErrorCode;
  title: string;
  message: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

const SUGGESTED_QUESTIONS = [
  { icon: BookOpen, text: "Explain this concept in simpler terms", category: "Understanding" },
  { icon: Stethoscope, text: "What are the clinical implications?", category: "Clinical" },
  { icon: Brain, text: "How can I remember this better?", category: "Memory" },
];

export function AskCoachPanel() {
  const isMobile = useIsMobile();
  const { 
    askCoachOpen, 
    closeAskCoach, 
    studyContext, 
    performance, 
    initialCoachMessage 
  } = useCoachContext();
  const { generatePrompt } = useCoachPrompt();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CoachError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInjectedContext = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset when panel closes
  useEffect(() => {
    if (!askCoachOpen) {
      setMessages([]);
      setInput('');
      setError(null);
      hasInjectedContext.current = false;
    }
  }, [askCoachOpen]);

  // Auto-send initial context when opening with a question
  useEffect(() => {
    if (askCoachOpen && initialCoachMessage && !hasInjectedContext.current) {
      hasInjectedContext.current = true;
      handleSend(initialCoachMessage);
    }
  }, [askCoachOpen, initialCoachMessage]);

  const streamChat = useCallback(async (userMessages: Message[], contextPrompt: string | null) => {
    const systemContext = contextPrompt ? `\n\n[STUDY CONTEXT]\n${contextPrompt}` : '';
    
    // Get auth token for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;
    
    if (!authToken) {
      setError({
        code: 'AUTH_REQUIRED',
        title: 'Sign in required',
        message: 'Please sign in to use the Study Coach.',
      });
      return;
    }

    // Build soft context — works even without a chapter/topic
    const { data: { user } } = await supabase.auth.getUser();
    let preferredYearId: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_year_id')
        .eq('id', user.id)
        .maybeSingle();
      preferredYearId = profile?.preferred_year_id ?? null;
    }
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        context: systemContext,
        chapterId: studyContext?.chapterId || null,
        topicId: studyContext?.topicId || null,
        moduleId: studyContext?.moduleId || null,
        userId: user?.id ?? null,
        preferredYearId,
        routePath: typeof window !== 'undefined' ? window.location.pathname : null,
      }),
    });

    const contentType = resp.headers.get('content-type') || '';
    
    // Always try to parse JSON error responses for diagnostics
    if (contentType.includes('application/json')) {
      const data = await resp.json().catch(() => ({}));
      
      // Log full body for debugging non-OK responses
      if (!resp.ok) {
        console.error('coach-chat non-OK response:', resp.status, data);
      }

      // Check for structured error codes (with or without 4xx/5xx)
      const knownCodes: CoachErrorCode[] = ['AUTH_REQUIRED', 'COACH_DISABLED', 'QUOTA_EXCEEDED', 'RAG_NO_RESULTS', 'INJECTION_DETECTED'];
      if (data?.code && knownCodes.includes(data.code)) {
        setError({
          code: data.code as CoachErrorCode,
          title: data.title || 'Error',
          message: data.message || 'An error occurred',
        });
        return;
      }
      
      if (data?.blocked) {
        toast.warning(data.message || 'Your message could not be processed.');
        return;
      }

      // Generic 4xx/5xx fallback when JSON didn't match a known code
      if (!resp.ok) {
        setError({
          code: 'COACH_DISABLED',
          title: 'Coach is temporarily unavailable',
          message: data?.message || data?.error || 'Coach is temporarily unavailable — please try again.',
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
    }

    if (!resp.ok) {
      // Non-JSON 4xx/5xx — log raw body and surface generic fallback
      const rawText = await resp.text().catch(() => '');
      console.error('coach-chat non-OK (non-JSON):', resp.status, rawText);
      
      if (resp.status === 503) {
        setError({
          code: 'COACH_DISABLED',
          title: 'Coach is temporarily unavailable',
          message: 'The study coach is currently disabled by the course administrators. Please use your course materials and send questions via Feedback & Inquiries.',
        });
        return;
      }
      if (resp.status === 429) {
        setError({
          code: 'QUOTA_EXCEEDED',
          title: 'Daily question limit reached',
          message: 'You have used all 5 coach questions for today. Please try again tomorrow, or send your question to the moderators.',
        });
        return;
      }
      setError({
        code: 'COACH_DISABLED',
        title: 'Coach is temporarily unavailable',
        message: 'Coach is temporarily unavailable — please try again.',
      });
      return;
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';
    let receivedAssistantToken = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            receivedAssistantToken = true;
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: 'assistant', content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Detect silent empty stream — surface a clear error instead of leaving the user hanging.
    if (!receivedAssistantToken) {
      console.warn('[coach-chat] stream completed with zero assistant tokens');
      setError({
        code: 'COACH_DISABLED',
        title: 'Coach returned an empty response',
        message: 'The coach connected but didn\'t produce an answer. Please try again, or rephrase your question.',
      });
    }
  }, [studyContext?.chapterId, studyContext?.topicId]);

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    // Clear any previous error
    setError(null);

    const userMsg: Message = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const contextPrompt = generatePrompt();
      await streamChat(newMessages, contextPrompt);
    } catch (err) {
      console.error('Coach chat error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to get response');
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, streamChat, generatePrompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Build contextual header
  const getContextHeader = () => {
    if (!studyContext) return null;
    const parts: string[] = [];
    if (studyContext.moduleName) parts.push(studyContext.moduleName);
    if (studyContext.chapterName) parts.push(studyContext.chapterName);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const contextHeader = getContextHeader();

  // Show error state if there's an error
  if (error) {
    return (
      <Sheet open={askCoachOpen} onOpenChange={(open) => !open && closeAskCoach()}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"} 
          className={`flex flex-col p-0 ${
            isMobile 
              ? 'h-[90vh] rounded-t-2xl' 
              : 'w-[420px] sm:w-[460px] sm:max-w-[460px]'
          }`}
        >
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={studyCoachIcon} alt="Study Coach" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-base font-semibold">Study Coach</SheetTitle>
                </div>
              </div>
            </div>
          </SheetHeader>

          <CoachErrorState
            code={error.code}
            title={error.title}
            message={error.message}
            onClose={closeAskCoach}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={askCoachOpen} onOpenChange={(open) => !open && closeAskCoach()}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={`flex flex-col p-0 ${
          isMobile 
            ? 'h-[90vh] rounded-t-2xl' 
            : 'w-[420px] sm:w-[460px] sm:max-w-[460px]'
        }`}
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={studyCoachIcon} alt="Study Coach" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-base font-semibold">Study Coach</SheetTitle>
                {contextHeader && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {contextHeader}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Performance Warning */}
        {performance.needsIntervention && messages.length === 0 && (
          <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You seem to be having some difficulty. Don't worry – I'm here to help you understand the material better.
            </p>
          </div>
        )}

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="py-6 text-center space-y-5">
                <div className="space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">How can I help?</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {studyContext?.question 
                      ? "I can see you're working on a question. Ask me anything about it!"
                      : studyContext?.resource
                      ? "I can help you understand this material better."
                      : "I'm here to guide your studies."}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Quick actions:</p>
                  <div className="flex flex-col gap-2">
                    {studyContext?.question && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 px-3 text-left justify-start bg-primary/5"
                        onClick={() => handleSend("Help me understand this question")}
                      >
                        <GraduationCap className="h-3.5 w-3.5 mr-2 shrink-0 text-primary" />
                        <span className="text-xs">Help me with this question</span>
                      </Button>
                    )}
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 px-3 text-left justify-start"
                        onClick={() => handleSend(q.text)}
                      >
                        <q.icon className="h-3.5 w-3.5 mr-2 shrink-0" />
                        <span className="text-xs line-clamp-1">{q.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg: Message, i: number) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={studyCoachIcon} alt="Coach" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <GraduationCap className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <Card
                      className={`p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm overflow-x-auto [&_table]:min-w-[300px] [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
                          <SafeMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </SafeMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-all text-sm">
                          {msg.content}
                        </div>
                      )}
                    </Card>
                    {msg.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                        onClick={() => {
                          const blob = new Blob([msg.content], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `coach-answer-${i + 1}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={studyCoachIcon} alt="Coach" className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <Card className="bg-muted p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm p-3 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your Study Coach..."
              className="min-h-[44px] max-h-24 resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Powered by AI • Study aid only
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
