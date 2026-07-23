export interface SystemSynthesis {
  synthesizedAt: string;
  version: string;
  subsystems: string[];
  integrated: boolean;
  notes: string[];
}

export function buildSystemSynthesis(subsystems: string[]): SystemSynthesis {
  return {
    synthesizedAt: new Date().toISOString(),
    version: '20.0.0',
    subsystems,
    integrated: subsystems.length > 0,
    notes: [
      `${subsystems.length} subsistema(s) integrado(s)`,
      'Fases 1–20 concluídas',
    ],
  };
}
