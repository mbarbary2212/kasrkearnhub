import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ContentTable = 'lectures' | 'resources' | 'mcq_sets' | 'essays' | 'practicals' | 'clinical_cases';

export function useContentDelete(
  table: ContentTable,
  moduleId: string, 
  chapterId?: string
) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const askDelete = (id: string) => {
    setPendingId(id);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingId(null);
  };

  const doDelete = async () => {
    if (!pendingId) return;
    
    setIsDeleting(true);

    try {
      // Soft delete - set is_deleted to true
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true })
        .eq("id", pendingId);

      if (error) throw error;

      // Invalidate relevant queries
      await qc.invalidateQueries({ queryKey: [table] });
      await qc.invalidateQueries({ queryKey: [`chapter-${table}`, chapterId] });
      await qc.invalidateQueries({ queryKey: [`module-${table}`, moduleId] });
      // Also invalidate the specific query patterns used in hooks
      await qc.invalidateQueries({ queryKey: ['chapter-lectures', chapterId] });
      await qc.invalidateQueries({ queryKey: ['chapter-resources', chapterId] });
      await qc.invalidateQueries({ queryKey: ['chapter-mcq-sets', chapterId] });
      await qc.invalidateQueries({ queryKey: ['chapter-essays', chapterId] });
      await qc.invalidateQueries({ queryKey: ['chapter-practicals', chapterId] });

      toast.success("Item deleted successfully");
    } catch (error) {
      console.error(`Failed to delete ${table}:`, error);
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setPendingId(null);
    }
  };

  return { 
    askDelete, 
    doDelete, 
    cancelDelete, 
    confirmOpen, 
    isDeleting,
    pendingId 
  };
}
