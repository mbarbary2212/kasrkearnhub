import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AIFlashcardGenerateButtonProps {
  chapterId?: string;
  topicId?: string;
  moduleId: string;
}

type CardType = "flashcard" | "cloze_flashcard" | "both";

export function AIFlashcardGenerateButton({
  chapterId,
  topicId,
  moduleId,
}: AIFlashcardGenerateButtonProps) {
  const [open, setOpen] = useState(false);
  const [cardType, setCardType] = useState<CardType>("flashcard");
  const [quantity, setQuantity] = useState("10");
  const [focusInstructions, setFocusInstructions] = useState("");
  const queryClient = useQueryClient();

  const getValidSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session;
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    if (error || !refreshData.session?.access_token) throw new Error("Session expired. Please sign in again.");
    return refreshData.session;
  }, []);

  const invokeWithAuth = useCallback(
    async (functionName: string, payload: any): Promise<any> => {
      const session = await getValidSession();
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        // Extract the actual error message from the response body
        let message = error.message || "Unknown error";
        if (error instanceof Object && 'context' in error) {
          try {
            const ctx = (error as any).context;
            if (ctx?.body) {
              const reader = ctx.body.getReader?.();
              if (reader) {
                const { value } = await reader.read();
                const text = new TextDecoder().decode(value);
                const parsed = JSON.parse(text);
                if (parsed?.error) message = parsed.error;
              }
            }
          } catch {}
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    [getValidSession]
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      // 1. Find linked document for this chapter/topic
      let docQuery = supabase
        .from("admin_documents")
        .select("id")
        .eq("is_deleted", false)
        .limit(1);

      if (chapterId) docQuery = docQuery.eq("chapter_id", chapterId);
      else if (topicId) docQuery = docQuery.eq("topic_id", topicId);
      else throw new Error("No chapter or topic specified.");

      const { data: docs, error: docError } = await docQuery;
      if (docError) throw docError;
      if (!docs || docs.length === 0) {
        throw new Error("No linked PDF found for this chapter/topic. Upload a document first.");
      }

      // 2. Fetch existing flashcard fingerprints for dedup
      const scopeCol = chapterId ? "chapter_id" : "topic_id";
      const scopeVal = (chapterId || topicId) as string;
      const fetchExisting = async (type: string) => {
        const { data } = await supabase
          .from("study_resources")
          .select("title, content")
          .eq("type" as any, type)
          .eq(scopeCol as any, scopeVal);
        return data || [];
      };
      const [existingCards, existingCloze] = await Promise.all([
        fetchExisting("flashcard"),
        fetchExisting("cloze_flashcard"),
      ]);
      const allExisting = [...existingCards, ...existingCloze];
      const dedupFingerprints = (existingCards || []).map(
        (c) => `${c.title || ''} | ${typeof c.content === 'string' ? c.content.substring(0, 100) : ''}`
      ).filter(Boolean);

      const documentId = docs[0].id;
      const qty = parseInt(quantity);
      const types: string[] =
        cardType === "both"
          ? ["flashcard", "cloze_flashcard"]
          : [cardType];

      let totalGenerated = 0;

      for (const contentType of types) {
        const perTypeQty = cardType === "both" ? Math.ceil(qty / 2) : qty;

        // Generate
        const genData = await invokeWithAuth("generate-content-from-pdf", {
          document_id: documentId,
          content_type: contentType,
          module_id: moduleId,
          chapter_id: chapterId || null,
          quantity: perTypeQty,
          additional_instructions: focusInstructions || null,
          action: "generate",
          dedup_fingerprints: dedupFingerprints,
        });

        // Error is already handled by invokeWithAuth
        const items = genData?.items || [];
        const jobId = genData?.job_id;

        if (!jobId) throw new Error("No job ID returned from generation.");

        // Finalize
        await invokeWithAuth("generate-content-from-pdf", {
          job_id: jobId,
          action: "finalize",
          items,
          content_type: contentType,
          generation_stats: {
            requested: perTypeQty,
            raw_generated: items.length,
            after_dedup: items.length,
            chunks_used: 1,
          },
        });

        // Approve
        const approveData = await invokeWithAuth("approve-ai-content", {
          job_id: jobId,
        });

        if (approveData?.error) throw new Error(approveData.error);
        totalGenerated += approveData?.items?.length || items.length;
      }

      return totalGenerated;
    },
    onSuccess: async (count) => {
      toast.success(`Generated ${count} flashcard${count !== 1 ? "s" : ""} successfully!`);
      setOpen(false);
      setFocusInstructions("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["study-resources"] }),
        queryClient.invalidateQueries({ queryKey: ["flashcards"] }),
        queryClient.invalidateQueries({ queryKey: ["ai_generation_jobs"] }),
      ]);
    },
    onError: (error: Error) => {
      console.error("AI Flashcard generation error:", error);
      toast.error(error.message || "Generation failed. Please try again.");
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Sparkles className="w-3 h-3" />
        AI Generate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Generate Flashcards
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Card Type */}
            <div className="space-y-2">
              <Label>Card Type</Label>
              <RadioGroup
                value={cardType}
                onValueChange={(v) => setCardType(v as CardType)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="flashcard" id="classic" />
                  <Label htmlFor="classic" className="font-normal cursor-pointer">Classic</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="cloze_flashcard" id="cloze" />
                  <Label htmlFor="cloze" className="font-normal cursor-pointer">Cloze</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="font-normal cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Select value={quantity} onValueChange={setQuantity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 cards</SelectItem>
                  <SelectItem value="10">10 cards</SelectItem>
                  <SelectItem value="15">15 cards</SelectItem>
                  <SelectItem value="20">20 cards</SelectItem>
                  <SelectItem value="25">25 cards</SelectItem>
                  <SelectItem value="30">30 cards</SelectItem>
                  <SelectItem value="35">35 cards</SelectItem>
                  <SelectItem value="40">40 cards</SelectItem>
                </SelectContent>
              </Select>
              {cardType === "both" && (
                <p className="text-xs text-muted-foreground">
                  ~{Math.ceil(parseInt(quantity) / 2)} classic + ~{Math.ceil(parseInt(quantity) / 2)} cloze
                </p>
              )}
            </div>

            {/* Focus Instructions */}
            <div className="space-y-2">
              <Label>Focus Instructions (optional)</Label>
              <Textarea
                placeholder="e.g., Focus on clinical features and management of breast cancer..."
                value={focusInstructions}
                onChange={(e) => setFocusInstructions(e.target.value)}
                rows={3}
              />
            </div>

            {generateMutation.isPending && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Generating flashcards... This may take a moment.</span>
              </div>
            )}

            {generateMutation.isError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{generateMutation.error?.message || "Generation failed."}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={generateMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-1"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
