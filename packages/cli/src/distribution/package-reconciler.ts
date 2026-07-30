import { OperationalPackage } from './package-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('package-reconciler');

export interface PackageReconciliationResult {
  ok: boolean;
  status: 'identical' | 'diverged' | 'missing' | 'older' | 'newer';
  notes: string[];
}

export function reconcilePackages<T>(
  localPkg?: OperationalPackage<T>,
  remotePkg?: OperationalPackage<T>
): PackageReconciliationResult {
  if (!localPkg && !remotePkg) {
    return { ok: false, status: 'missing', notes: ['No packages available.'] };
  }

  if (localPkg && remotePkg && localPkg.checksum === remotePkg.checksum) {
    return { ok: true, status: 'identical', notes: ['Packages are identical.'] };
  }

  if (localPkg && !remotePkg) {
    return { ok: false, status: 'newer', notes: ['Only local package exists.'] };
  }

  if (!localPkg && remotePkg) {
    return { ok: false, status: 'older', notes: ['Only remote package exists.'] };
  }

  return { ok: false, status: 'diverged', notes: ['Packages differ and require reconciliation.'] };
}
