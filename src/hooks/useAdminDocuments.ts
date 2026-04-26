import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdminDocument {
  id: string;
  title: string;
  description: string | null;
  doc_type: string;
  module_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  module?: { id: string; name: string; slug: string; year_id?: string | null } | null;
  chapter?: { id: string; title: string } | null;
}

export interface UploadDocumentParams {
  file: File;
  title: string;
  description?: string;
  doc_type?: string;
  module_id?: string;
  chapter_id?: string;
  topic_id?: string;
  tags?: string[];
}

export function useAdminDocuments(filters?: {
  search?: string;
  module_id?: string;
  chapter_id?: string;
  doc_type?: string;
  module_ids?: string[]; // For module admins - filter to their modules only
}) {
  const { isPlatformAdmin, isSuperAdmin, isModuleAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['admin-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('admin_documents')
        .select(`
          *,
          module:modules(id, name, slug, year_id),
          chapter:module_chapters(id, title)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      // For module admins, filter to only their assigned modules
      if (filters?.module_ids && filters.module_ids.length > 0 && !isSuperAdmin && !isPlatformAdmin) {
        query = query.in('module_id', filters.module_ids);
      }

      if (filters?.module_id) {
        query = query.eq('module_id', filters.module_id);
      }
      if (filters?.chapter_id) {
        query = query.eq('chapter_id', filters.chapter_id);
      }
      if (filters?.doc_type) {
        query = query.eq('doc_type', filters.doc_type);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdminDocument[];
    },
    enabled: isPlatformAdmin || isSuperAdmin || isModuleAdmin,
  });
}

export function useUploadAdminDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      const { file, title, description, doc_type, module_id, chapter_id, topic_id, tags } = params;

      // Get module slug for path if module_id is provided
      let moduleSlug = 'general';
      if (module_id) {
        const { data: module } = await supabase
          .from('modules')
          .select('slug')
          .eq('id', module_id)
          .single();
        moduleSlug = module?.slug || 'general';
      }

      // Build storage path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `books/${moduleSlug}/${chapter_id || 'general'}/${timestamp}_${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('admin-pdfs')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert metadata row
      const { data, error: insertError } = await supabase
        .from('admin_documents')
        .insert({
          title,
          description: description || null,
          doc_type: doc_type || 'chapter_pdf',
          module_id: module_id || null,
          chapter_id: chapter_id || null,
          topic_id: topic_id || null,
          storage_bucket: 'admin-pdfs',
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          tags: tags || [],
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup: delete uploaded file if metadata insert fails
        await supabase.storage.from('admin-pdfs').remove([storagePath]);
        throw insertError;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document uploaded successfully');
      
      // Auto-trigger PDF text sync for chapters and topics
      const targetId = variables.chapter_id || variables.topic_id;
      if (targetId) {
        const params = variables.chapter_id 
          ? { chapter_id: variables.chapter_id }
          : { topic_id: variables.topic_id };
        
        supabase.functions.invoke('sync-pdf-text', { body: params })
          .then(({ data: syncData, error: syncError }) => {
            if (syncError || syncData?.error) {
              console.warn('Auto PDF sync failed:', syncError || syncData?.error);
            } else {
              console.log(`Auto-synced PDF text: ${syncData?.characters} chars`);
              if (variables.chapter_id) {
                queryClient.invalidateQueries({ queryKey: ['chapter', variables.chapter_id] });
              }
            }
          });
      }
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

export function useDeleteAdminDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Soft delete - just mark as deleted
      const { error } = await supabase
        .from('admin_documents')
        .update({ is_deleted: true })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

export function useUpdateAdminDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; title?: string; description?: string; doc_type?: string; module_id?: string | null; chapter_id?: string | null; topic_id?: string | null; tags?: string[] }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('admin_documents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document updated');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

export function useSignedUrl(storagePath: string | null, download?: boolean | string) {
  return useQuery({
    queryKey: ['signed-url', storagePath, download],
    queryFn: async () => {
      if (!storagePath) return null;
      
      const { data, error } = await supabase.storage
        .from('admin-pdfs')
        .createSignedUrl(storagePath, 3600, download ? { download } : undefined); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!storagePath,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export async function getSignedUrl(storagePath: string, download?: boolean | string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('admin-pdfs')
    .createSignedUrl(storagePath, 3600, download ? { download } : undefined);
  
  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  return data.signedUrl;
}
