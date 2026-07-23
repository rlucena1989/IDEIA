export interface HardeningError {
  code: string;
  message: string;
  details?: unknown;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface HardeningErrorReport {
  errors: HardeningError[];
  totalErrors: number;
  totalWarnings: number;
  totalCritical: number;
}

export function categorizeErrors(errors: HardeningError[]): HardeningErrorReport {
  const totalCritical = errors.filter(e => e.severity === 'critical').length;
  const totalErrors = errors.filter(e => e.severity === 'error').length;
  const totalWarnings = errors.filter(e => e.severity === 'warning').length;

  return {
    errors,
    totalErrors,
    totalWarnings,
    totalCritical,
  };
}

export function formatErrorSummary(report: HardeningErrorReport): string {
  const parts: string[] = [];
  if (report.totalCritical > 0) parts.push(`${report.totalCritical} crítico(s)`);
  if (report.totalErrors > 0) parts.push(`${report.totalErrors} erro(s)`);
  if (report.totalWarnings > 0) parts.push(`${report.totalWarnings} aviso(s)`);
  return parts.length > 0 ? parts.join(', ') : 'Nenhum problema encontrado';
}
