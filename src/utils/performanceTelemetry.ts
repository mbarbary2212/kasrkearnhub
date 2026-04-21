export interface PerformanceMetrics {
  stt: number;
  llm: number;
  tts: number;
  total: number;
  timestamp: number;
}

export const INITIAL_METRICS: PerformanceMetrics = {
  stt: 0,
  llm: 0,
  tts: 0,
  total: 0,
  timestamp: 0,
};

/**
 * Calculates the latency color based on the duration (ms)
 */
export const getLatencyColor = (ms: number) => {
  if (ms <= 0) return 'text-muted-foreground';
  if (ms < 800) return 'text-emerald-500';
  if (ms < 2000) return 'text-amber-500';
  return 'text-rose-500';
};

/**
 * Utility to format milliseconds with a suffix
 */
export const formatMs = (ms: number) => {
  if (ms <= 0) return '-- ms';
  return `${Math.round(ms)} ms`;
};
