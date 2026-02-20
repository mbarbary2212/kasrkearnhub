import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ContentTable = 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals';

type QueryKeyMap = {
  topic: string;
  chapter: string;
  module: string;
};

const QUERY_KEYS: Record<ContentTable, QueryKeyMap> = {
  lectures: { topic: 'lectures', chapter: 'chapter-lectures', module: 'module-lectures' },
  resources: { topic: 'resources', chapter: 'chapter-resources', module: 'module-resources' },
  mcq_sets: { topic: 'mcq_sets', chapter: 'chapter-mcq-sets', module: 'module-mcq-sets' },
  essays: { topic: 'essays', chapter: 'chapter-essays', module: 'module-essays' },
  practicals: { topic: 'practicals', chapter: 'chapter-practicals', module: 'module-practicals' },
};

const TABLE_LABELS: Record<ContentTable, string> = {
  lectures: 'Video',
  resources: 'Resource',
  mcq_sets: 'MCQ set',
  essays: 'Short question',
  practicals: 'Practical',
};

interface DeleteState {
  id: string;
  title: string;
}

export function useContentDelete(
  table: ContentTable,
  moduleId: string,
  chapterId?: string,
) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<DeleteState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const label = TABLE_LABELS[table];
  const keys = QUERY_KEYS[table];

  const askDelete = (id: string, title: string) => {
    setPendingItem({ id, title });
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingItem(null);
  };

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: [keys.chapter, chapterId] }),
      qc.invalidateQueries({ queryKey: [keys.module, moduleId] }),
      qc.invalidateQueries({ queryKey: [keys.topic] }),
    ]);
  };

  const doDelete = async () => {
    if (!pendingItem) return;

    const deletingId = pendingItem.id;
    const deletingTitle = pendingItem.title;

    setIsDeleting(true);

    // Close modal immediately to prevent grey overlay freeze
    setConfirmOpen(false);

    // Optimistically remove from any cached lists (instant UI update)
    const removeFromList = (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.filter((item: any) => item?.id !== deletingId);
    };

    if (chapterId) {
      qc.setQueryData([keys.chapter, chapterId], removeFromList);
    }
    if (moduleId) {
      qc.setQueryData([keys.module, moduleId], removeFromList);
    }
    qc.setQueriesData({ queryKey: [keys.topic] }, removeFromList);

    try {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true })
        .eq('id', deletingId);

      if (error) throw error;

      await invalidateAll();

      toast.success(`"${deletingTitle}" deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete ${table}:`, error);
      toast.error(`Failed to delete ${label.toLowerCase()}`);

      // Roll back by refetching
      await invalidateAll();
    } finally {
      setIsDeleting(false);
      setPendingItem(null);
    }
  };

  const doRestore = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: false })
        .eq('id', id);

      if (error) throw error;

      await invalidateAll();

      toast.success(`"${title}" restored successfully`);
    } catch (error) {
      console.error(`Failed to restore ${table}:`, error);
      toast.error(`Failed to restore ${label.toLowerCase()}`);
    }
  };

  return {
    askDelete,
    doDelete,
    doRestore,
    cancelDelete,
    confirmOpen,
    isDeleting,
    pendingItem,
    label,
  };
}
