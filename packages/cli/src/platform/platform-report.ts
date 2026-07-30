import { PlatformState, PlatformVerification } from './platform-types';
import { createLogger } from '@ideia/logger';
import { PlatformPackage } from './platform-types';
import { PlatformFinishResult } from './platform-types';
import { MaintenanceTask } from './platform-types';
const logger = createLogger('platform-report');

export interface PlatformReport {
  generatedAt: string;
  state: PlatformState;
  verification: PlatformVerification;
  pkg?: PlatformPackage;
  finish?: PlatformFinishResult;
  maintenance: MaintenanceTask[];
  summary: string[];
}

export function buildPlatformReport(params: {
  state: PlatformState;
  verification: PlatformVerification;
  pkg?: PlatformPackage;
  finish?: PlatformFinishResult;
  maintenance: MaintenanceTask[];
}): PlatformReport {
  const summary: string[] = [
    `Plataforma: ${params.state.name} v${params.state.version}`,
    `Status: ${params.state.status} | Saúde: ${params.state.healthScore}/100`,
    `Verificação: ${params.verification.ok ? 'OK' : `${params.verification.issues.length} pendência(s)`}`,
    `${params.maintenance.length} tarefa(s) de manutenção`,
  ];

  if (params.finish) {
    summary.push(`Fechamento: ${params.finish.closed ? 'Concluído' : 'Pendente'}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
