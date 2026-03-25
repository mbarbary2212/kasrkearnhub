import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageCircleQuestion, ChevronDown } from 'lucide-react';
import { useChapterQuestions, useAskQuestion, useToggleUpvote, useAnswerQuestion, useTogglePinQuestion, useHideQuestion } from '@/hooks/useChapterQuestions';
import { AskQuestionInput } from './AskQuestionInput';
import { QuestionCard } from './QuestionCard';
import { cn } from '@/lib/utils';

interface ChapterQASectionProps {
  chapterId: string;
  moduleId: string;
  canManage: boolean;
}

export function ChapterQASection({ chapterId, moduleId, canManage }: ChapterQASectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: questions = [], isLoading } = useChapterQuestions(chapterId);
  const askQuestion = useAskQuestion();
  const toggleUpvote = useToggleUpvote();
  const answerQuestion = useAnswerQuestion();
  const togglePin = useTogglePinQuestion();
  const hideQuestion = useHideQuestion();

  const questionCount = questions.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Questions & Answers</CardTitle>
                {questionCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{questionCount}</Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4 space-y-3">
            <AskQuestionInput
              onSubmit={(text) => askQuestion.mutate({ chapterId, moduleId, questionText: text })}
              isSubmitting={askQuestion.isPending}
            />

            {isLoading && <p className="text-sm text-muted-foreground">Loading questions...</p>}

            {!isLoading && questions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No questions yet. Be the first to ask!
              </p>
            )}

            <div className="space-y-2">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isTopQuestion={i === 0}
                  canManage={canManage}
                  onUpvote={() => toggleUpvote.mutate({ questionId: q.id, hasUpvoted: !!q.user_has_upvoted, chapterId })}
                  onAnswer={(text) => answerQuestion.mutate({ questionId: q.id, answerText: text, chapterId })}
                  onPin={() => togglePin.mutate({ questionId: q.id, isPinned: q.is_pinned, chapterId })}
                  onHide={() => hideQuestion.mutate({ questionId: q.id, chapterId })}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
