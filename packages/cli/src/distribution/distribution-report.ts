import { OperationalPackage, PackageEmissionResult } from './package-types';
import { createLogger } from '@ideia/logger';
import { SyncResult } from './sync-manager';
const logger = createLogger('distribution-report');

export interface DistributionReport {
  generatedAt: string;
  packageId: string;
  version: string;
  validation: { ok: boolean; issues: string[] };
  emission?: PackageEmissionResult;
  sync?: SyncResult;
  summary: string[];
}

export function buildDistributionReport(params: {
  pkg: OperationalPackage;
  validation: { ok: boolean; issues: string[] };
  emission?: PackageEmissionResult;
  sync?: SyncResult;
}): DistributionReport {
  const summary: string[] = [
    `Pacote: ${params.pkg.metadata.packageId.substring(0, 8)}...`,
    `Versão: ${params.pkg.metadata.version}`,
    `Validação: ${params.validation.ok ? 'OK' : 'Falhou'}`,
  ];

  if (params.emission) {
    summary.push(`Emissão: ${params.emission.ok ? 'OK' : 'Falhou'} para ${params.emission.target}`);
  }

  if (params.sync) {
    summary.push(`Sync: ${params.sync.ok ? 'OK' : 'Falhou'} (${params.sync.syncType})`);
  }

  return {
    generatedAt: new Date().toISOString(),
    packageId: params.pkg.metadata.packageId,
    version: params.pkg.metadata.version,
    validation: params.validation,
    emission: params.emission,
    sync: params.sync,
    summary,
  };
}
