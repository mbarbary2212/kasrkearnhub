import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ContentTable = 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals' | 'clinical_cases';

const TABLE_LABELS: Record<ContentTable, string> = {
  lectures: 'Video',
  resources: 'Resource',
  mcq_sets: 'MCQ set',
  essays: 'Short question',
  practicals: 'Practical',
  clinical_cases: 'Clinical case',
};

interface DeleteState {
  id: string;
  title: string;
}

export function useContentDelete(
  table: ContentTable,
  moduleId: string, 
  chapterId?: string
) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<DeleteState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const label = TABLE_LABELS[table];

  const askDelete = (id: string, title: string) => {
    setPendingItem({ id, title });
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingItem(null);
  };

  const doDelete = async () => {
    if (!pendingItem) return;
    
    setIsDeleting(true);

    try {
      // Soft delete - set is_deleted to true
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true })
        .eq("id", pendingItem.id);

      if (error) throw error;

      // Invalidate all relevant queries to refetch
      const queryKey = table === 'mcq_sets' ? 'mcq-sets' : table;
      
      await Promise.all([
        qc.invalidateQueries({ queryKey: [table] }),
        qc.invalidateQueries({ queryKey: [`chapter-${queryKey}`, chapterId] }),
        qc.invalidateQueries({ queryKey: [`module-${queryKey}`, moduleId] }),
        // Also invalidate with generic patterns
        qc.invalidateQueries({ queryKey: ['chapter-lectures', chapterId] }),
        qc.invalidateQueries({ queryKey: ['chapter-resources', chapterId] }),
        qc.invalidateQueries({ queryKey: ['chapter-mcq-sets', chapterId] }),
        qc.invalidateQueries({ queryKey: ['chapter-essays', chapterId] }),
        qc.invalidateQueries({ queryKey: ['chapter-practicals', chapterId] }),
      ]);

      toast.success(`"${pendingItem.title}" deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete ${table}:`, error);
      toast.error(`Failed to delete ${label.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setPendingItem(null);
    }
  };

  return { 
    askDelete, 
    doDelete, 
    cancelDelete, 
    confirmOpen, 
    isDeleting,
    pendingItem,
    label,
  };
}
