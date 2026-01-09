import { useAllBadges, useUserBadges, useBadgeStats } from '@/hooks/useBadges';
import { BadgeCard } from './BadgeCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BadgesSectionProps {
  compact?: boolean;
}

export function BadgesSection({ compact = false }: BadgesSectionProps) {
  const { data: allBadges, isLoading: loadingBadges } = useAllBadges();
  const { data: userBadges, isLoading: loadingUserBadges } = useUserBadges();
  const { earned, total, recentBadges } = useBadgeStats();

  const isLoading = loadingBadges || loadingUserBadges;

  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-14 h-14 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {earned}/{total}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={(earned / total) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round((earned / total) * 100)}% of badges earned
            </p>
          </div>

          {/* Recent badges */}
          {recentBadges.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Recent</p>
              <div className="flex gap-3 justify-center">
                {recentBadges.map((ub) => (
                  <BadgeCard 
                    key={ub.id} 
                    badge={ub.badge} 
                    earned 
                    earnedAt={ub.earned_at}
                    size="md"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Start practicing to earn badges!
              </p>
            </div>
          )}

          {/* Next badges to unlock */}
          {allBadges && userBadges && earned < total && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Up Next</p>
              <div className="flex gap-3 justify-center">
                {allBadges
                  .filter(b => !earnedBadgeIds.has(b.id))
                  .slice(0, 3)
                  .map((badge) => (
                    <BadgeCard 
                      key={badge.id} 
                      badge={badge} 
                      earned={false}
                      size="sm"
                    />
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view - organized by category
  const categories = ['practice', 'correctness', 'streak', 'progress'] as const;
  const categoryLabels = {
    practice: 'Practice',
    correctness: 'Accuracy',
    streak: 'Streaks',
    progress: 'Progress',
  };

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="font-semibold">Your Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  {earned} of {total} badges earned
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {Math.round((earned / total) * 100)}%
            </div>
          </div>
          <Progress value={(earned / total) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Badges by category */}
      {categories.map((category) => {
        const categoryBadges = allBadges?.filter(b => b.category === category) || [];
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {categoryBadges.map((badge) => (
                  <div key={badge.id} className="flex flex-col items-center gap-2">
                    <BadgeCard 
                      badge={badge} 
                      earned={earnedBadgeIds.has(badge.id)}
                      earnedAt={userBadges?.find(ub => ub.badge_id === badge.id)?.earned_at}
                      size="lg"
                    />
                    <span className="text-xs text-muted-foreground text-center max-w-[80px] truncate">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
