import { OperationalPackage } from './package-types';
import { computePackageChecksum } from './package-hasher';

export interface PackageValidationResult {
  ok: boolean;
  issues: string[];
}

export function validateOperationalPackage<T>(pkg: OperationalPackage<T>): PackageValidationResult {
  const issues: string[] = [];
  const expected = computePackageChecksum(JSON.stringify(pkg.payload));

  if (!pkg.metadata.packageId.trim()) issues.push('Missing packageId');
  if (pkg.checksum !== expected) issues.push('Checksum mismatch');
  if (!pkg.metadata.version.trim()) issues.push('Missing version');
  if (!pkg.metadata.source.trim()) issues.push('Missing source');
  if (!pkg.metadata.target.trim()) issues.push('Missing target');

  return {
    ok: issues.length === 0,
    issues,
  };
}
