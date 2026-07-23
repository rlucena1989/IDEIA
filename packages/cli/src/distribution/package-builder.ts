import { OperationalPackage } from './package-types';

export function buildOperationalPackage<T>(
  metadata: OperationalPackage<T>['metadata'],
  payload: T,
  checksum: string
): OperationalPackage<T> {
  return {
    metadata,
    payload,
    checksum,
  };
}
