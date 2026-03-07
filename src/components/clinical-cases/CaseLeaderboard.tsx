import { Trophy, Medal, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCaseLeaderboard } from '@/hooks/useCaseLeaderboard';
import { useAuthContext } from '@/contexts/AuthContext';

const rankIcons: Record<number, React.ReactNode> = {
  1: <Crown className="w-4 h-4 text-yellow-500" />,
  2: <Medal className="w-4 h-4 text-gray-400" />,
  3: <Medal className="w-4 h-4 text-amber-600" />,
};

const rankColors: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  2: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300',
  3: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

interface CaseLeaderboardProps {
  caseId: string;
}

export function CaseLeaderboard({ caseId }: CaseLeaderboardProps) {
  const { data: leaderboard, isLoading } = useCaseLeaderboard(caseId);
  const { user } = useAuthContext();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Be the first to complete this case and claim the top spot! 🏆
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                  isCurrentUser
                    ? 'bg-primary/10 ring-1 ring-primary/20'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7">
                    {rankIcons[entry.rank] || (
                      <span className="text-xs font-bold text-muted-foreground">
                        #{entry.rank}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${isCurrentUser ? 'text-primary' : ''}`}>
                    {isCurrentUser ? `${entry.display_name} (You)` : entry.display_name}
                  </span>
                </div>
                <Badge
                  className={`text-xs ${
                    rankColors[entry.rank] || 'bg-muted text-muted-foreground'
                  }`}
                  variant="secondary"
                >
                  {Math.round(entry.best_score)}%
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
