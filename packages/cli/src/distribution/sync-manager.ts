import { reconcilePackages } from './package-reconciler';
import { createLogger } from '@ideia/logger';
import { OperationalPackage, PackageEmissionResult } from './package-types';
import { emitPackage } from './package-emitter';
const logger = createLogger('sync-manager');

export interface SyncResult {
  ok: boolean;
  syncType: 'full' | 'incremental' | 'forced' | 'repair';
  emission?: PackageEmissionResult;
  notes: string[];
}

export function synchronizePackage<T>(
  localPkg: OperationalPackage<T> | undefined,
  remotePkg: OperationalPackage<T> | undefined,
  target: string
): SyncResult {
  const reconciliation = reconcilePackages(localPkg, remotePkg);

  if (reconciliation.status === 'identical') {
    return { ok: true, syncType: 'incremental', notes: ['Already synchronized.'] };
  }

  if (reconciliation.status === 'diverged') {
    return {
      ok: false,
      syncType: 'repair',
      notes: ['Divergence detected; manual or repair sync required.'],
    };
  }

  if (localPkg) {
    return {
      ok: true,
      syncType: 'full',
      emission: emitPackage(localPkg, target),
      notes: ['Package synchronized successfully.'],
    };
  }

  return {
    ok: false,
    syncType: 'repair',
    notes: ['Unable to synchronize without local package.'],
  };
}
