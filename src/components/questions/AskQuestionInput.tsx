import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { checkMessage } from '@/lib/profanityFilter';

interface AskQuestionInputProps {
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
}

export function AskQuestionInput({ onSubmit, isSubmitting }: AskQuestionInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const check = checkMessage(trimmed);
    if (check.blocked) {
      return;
    }
    onSubmit(trimmed);
    setText('');
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 500))}
        placeholder="Ask a question about this chapter..."
        className="min-h-[60px] resize-none text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
