import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Send, Loader2, Bot, User, Sparkles, BookOpen, Stethoscope, Brain, X } from 'lucide-react';
import { useTutorChat, type Message } from '@/hooks/useTutorChat';
import { useIsMobile } from '@/hooks/use-mobile';

interface TutorChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_QUESTIONS = [
  { icon: BookOpen, text: "Explain the renin-angiotensin-aldosterone system", category: "Physiology" },
  { icon: Stethoscope, text: "What are the causes of heart failure?", category: "Pathology" },
  { icon: Brain, text: "How do beta-blockers work?", category: "Pharmacology" },
];

export function TutorChatPanel({ open, onOpenChange }: TutorChatPanelProps) {
  const isMobile = useIsMobile();
  const {
    messages,
    input,
    setInput,
    isLoading,
    scrollRef,
    handleSend,
    handleKeyDown,
  } = useTutorChat();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={`flex flex-col p-0 ${
          isMobile 
            ? 'h-[90vh] rounded-t-2xl' 
            : 'w-[400px] sm:w-[440px] sm:max-w-[440px]'
        }`}
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold">MedGPT Tutor</SheetTitle>
                <p className="text-xs text-muted-foreground">Your AI study companion</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="py-8 text-center space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Welcome!</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    I'm here to help you understand medical concepts and support your studies.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Try asking:</p>
                  <div className="flex flex-col gap-2">
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
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Card
                    className={`max-w-[85%] p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                      {msg.content}
                    </div>
                  </Card>
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
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-3.5 w-3.5" />
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
              placeholder="Ask me anything..."
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
            Study aid only. Verify with official materials.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
