import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AICaseRunnerState,
  AICaseDisplayMessage,
  AITurnResponse,
  RunAICaseResponse,
} from "@/types/aiCase";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface UseAICaseOptions {
  caseId: string;
  attemptId: string;
  hintMode?: boolean;
  onComplete?: (debrief: AITurnResponse) => void;
  onFlagged?: () => void;
}

export function useAICase({ caseId, attemptId, hintMode, onComplete, onFlagged }: UseAICaseOptions) {
  const turnRef = useRef(0);
  const [state, setState] = useState<AICaseRunnerState>({
    status: "idle",
    currentTurn: 0,
    maxTurns: 10,
    messages: [],
    currentQuestion: null,
    debrief: null,
    error: null,
    streamingContent: "",
  });

  const addMessage = useCallback(
    (msg: Omit<AICaseDisplayMessage, "id" | "timestamp">) => {
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
        ],
      }));
    },
    []
  );

  const callEdgeFunction = async (userMessage: string): Promise<void> => {
    // Get auth token for the request
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON_KEY;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/run-ai-case`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        caseId,
        attemptId,
        userMessage,
        turnNumber: turnRef.current,
        hintMode,
      }),
    });

    if (!response.ok) {
      // Try to read error JSON
      let errorMsg = `Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        // ignore parse error
      }
      if (response.status === 429) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (response.status === 402) {
        toast.error("AI credits exhausted. Please contact your administrator.");
      }
      throw new Error(errorMsg);
    }

    // Check content type — handle SSE streaming or JSON fallback
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream") && response.body) {
      // SSE streaming path
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.chunk) {
              accumulated += data.chunk;
              setState((prev) => ({ ...prev, streamingContent: accumulated }));
            }

            if (data.done && data.turn) {
              // Stream complete — clear streaming, apply result
              setState((prev) => ({ ...prev, streamingContent: "" }));
              applyTurnResult(data as RunAICaseResponse);
              return;
            }

            if (data.error) {
              throw new Error(data.message || "Stream error from edge function");
            }
          } catch (e) {
            // If it's our re-thrown error, propagate it
            if (e instanceof Error && e.message.includes("Stream error")) throw e;
            // Otherwise partial JSON, skip
          }
        }
      }

      // If we get here without a done signal, the stream ended unexpectedly
      if (accumulated && !state.debrief) {
        throw new Error("Stream ended without completion signal");
      }
    } else {
      // JSON fallback (shouldn't happen with new edge function, but just in case)
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      applyTurnResult(data as RunAICaseResponse);
    }
  };

  const applyTurnResult = useCallback(
    (result: RunAICaseResponse) => {
      const { turn, turnNumber, maxTurns } = result;
      turnRef.current = turnNumber;

      addMessage({
        role: "examiner",
        content: turn.prompt,
        patient_info: turn.patient_info,
        choices: turn.choices,
        teaching_point: turn.teaching_point,
      });

      if (turn.type === "debrief") {
        setState((prev) => ({
          ...prev,
          status: "complete",
          currentTurn: turnNumber,
          maxTurns,
          debrief: turn,
          currentQuestion: null,
          streamingContent: "",
        }));
        if (turn.flag_for_review) onFlagged?.();
      } else {
        setState((prev) => ({
          ...prev,
          status: "active",
          currentTurn: turnNumber,
          maxTurns,
          currentQuestion: turn,
          streamingContent: "",
        }));
      }
    },
    [addMessage, onFlagged]
  );

  const startCase = useCallback(
    async (introText: string) => {
      setState((prev) => ({ ...prev, status: "loading", error: null, streamingContent: "" }));
      addMessage({ role: "system", content: introText });
      try {
        await callEdgeFunction("BEGIN_CASE");
      } catch {
        setState((prev) => ({
          ...prev,
          status: "error",
          streamingContent: "",
          error: "Unable to connect to the clinical examiner. Please try again.",
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMessage, applyTurnResult]
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (state.status !== "active") return;
      if (answer.length > 2000) {
        toast.error("Your message is too long. Please keep it under 2,000 characters.");
        return;
      }
      setState((prev) => ({ ...prev, status: "loading", error: null, streamingContent: "" }));
      addMessage({ role: "student", content: answer });
      try {
        await callEdgeFunction(answer);
      } catch {
        setState((prev) => ({
          ...prev,
          status: "error",
          streamingContent: "",
          error: "Unable to connect to the clinical examiner. Please try again.",
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.status, addMessage, applyTurnResult]
  );

  const reset = useCallback(() => {
    turnRef.current = 0;
    setState({
      status: "idle",
      currentTurn: 0,
      maxTurns: 10,
      messages: [],
      currentQuestion: null,
      debrief: null,
      error: null,
      streamingContent: "",
    });
  }, []);

  return { ...state, startCase, submitAnswer, reset };
}
