import { useNavigate } from 'react-router-dom';
import { useBadgeStats, useAllBadges, useUserBadges } from '@/hooks/useBadges';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Zap, Target, Award, Medal, Flame, BookOpen, ChevronRight, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  award: Award,
  medal: Medal,
  flame: Flame,
  'book-open': BookOpen,
};

const categoryColors: Record<string, string> = {
  practice: 'bg-primary/10 text-primary',
  correctness: 'bg-accent/10 text-accent',
  streak: 'bg-orange-500/10 text-orange-500',
  progress: 'bg-purple-500/10 text-purple-500',
};

interface HeaderBadgesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HeaderBadgesPanel({ open, onOpenChange }: HeaderBadgesPanelProps) {
  const navigate = useNavigate();
  const { earned, total, recentBadges, byCategory } = useBadgeStats();
  const { data: allBadges, isLoading: loadingAll } = useAllBadges();
  const { data: userBadges, isLoading: loadingUser } = useUserBadges();

  const isLoading = loadingAll || loadingUser;
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

  // Get next badges to unlock (not earned yet)
  const earnedIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
  const nextBadges = allBadges?.filter(b => !earnedIds.has(b.id)).slice(0, 3) || [];

  const handleViewAll = () => {
    onOpenChange(false);
    navigate('/account?tab=achievements');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] flex flex-col overflow-hidden">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Achievements
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-6">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {isLoading ? '...' : `${earned}/${total} badges`}
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-2 w-full" />
            ) : (
              <Progress value={percentage} className="h-2" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              {percentage}% Complete
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(byCategory).map(([category, stats]) => (
              <div 
                key={category}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className={`p-1.5 rounded-md ${categoryColors[category]}`}>
                  {category === 'practice' && <Target className="h-4 w-4" />}
                  {category === 'correctness' && <Star className="h-4 w-4" />}
                  {category === 'streak' && <Flame className="h-4 w-4" />}
                  {category === 'progress' && <BookOpen className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium capitalize truncate">{category}</p>
                  <p className="text-xs text-muted-foreground">{stats.earned}/{stats.total}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Badges */}
          {recentBadges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                Recently Earned
              </h3>
              <div className="space-y-2">
                {recentBadges.map((ub) => {
                  const badge = ub.badge;
                  if (!badge) return null;
                  const IconComponent = iconMap[badge.icon_name] || Trophy;
                  return (
                    <div 
                      key={ub.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Badges to Unlock */}
          {nextBadges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Next to Unlock
              </h3>
              <div className="space-y-2">
                {nextBadges.map((badge) => {
                  const IconComponent = iconMap[badge.icon_name] || Trophy;
                  return (
                    <div 
                      key={badge.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {badge.category}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View All Button */}
          <Button 
            onClick={handleViewAll} 
            variant="outline" 
            className="w-full mt-4"
          >
            View All Achievements
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
