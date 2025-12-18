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
    
    setIsDeleting(true);

    try {
      // Soft delete - set is_deleted to true
      const { error } = await supabase
        .from("lectures")
        .update({ is_deleted: true })
        .eq("id", pendingItem.id);

      if (error) throw error;

      // Invalidate all relevant queries to refetch
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["lectures"] }),
        qc.invalidateQueries({ queryKey: ["chapter-lectures", chapterId] }),
        qc.invalidateQueries({ queryKey: ["module-lectures", moduleId] }),
      ]);

      toast.success(`"${pendingItem.title}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete video:", error);
      toast.error("Failed to delete video");
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
  };
}
