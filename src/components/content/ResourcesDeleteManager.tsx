import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type ResourceKind = "flashcard" | "table" | "algorithm" | "exam_tip" | "key_image";

export type PendingDelete = {
  kind: ResourceKind;
  id: string;
  label?: string;
} | null;

function hardCleanupOverlay() {
  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.removeAttribute("data-scroll-locked");
}

interface ResourcesDeleteManagerProps {
  deleteResource: (kind: ResourceKind, id: string) => Promise<void>;
  refetchResources: () => Promise<void>;
}

export function ResourcesDeleteManager({
  deleteResource,
  refetchResources,
}: ResourcesDeleteManagerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingDelete>(null);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setError(null);
    setPending(null);
    setTimeout(hardCleanupOverlay, 50);
  }, []);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, busy]);

  // Expose requestDelete globally
  const requestDelete = useCallback((p: PendingDelete) => {
    setPending(p);
    setError(null);
    setOpen(true);
  }, []);

  // Make it available globally for child components
  useEffect(() => {
    (window as any).__requestResourceDelete = requestDelete;
    return () => {
      delete (window as any).__requestResourceDelete;
    };
  }, [requestDelete]);

  const doDelete = useCallback(async () => {
    if (!pending) return;

    setBusy(true);
    setError(null);

    // Close modal FIRST to prevent overlay freeze during list rerender
    setOpen(false);
    setTimeout(hardCleanupOverlay, 0);

    try {
      await deleteResource(pending.kind, pending.id);
      await refetchResources();
    } catch (e: any) {
      console.error("Delete failed:", e);
      setError(e?.message ?? "Delete failed");
      // Reopen modal to show error
      setOpen(true);
    } finally {
      setBusy(false);
      if (!error) {
        setPending(null);
      }
      setTimeout(hardCleanupOverlay, 50);
    }
  }, [pending, deleteResource, refetchResources, error]);

  if (!open) return null;

  const kindLabels: Record<ResourceKind, string> = {
    flashcard: "flashcard",
    table: "table",
    algorithm: "algorithm",
    exam_tip: "exam tip",
    key_image: "image",
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={() => !busy && close()} 
      />
      
      <div className="relative z-[10000] w-[min(400px,92vw)] rounded-xl bg-background border shadow-xl p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Delete {pending?.kind ? kindLabels[pending.kind] : "resource"}?
        </h2>
        
        <p className="mt-2 text-sm text-muted-foreground">
          {pending?.label ? (
            <>Are you sure you want to delete <span className="font-medium text-foreground">"{pending.label}"</span>?</>
          ) : (
            "Are you sure you want to delete this resource?"
          )}
          <br />
          This action cannot be undone.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button 
            variant="outline" 
            disabled={busy} 
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || !pending}
            onClick={doDelete}
          >
            {busy ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to request delete from anywhere
export function requestResourceDelete(kind: ResourceKind, id: string, label?: string) {
  const fn = (window as any).__requestResourceDelete;
  if (fn) {
    fn({ kind, id, label });
  } else {
    console.error("ResourcesDeleteManager not mounted");
  }
}
