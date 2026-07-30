import { OperationalPackage } from './package-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('package-builder');

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
