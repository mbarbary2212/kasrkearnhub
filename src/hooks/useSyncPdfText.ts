import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  characters: number;
  target: 'chapter' | 'topic';
  target_id: string;
}

export function useSyncPdfText() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const syncPdfText = async (params: { chapter_id?: string; topic_id?: string }): Promise<SyncResult | null> => {
    setIsSyncing(true);
    setProgress('Extracting text from PDF...');
    try {
      const { data, error } = await supabase.functions.invoke('sync-pdf-text', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) {
        if (data.code === 'NO_DOCUMENT') {
          toast.info('No PDF document linked to this ' + (params.chapter_id ? 'chapter' : 'topic'));
          return null;
        }
        throw new Error(data.error);
      }

      // Invalidate relevant queries
      if (params.chapter_id) {
        queryClient.invalidateQueries({ queryKey: ['chapter', params.chapter_id] });
      }
      if (params.topic_id) {
        queryClient.invalidateQueries({ queryKey: ['topic', params.topic_id] });
      }

      toast.success(`Extracted ${data.characters.toLocaleString()} characters from PDF`);
      return data as SyncResult;
    } catch (err: any) {
      console.error('PDF sync error:', err);
      toast.error(`Failed to sync PDF text: ${err.message}`);
      return null;
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  const bulkSync = async (documents: { id: string; chapter_id?: string | null; topic_id?: string | null }[]) => {
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const doc of documents) {
      const targetId = doc.chapter_id || doc.topic_id;
      if (!targetId) continue;

      setProgress(`Syncing ${synced + failed + 1} of ${documents.length}...`);
      
      try {
        const params = doc.chapter_id 
          ? { chapter_id: doc.chapter_id } 
          : { topic_id: doc.topic_id! };
        
        const { data, error } = await supabase.functions.invoke('sync-pdf-text', {
          body: params,
        });

        if (error || data?.error) {
          failed++;
        } else {
          synced++;
        }
      } catch {
        failed++;
      }
    }

    setIsSyncing(false);
    setProgress(null);

    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['chapter'] });
      queryClient.invalidateQueries({ queryKey: ['topic'] });
      toast.success(`Synced ${synced} PDFs${failed > 0 ? `, ${failed} failed` : ''}`);
    } else if (failed > 0) {
      toast.error(`All ${failed} PDF syncs failed`);
    }

    return { synced, failed };
  };

  return { syncPdfText, bulkSync, isSyncing, progress };
}
