export interface EvolutionRunResult {
  ok: boolean;
  action: string;
  rationale: string;
  deltaSummary: unknown;
  validation: {
    passed: boolean;
    notes: string[];
  };
  auditId: string;
}
