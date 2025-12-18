import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useVideoDelete(moduleId: string, chapterId?: string) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const askDelete = (videoId: string) => {
    setPendingId(videoId);
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
        .from("lectures")
        .update({ is_deleted: true })
        .eq("id", pendingId);

      if (error) throw error;

      // Invalidate queries to refetch
      await qc.invalidateQueries({ queryKey: ["lectures"] });
      await qc.invalidateQueries({ queryKey: ["chapter-lectures", chapterId] });
      await qc.invalidateQueries({ queryKey: ["module-lectures", moduleId] });

      toast.success("Video deleted successfully");
    } catch (error) {
      console.error("Failed to delete video:", error);
      toast.error("Failed to delete video");
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
