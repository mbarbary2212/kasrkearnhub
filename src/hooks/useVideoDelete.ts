import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeleteState {
  id: string;
  title: string;
}

export function useVideoDelete(moduleId: string, chapterId?: string) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<DeleteState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      qc.setQueryData(["chapter-lectures", chapterId], removeFromList);
    }
    if (moduleId) {
      qc.setQueryData(["module-lectures", moduleId], removeFromList);
    }
    qc.setQueriesData({ queryKey: ["lectures"] }, removeFromList);

    try {
      // Soft delete - set is_deleted to true
      const { error } = await supabase
        .from("lectures")
        .update({ is_deleted: true })
        .eq("id", deletingId);

      if (error) throw error;

      // Refetch to ensure cache matches DB filters (is_deleted=false)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chapter-lectures", chapterId] }),
        qc.invalidateQueries({ queryKey: ["module-lectures", moduleId] }),
        qc.invalidateQueries({ queryKey: ["lectures"] }),
      ]);

      toast.success(`"${deletingTitle}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete video:", error);
      toast.error("Failed to delete video");

      // Roll back by refetching
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chapter-lectures", chapterId] }),
        qc.invalidateQueries({ queryKey: ["module-lectures", moduleId] }),
        qc.invalidateQueries({ queryKey: ["lectures"] }),
      ]);
    } finally {
      setIsDeleting(false);
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
  };
}
