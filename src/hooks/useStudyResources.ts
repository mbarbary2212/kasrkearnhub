import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StudyResourceType = 
  | 'flashcard' 
  | 'table' 
  | 'algorithm' 
  | 'exam_tip' 
  | 'key_image'
  | 'mind_map'
  | 'clinical_case_worked';

export interface FlashcardContent {
  front: string;
  back: string;
}

export interface TableContent {
  headers: string[];
  rows: string[][];
}

export interface AlgorithmContent {
  steps: { title: string; description: string }[];
}

export interface ExamTipContent {
  tips: string[];
}

export interface KeyImageContent {
  imageUrl: string;
  caption: string;
  labels?: string[];
}

// NEW: Mind Map content - visual PDF/image uploads
export interface MindMapContent {
  imageUrl: string;
  description?: string;
}

// NEW: Clinical Case Worked Solutions - structured 8-section format
export interface ClinicalCaseWorkedContent {
  history: string;
  clinical_examination: string;
  provisional_diagnosis: string;
  differential_diagnosis: string[];
  investigations: { test: string; justification: string }[];
  final_diagnosis: string;
  management_plan: string;
  key_learning_points: string[];
}

export type ResourceContent = 
  | FlashcardContent 
  | TableContent 
  | AlgorithmContent 
  | ExamTipContent 
  | KeyImageContent
  | MindMapContent
  | ClinicalCaseWorkedContent;

export interface StudyResource {
  id: string;
  module_id: string;
  chapter_id: string;
  resource_type: StudyResourceType;
  title: string;
  content: ResourceContent;
  display_order: number | null;
  is_deleted: boolean;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface StudyResourceInsert {
  module_id: string;
  chapter_id: string;
  resource_type: StudyResourceType;
  title: string;
  content: ResourceContent;
  display_order?: number;
  created_by?: string;
}

// Fetch study resources for a chapter (optionally include deleted)
export function useChapterStudyResources(chapterId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['study-resources', 'chapter', chapterId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('study_resources')
        .select('*')
        .eq('chapter_id', chapterId!)
        .order('resource_type')
        .order('display_order');

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as StudyResource[];
    },
    enabled: !!chapterId,
  });
}

// Fetch study resources by type for a chapter
export function useChapterStudyResourcesByType(chapterId?: string, resourceType?: StudyResourceType) {
  return useQuery({
    queryKey: ['study-resources', 'chapter', chapterId, 'type', resourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_resources')
        .select('*')
        .eq('chapter_id', chapterId!)
        .eq('resource_type', resourceType!)
        .eq('is_deleted', false)
        .order('display_order');
      
      if (error) throw error;
      return data as unknown as StudyResource[];
    },
    enabled: !!chapterId && !!resourceType,
  });
}

// Fetch study settings (disclaimer)
export function useStudySettings() {
  return useQuery({
    queryKey: ['study-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('*');
      
      if (error) throw error;
      return data as { id: string; key: string; value: string }[];
    },
  });
}

// Fetch the hide_empty_self_assessment_tabs setting
export function useHideEmptySelfAssessmentTabs() {
  return useQuery({
    queryKey: ['study-settings', 'hide_empty_self_assessment_tabs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', 'hide_empty_self_assessment_tabs')
        .maybeSingle();
      
      if (error) throw error;
      return data?.value === 'true';
    },
  });
}

// Create or update a study setting (upsert)
export function useUpsertStudySetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Try update first
      const { data: existingData } = await supabase
        .from('study_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existingData) {
        const { data, error } = await supabase
          .from('study_settings')
          .update({ value, updated_by: userData.user?.id, updated_at: new Date().toISOString() })
          .eq('key', key)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('study_settings')
          .insert({ key, value, updated_by: userData.user?.id })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['study-settings'] });
      queryClient.invalidateQueries({ queryKey: ['study-settings', variables.key] });
    },
  });
}

export function useStudyDisclaimer() {
  return useQuery({
    queryKey: ['study-settings', 'disclaimer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_settings')
        .select('value')
        .eq('key', 'disclaimer')
        .single();
      
      if (error) throw error;
      return data?.value || '';
    },
  });
}

// Create study resource
export function useCreateStudyResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (resource: StudyResourceInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      const insertData = {
        module_id: resource.module_id,
        chapter_id: resource.chapter_id,
        resource_type: resource.resource_type,
        title: resource.title,
        content: resource.content,
        display_order: resource.display_order,
        created_by: userData.user?.id,
      };
      
      const { data, error } = await supabase
        .from('study_resources')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data.chapter_id] });
    },
  });
}

// Bulk create study resources
export function useBulkCreateStudyResources() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (resources: StudyResourceInsert[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const resourcesWithUser = resources.map((r) => ({
        module_id: r.module_id,
        chapter_id: r.chapter_id,
        resource_type: r.resource_type,
        title: r.title,
        content: r.content,
        display_order: r.display_order,
        created_by: userData.user?.id,
      }));
      
      const { data, error } = await supabase
        .from('study_resources')
        .insert(resourcesWithUser as never)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data[0].chapter_id] });
      }
    },
  });
}

// Update study resource
export function useUpdateStudyResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudyResource> & { id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_by: userData.user?.id,
      };
      
      if (updates.content) {
        updateData.content = updates.content as unknown as Record<string, unknown>;
      }
      
      const { data, error } = await supabase
        .from('study_resources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data.chapter_id] });
    },
  });
}

// Delete study resource (soft delete)
export function useDeleteStudyResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, chapterId }: { id: string; chapterId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('study_resources')
        .update({ is_deleted: true, updated_by: userData.user?.id })
        .eq('id', id);
      
      if (error) throw error;
      return { id, chapterId };
    },
    onSuccess: (data) => {
      // Invalidate all study-resources queries for this chapter (with and without includeDeleted param)
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data.chapterId] });
    },
  });
}

// Restore study resource (undo soft delete)
export function useRestoreStudyResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, chapterId }: { id: string; chapterId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('study_resources')
        .update({ is_deleted: false, updated_by: userData.user?.id })
        .eq('id', id);
      
      if (error) throw error;
      return { id, chapterId };
    },
    onSuccess: (data) => {
      // Invalidate all study-resources queries for this chapter
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data.chapterId] });
    },
  });
}

// Update study setting (disclaimer)
export function useUpdateStudySetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('study_settings')
        .update({ value, updated_by: userData.user?.id })
        .eq('key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-settings'] });
    },
  });
}

// Reorder resources
export function useReorderStudyResources() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ resources, chapterId }: { resources: { id: string; display_order: number }[]; chapterId: string }) => {
      const promises = resources.map((r) =>
        supabase
          .from('study_resources')
          .update({ display_order: r.display_order })
          .eq('id', r.id)
      );
      
      await Promise.all(promises);
      return { chapterId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-resources', 'chapter', data.chapterId] });
    },
  });
}
