import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SUPABASE_URL } from '@/lib/supabaseUrl';

export interface StepResult {
  content_type: string;
  step_index: number;
  started_at: string;
  finished_at: string | null;
  status: 'pending' | 'generating' | 'approving' | 'completed' | 'failed';
  generated_count: number;
  inserted_count: number;
  duplicate_count: number;
  approved_count: number;
  job_id: string | null;
  error_message: string | null;
  target_table: string;
  module_id: string;
  chapter_id: string | null;
}

export interface AIBatchJob {
  id: string;
  document_id: string | null;
  admin_id: string;
  module_id: string;
  chapter_id: string | null;
  content_types: string[];
  quantities: Record<string, number>;
  per_section: boolean | null;
  current_step: number;
  total_steps: number;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  auto_approve: boolean;
  stop_on_failure: boolean;
  job_ids: string[] | null;
  duplicate_stats: Record<string, { total: number; duplicates: number }> | null;
  step_results: StepResult[] | null;
  error_message: string | null;
  additional_instructions: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  // Joined data
  module?: { name: string; slug: string };
  chapter?: { title: string };
  document?: { title: string };
}

export function useAIBatchJobs(moduleId?: string) {
  return useQuery({
    queryKey: ['ai-batch-jobs', moduleId],
    queryFn: async () => {
      let query = supabase
        .from('ai_batch_jobs')
        .select(`
          *,
          module:modules(name, slug),
          chapter:module_chapters(title),
          document:admin_documents(title)
        `)
        .order('created_at', { ascending: false });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Type casting with proper handling
      return (data || []).map(job => ({
        ...job,
        content_types: job.content_types as string[],
        quantities: job.quantities as Record<string, number>,
        job_ids: job.job_ids as string[] | null,
        duplicate_stats: job.duplicate_stats as Record<string, { total: number; duplicates: number }> | null,
        step_results: (job.step_results as unknown) as StepResult[] | null,
        stop_on_failure: job.stop_on_failure ?? true,
      })) as AIBatchJob[];
    },
  });
}

export function useAIBatchJob(jobId: string) {
  return useQuery({
    queryKey: ['ai-batch-jobs', 'detail', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_batch_jobs')
        .select(`
          *,
          module:modules(name, slug),
          chapter:module_chapters(title),
          document:admin_documents(title)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        content_types: data.content_types as string[],
        quantities: data.quantities as Record<string, number>,
        job_ids: data.job_ids as string[] | null,
        duplicate_stats: data.duplicate_stats as Record<string, { total: number; duplicates: number }> | null,
        step_results: (data.step_results as unknown) as StepResult[] | null,
        stop_on_failure: data.stop_on_failure ?? true,
      } as AIBatchJob;
    },
    enabled: !!jobId,
  });
}

interface CreateBatchJobInput {
  document_id?: string;
  module_id: string;
  chapter_id?: string;
  content_types: string[];
  quantities: Record<string, number>;
  per_section?: boolean;
  auto_approve?: boolean;
  stop_on_failure?: boolean;
  additional_instructions?: string;
}

export function useCreateBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBatchJobInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate total steps (one per content type, or content_types × sections if per_section)
      let totalSteps = input.content_types.length;
      
      if (input.per_section && input.chapter_id) {
        const { count } = await supabase
          .from('sections')
          .select('*', { count: 'exact', head: true })
          .eq('chapter_id', input.chapter_id);
        
        totalSteps = input.content_types.length * (count || 1);
      }

      const { data, error } = await supabase
        .from('ai_batch_jobs')
        .insert({
          admin_id: user.id,
          document_id: input.document_id || null,
          module_id: input.module_id,
          chapter_id: input.chapter_id || null,
          content_types: input.content_types,
          quantities: input.quantities,
          per_section: input.per_section ?? false,
          auto_approve: input.auto_approve ?? false,
          stop_on_failure: input.stop_on_failure ?? true,
          additional_instructions: input.additional_instructions || null,
          total_steps: totalSteps,
          status: 'pending',
          step_results: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-batch-jobs'] });
      toast.success('Batch job created successfully');
    },
    onError: (error) => {
      console.error('Error creating batch job:', error);
      toast.error('Failed to create batch job');
    },
  });
}

export function useStartBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/process-batch-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ batch_id: jobId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start batch job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-batch-jobs'] });
      toast.success('Batch job started');
    },
    onError: (error) => {
      console.error('Error starting batch job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start batch job');
    },
  });
}

export function useCancelBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase
        .from('ai_batch_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .in('status', ['pending', 'paused'])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-batch-jobs'] });
      toast.success('Batch job cancelled');
    },
    onError: (error) => {
      console.error('Error cancelling batch job:', error);
      toast.error('Failed to cancel batch job');
    },
  });
}

export function useRetryBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      // Reset status to pending to allow retry
      const { data, error } = await supabase
        .from('ai_batch_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          step_results: [],
        })
        .eq('id', jobId)
        .eq('status', 'failed')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-batch-jobs'] });
      toast.success('Batch job reset for retry');
    },
    onError: (error) => {
      console.error('Error retrying batch job:', error);
      toast.error('Failed to retry batch job');
    },
  });
}

export function useDeleteBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('ai_batch_jobs')
        .delete()
        .eq('id', jobId)
        .in('status', ['pending', 'completed', 'failed', 'cancelled']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-batch-jobs'] });
      toast.success('Batch job deleted');
    },
    onError: (error) => {
      console.error('Error deleting batch job:', error);
      toast.error('Failed to delete batch job');
    },
  });
}
