export interface RevalidationResult {
  ok: boolean;
  beforeScore: number;
  afterScore: number;
  delta: number;
  notes: string[];
}

export function revalidateEvolution(beforeScore: number, afterScore: number): RevalidationResult {
  return {
    ok: afterScore >= beforeScore,
    beforeScore,
    afterScore,
    delta: afterScore - beforeScore,
    notes: afterScore >= beforeScore
      ? ['State improved or remained stable.']
      : ['State regressed after execution.'],
  };
}
