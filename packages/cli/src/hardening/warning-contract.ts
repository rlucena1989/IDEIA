export interface HardeningWarning {
  code: string;
  message: string;
  source: string;
  details?: unknown;
  category: 'contract' | 'consistency' | 'sync' | 'output' | 'security';
}

export interface WarningReport {
  warnings: HardeningWarning[];
  total: number;
  categories: Record<string, number>;
}

export function categorizeWarnings(warnings: HardeningWarning[]): WarningReport {
  const categories: Record<string, number> = {};
  for (const w of warnings) {
    categories[w.category] = (categories[w.category] ?? 0) + 1;
  }
  return { warnings, total: warnings.length, categories };
}

export function formatWarningSummary(report: WarningReport): string {
  if (report.total === 0) return 'Nenhum warning encontrado';
  const parts = Object.entries(report.categories).map(([cat, count]) => `${count} ${cat}`);
  return parts.join(', ');
}
