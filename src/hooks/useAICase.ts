import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AICaseRunnerState,
  AICaseDisplayMessage,
  AITurnResponse,
  RunAICaseResponse,
} from "@/types/aiCase";
import { toast } from "sonner";

interface UseAICaseOptions {
  caseId: string;
  attemptId: string;
  onComplete?: (debrief: AITurnResponse) => void;
  onFlagged?: () => void;
}

export function useAICase({ caseId, attemptId, onComplete, onFlagged }: UseAICaseOptions) {
  const turnRef = useRef(0);
  const [state, setState] = useState<AICaseRunnerState>({
    status: "idle",
    currentTurn: 0,
    maxTurns: 10,
    messages: [],
    currentQuestion: null,
    debrief: null,
    error: null,
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

  const callEdgeFunction = async (
    userMessage: string
  ): Promise<RunAICaseResponse | null> => {
    const { data, error } = await supabase.functions.invoke("run-ai-case", {
      body: { caseId, attemptId, userMessage, turnNumber: turnRef.current },
    });

    if (error) {
      // Check for rate limit / payment errors
      const msg = error.message || "";
      if (msg.includes("429") || msg.includes("rate limit")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (msg.includes("402") || msg.includes("credits")) {
        toast.error("AI credits exhausted. Please contact your administrator.");
      }
      throw new Error(msg);
    }
    return data as RunAICaseResponse;
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
        }));
      if (turn.flag_for_review) onFlagged?.();
        // Don't auto-call onComplete here — let DebriefCard button trigger it
      } else {
        setState((prev) => ({
          ...prev,
          status: "active",
          currentTurn: turnNumber,
          maxTurns,
          currentQuestion: turn,
        }));
      }
    },
    [addMessage, onComplete, onFlagged]
  );

  const startCase = useCallback(
    async (introText: string) => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      addMessage({ role: "system", content: introText });
      try {
        const result = await callEdgeFunction("BEGIN_CASE");
        if (result) applyTurnResult(result);
      } catch {
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            "Unable to connect to the clinical examiner. Please try again.",
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMessage, applyTurnResult]
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (state.status !== "active") return;
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      addMessage({ role: "student", content: answer });
      try {
        const result = await callEdgeFunction(answer);
        if (result) applyTurnResult(result);
      } catch {
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            "Unable to connect to the clinical examiner. Please try again.",
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
    });
  }, []);

  return { ...state, startCase, submitAnswer, reset };
}
