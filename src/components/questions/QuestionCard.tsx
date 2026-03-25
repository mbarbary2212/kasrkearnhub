import { useState } from 'react';
import { ChapterQuestion } from '@/hooks/useChapterQuestions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, Pin, EyeOff, MessageSquare, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: ChapterQuestion;
  isTopQuestion: boolean;
  canManage: boolean;
  onUpvote: () => void;
  onAnswer?: (text: string) => void;
  onPin?: () => void;
  onHide?: () => void;
}

export function QuestionCard({ question, isTopQuestion, canManage, onUpvote, onAnswer, onPin, onHide }: QuestionCardProps) {
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerText, setAnswerText] = useState('');

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 transition-colors",
      question.is_pinned && "border-primary/40 bg-primary/5",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {question.is_pinned && (
              <Pin className="h-3 w-3 text-primary shrink-0" />
            )}
            {isTopQuestion && question.upvote_count > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">Most Asked</Badge>
            )}
            {question.is_answered && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 text-green-600 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Answered
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1">{question.question_text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {question.author_name} · {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
          </p>
        </div>

        <Button
          variant={question.user_has_upvoted ? "default" : "outline"}
          size="sm"
          className="shrink-0 gap-1 h-8"
          onClick={onUpvote}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="text-xs">{question.upvote_count}</span>
        </Button>
      </div>

      {/* Answer display */}
      {question.is_answered && question.answer_text && (
        <div className="bg-muted/50 rounded-md p-2.5 mt-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Official Answer by {question.answerer_name}
          </p>
          <p className="text-sm">{question.answer_text}</p>
        </div>
      )}

      {/* Admin actions */}
      {canManage && (
        <div className="flex items-center gap-1 pt-1">
          {!question.is_answered && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAnswerInput(!showAnswerInput)}>
              <MessageSquare className="h-3 w-3" /> Answer
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onPin}>
            <Pin className="h-3 w-3" /> {question.is_pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={onHide}>
            <EyeOff className="h-3 w-3" /> Hide
          </Button>
        </div>
      )}

      {/* Answer input for admins */}
      {showAnswerInput && canManage && (
        <div className="flex gap-2 items-end pt-1">
          <Textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder="Type your answer..."
            className="min-h-[50px] resize-none text-sm"
          />
          <Button
            size="sm"
            disabled={!answerText.trim()}
            onClick={() => {
              onAnswer?.(answerText);
              setShowAnswerInput(false);
              setAnswerText('');
            }}
          >
            Post
          </Button>
        </div>
      )}
    </div>
  );
}
