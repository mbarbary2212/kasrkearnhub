import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorError {
  blocked: true;
  code: string;
  title?: string;
  message: string;
  action_url?: string;
  action_label?: string;
}

const CHAT_URL = `${SUPABASE_URL}/functions/v1/med-tutor-chat`;

export function useTutorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TutorError | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (userMessages: Message[], context?: string) => {
    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      setError({
        blocked: true,
        code: 'UNAUTHORIZED',
        title: 'Sign in required',
        message: 'Please sign in to use the tutor.',
      });
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: userMessages, context }),
    });

    // Check if the response is a blocked/error message (JSON response)
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await resp.json();
      
      // Handle daily limit reached — show as assistant message
      if (data.limitReached) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || 'You have reached your daily question limit.' }]);
        return;
      }
      
      if (data.blocked) {
        // Set structured error for CoachErrorState to display
        setError({
          blocked: true,
          code: data.code || 'UNKNOWN',
          title: data.title,
          message: data.message || 'Your message could not be processed.',
          action_url: data.action_url,
          action_label: data.action_label,
        });
        return;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
    }

    if (!resp.ok) {
      throw new Error(`Error: ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

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
  }, []);

  const handleSend = useCallback(async (text?: string, context?: string) => {
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
      await streamChat(newMessages, context);
    } catch (err) {
      console.error('Chat error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to get response');
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, streamChat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    scrollRef,
    handleSend,
    handleKeyDown,
    error,
    clearError,
    resetChat,
  };
}
