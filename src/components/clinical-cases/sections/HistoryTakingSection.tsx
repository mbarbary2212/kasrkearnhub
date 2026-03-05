import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, User, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorySectionData } from '@/types/structuredCase';
import { SectionComponentProps } from './types';

interface ChatMessage {
  role: 'student' | 'patient';
  content: string;
}

export function HistoryTakingSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<HistorySectionData>) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    (previousAnswer?.messages as ChatMessage[]) || []
  );
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const profile = data.patient_profile;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking || readOnly) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'student', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    // Simulate patient response (in the full runner, this calls the AI)
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'patient',
          content: 'Thank you for asking. Let me think about that...',
        },
      ]);
      setIsThinking(false);
    }, 1500);
  };

  const handleFinish = () => {
    onSubmit({
      messages,
      checklist_self_report: {},
      turn_count: messages.filter(m => m.role === 'student').length,
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Patient info bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-t-lg border-b">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{profile.name}</p>
          <p className="text-xs text-muted-foreground">
            {profile.age}y, {profile.gender}
            {profile.occupation && ` • ${profile.occupation}`}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          {messages.filter(m => m.role === 'student').length} questions asked
        </Badge>
      </div>

      {/* Chat area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start by asking the patient about their symptoms.</p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2 max-w-[85%]',
                msg.role === 'student' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={cn('text-xs', msg.role === 'student' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {msg.role === 'student' ? 'Dr' : profile.name[0]}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  msg.role === 'student'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex gap-2 max-w-[85%]">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-muted text-xs">{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input + actions */}
      <div className="border-t p-3 space-y-2">
        {!readOnly && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask the patient a question..."
              disabled={isThinking}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || isThinking}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!readOnly && messages.length >= 2 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleFinish}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Finish History Taking
          </Button>
        )}
      </div>
    </div>
  );
}
