import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, ChevronRight, CheckCircle2, Clock, MessageSquareText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MyQuestionsCardProps {
  moduleId?: string;
}

interface UserInquiry {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  latestReply?: string | null;
}

function useMyQuestions(moduleId?: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['my-questions', user?.id, moduleId],
    queryFn: async (): Promise<UserInquiry[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('inquiries')
        .select('id, subject, status, created_at, admin_notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const inquiries = data || [];
      if (inquiries.length === 0) return [];

      // Fetch latest reply for each inquiry
      const ids = inquiries.map(i => i.id);
      const { data: replies } = await supabase
        .from('admin_replies')
        .select('thread_id, message, created_at')
        .eq('thread_type', 'inquiry')
        .in('thread_id', ids)
        .order('created_at', { ascending: false });

      const latestReplyMap: Record<string, string> = {};
      for (const r of replies || []) {
        if (!latestReplyMap[r.thread_id]) {
          latestReplyMap[r.thread_id] = r.message;
        }
      }

      return inquiries.map(i => ({
        ...i,
        latestReply: latestReplyMap[i.id] || null,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

export function MyQuestionsCard({ moduleId }: MyQuestionsCardProps) {
  const { data: questions, isLoading } = useMyQuestions(moduleId);
  const [expanded, setExpanded] = useState(false);

  const unansweredCount = (questions || []).filter(
    q => q.status === 'open' || q.status === 'in_review'
  ).length;

  const displayQuestions = expanded ? questions : (questions || []).slice(0, 3);

  return (
    <Card className="sm:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <MessageSquareText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">My Questions</CardTitle>
                {unansweredCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                    {unansweredCount}
                  </Badge>
                )}
              </div>
              <CardDescription>Track your submitted questions and replies</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !questions || questions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No questions submitted yet. Use "Ask a Question" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {displayQuestions?.map(q => (
              <div
                key={q.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                {q.status === 'resolved' || q.status === 'closed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{q.subject}</span>
                    <Badge
                      variant={q.status === 'resolved' || q.status === 'closed' ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {q.status === 'resolved' || q.status === 'closed' ? 'Answered' : 'Pending'}
                    </Badge>
                  </div>
                  {q.latestReply && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      💬 {q.latestReply}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {(questions.length > 3) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary font-medium hover:underline w-full text-center pt-1"
              >
                {expanded ? 'Show less' : `View all ${questions.length} questions`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
