import { fsrs, generatorParameters, Card, State } from 'ts-fsrs';

const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  maximum_interval: 365,
  request_retention: 0.90,
});

export const scheduler = fsrs(params);

/**
 * Convert a Supabase `flashcard_states` row back into a ts-fsrs Card object.
 */
export function rowToCard(row: {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: string;
  last_review: string | null;
}): Card {
  const stateMap: Record<string, State> = {
    New: State.New,
    Learning: State.Learning,
    Review: State.Review,
    Relearning: State.Relearning,
  };

  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: stateMap[row.state] ?? State.New,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
    learning_steps: 0,
  };
}
