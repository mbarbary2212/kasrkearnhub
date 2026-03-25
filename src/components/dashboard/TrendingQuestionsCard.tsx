import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircleQuestion, ThumbsUp, ArrowRight } from 'lucide-react';
import { useTrendingQuestions } from '@/hooks/useChapterQuestions';
import { formatDistanceToNow } from 'date-fns';

interface TrendingQuestionsCardProps {
  moduleId?: string;
  onNavigate: (moduleId: string, chapterId: string) => void;
}

export function TrendingQuestionsCard({ moduleId, onNavigate }: TrendingQuestionsCardProps) {
  const { data: questions = [] } = useTrendingQuestions(moduleId);

  if (questions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Trending Questions</CardTitle>
          <Badge variant="secondary" className="text-xs">{questions.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-2">
        {questions.map((q: any) => (
          <div
            key={q.id}
            className="flex items-start justify-between gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors group"
            onClick={() => onNavigate(q.module_id, q.chapter_id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2">{q.question_text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {q.chapter_title} · {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                <span className="text-xs">{q.upvote_count}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
