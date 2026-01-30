import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useBadgeCelebration } from '@/contexts/BadgeCelebrationContext';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'practice' | 'correctness' | 'streak' | 'progress';
  icon_name: string;
  tier: number;
  threshold: number | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  metadata: Record<string, unknown> | null;
  badge?: Badge;
}

// Fetch all available badges
export function useAllBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('tier', { ascending: true })
        .order('category');

      if (error) throw error;
      return data as Badge[];
    },
  });
}

// Fetch user's earned badges
export function useUserBadges() {
  const { effectiveUserId } = useEffectiveUser();

  return useQuery({
    queryKey: ['user-badges', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', effectiveUserId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data as (UserBadge & { badge: Badge })[];
    },
    enabled: !!effectiveUserId,
  });
}

// Check and award badges based on user progress
export function useCheckBadges() {
  const { user } = useAuth();
  const { isSupportMode } = useEffectiveUser();
  const queryClient = useQueryClient();
  const { celebrateBadge } = useBadgeCelebration();

  return useMutation({
    mutationFn: async (context?: { 
      questionsAnswered?: number;
      correctStreak?: number;
      chapterScore?: number;
      videosWatched?: number;
      studyStreak?: number;
      moduleProgress?: number;
    }) => {
      if (!user?.id) return [];

      // Block writes in support mode (impersonation)
      if (isSupportMode) {
        return [];
      }

      // Get all badges and user's current badges
      const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
        supabase.from('badges').select('*'),
        supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
      ]);

      if (!allBadges) return [];

      const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
      const newBadges: Badge[] = [];

      // Get user stats from database
      const [
        { count: totalQuestions },
        { data: streakData },
        { count: videosWatched },
      ] = await Promise.all([
        supabase
          .from('question_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('user_sessions')
          .select('session_start')
          .eq('user_id', user.id)
          .order('session_start', { ascending: false })
          .limit(30),
        supabase
          .from('video_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('progress_percent', 80),
      ]);

      // Calculate study streak (consecutive days with sessions)
      let studyStreak = 0;
      if (streakData && streakData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sessionDates = streakData.map(s => {
          const d = new Date(s.session_start);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        });
        
        const uniqueDates = [...new Set(sessionDates)].sort((a, b) => b - a);
        
        for (let i = 0; i < uniqueDates.length; i++) {
          const expectedDate = new Date(today);
          expectedDate.setDate(expectedDate.getDate() - i);
          expectedDate.setHours(0, 0, 0, 0);
          
          if (uniqueDates[i] === expectedDate.getTime()) {
            studyStreak++;
          } else {
            break;
          }
        }
      }

      // Check each badge
      for (const badge of allBadges) {
        if (earnedBadgeIds.has(badge.id)) continue;

        let shouldAward = false;

        switch (badge.code) {
          // Practice badges
          case 'first_question':
            shouldAward = (totalQuestions || 0) >= 1;
            break;
          case 'questions_50':
            shouldAward = (totalQuestions || 0) >= 50;
            break;
          case 'questions_100':
            shouldAward = (totalQuestions || 0) >= 100;
            break;
          case 'questions_500':
            shouldAward = (totalQuestions || 0) >= 500;
            break;

          // Correctness badges (from context)
          case 'correct_streak_5':
            shouldAward = (context?.correctStreak || 0) >= 5;
            break;
          case 'correct_streak_10':
            shouldAward = (context?.correctStreak || 0) >= 10;
            break;
          case 'accuracy_80':
            shouldAward = (context?.chapterScore || 0) >= 80;
            break;
          case 'perfect_score':
            shouldAward = (context?.chapterScore || 0) >= 100;
            break;

          // Streak badges
          case 'streak_3':
            shouldAward = studyStreak >= 3;
            break;
          case 'streak_7':
            shouldAward = studyStreak >= 7;
            break;
          case 'streak_30':
            shouldAward = studyStreak >= 30;
            break;

          // Progress badges
          case 'first_video':
            shouldAward = (videosWatched || 0) >= 1;
            break;
          case 'videos_10':
            shouldAward = (videosWatched || 0) >= 10;
            break;
          case 'coverage_50':
            shouldAward = (context?.moduleProgress || 0) >= 50;
            break;
          case 'module_complete':
            shouldAward = (context?.moduleProgress || 0) >= 100;
            break;
        }

        if (shouldAward) {
          const { error } = await supabase
            .from('user_badges')
            .insert({ user_id: user.id, badge_id: badge.id });

          if (!error) {
            newBadges.push(badge as Badge);
          }
        }
      }

      return newBadges;
    },
    onSuccess: (newBadges) => {
      if (newBadges && newBadges.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-badges'] });
        
        // Trigger celebration animation for each new badge
        newBadges.forEach((badge) => {
          celebrateBadge(badge);
        });
      }
    },
  });
}

// Get badge statistics
export function useBadgeStats() {
  const { data: allBadges } = useAllBadges();
  const { data: userBadges } = useUserBadges();

  const earned = userBadges?.length || 0;
  const total = allBadges?.length || 0;
  const recentBadges = userBadges?.slice(0, 3) || [];

  const byCategory = {
    practice: { earned: 0, total: 0 },
    correctness: { earned: 0, total: 0 },
    streak: { earned: 0, total: 0 },
    progress: { earned: 0, total: 0 },
  };

  allBadges?.forEach((badge) => {
    byCategory[badge.category].total++;
  });

  userBadges?.forEach((ub) => {
    if (ub.badge) {
      byCategory[ub.badge.category].earned++;
    }
  });

  return { earned, total, recentBadges, byCategory };
}
