import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ExamEntry {
  module_id: string;
  module_name: string;
  exam_date: string;
}

export interface RotationEntry {
  department: string;
  start_date: string;
  end_date: string;
}

export interface StudentGoals {
  id: string;
  user_id: string;
  ambition_level: string | null;
  weekday_hours: number | null;
  weekend_hours: number | null;
  daily_hours: number | null;
  ambition_hint_dismissed: boolean;
  exam_schedule: ExamEntry[];
  rotation_schedule: RotationEntry[];
  goals_onboarding_shown: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'student-goals';

export function useStudentGoals() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StudentGoals | null> => {
      const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        exam_schedule: (data.exam_schedule as unknown as ExamEntry[]) ?? [],
        rotation_schedule: (data.rotation_schedule as unknown as RotationEntry[]) ?? [],
        goals_onboarding_shown: data.goals_onboarding_shown ?? false,
        daily_hours: (data as any).daily_hours ?? null,
        ambition_hint_dismissed: (data as any).ambition_hint_dismissed ?? false,
      } as StudentGoals;
    },
  });
}

export function useUpsertStudentGoals() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<StudentGoals, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('student_goals')
        .upsert(
          { user_id: user.id, ...updates } as any,
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
    },
  });
}

export function computeGoalsProgress(goals: StudentGoals | null): number {
  if (!goals) return 0;
  let pct = 0;
  if (goals.ambition_level) pct += 30;
  if (goals.daily_hours != null) pct += 30;
  if (goals.exam_schedule.length > 0) pct += 20;
  if (goals.rotation_schedule.length > 0) pct += 20;
  return pct;
}

export const ROTATION_DEPARTMENTS = [
  'Internal Medicine',
  'General Surgery',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Neurology',
  'Psychiatry',
  'Orthopedics',
  'Ophthalmology',
  'ENT',
  'Dermatology',
  'Radiology',
  'Emergency Medicine',
  'Family Medicine',
  'ICU',
  'Community Medicine',
];
