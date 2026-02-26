export type AITurnType = "question" | "debrief" | "redirect";

export interface AIChoice {
  label: string;
  value: string;
}

export interface AITurnResponse {
  type: AITurnType;
  patient_info?: string | null;
  prompt: string;
  choices?: AIChoice[] | null;
  teaching_point?: string | null;
  score?: number;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  flag_for_review?: boolean;
}

export interface RunAICaseResponse {
  turn: AITurnResponse;
  turnNumber: number;
  maxTurns: number;
  isComplete: boolean;
}

export type AICaseStatus = "idle" | "loading" | "active" | "complete" | "error";

export interface AICaseDisplayMessage {
  id: string;
  role: "examiner" | "student" | "system";
  content: string;
  patient_info?: string | null;
  choices?: AIChoice[] | null;
  teaching_point?: string | null;
  timestamp: Date;
}

export interface AICaseRunnerState {
  status: AICaseStatus;
  currentTurn: number;
  maxTurns: number;
  messages: AICaseDisplayMessage[];
  currentQuestion: AITurnResponse | null;
  debrief: AITurnResponse | null;
  error: string | null;
  streamingContent: string;
}
