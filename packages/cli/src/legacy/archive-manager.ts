import { ArchiveBundle } from './legacy-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('archive-manager');

export function archiveItems(items: string[]): ArchiveBundle {
  return {
    bundleId: `bundle-${Date.now()}`,
    createdAt: new Date().toISOString(),
    items,
    checksum: `checksum-${items.length}-${Date.now()}`,
  };
}

export function verifyArchive(bundle: ArchiveBundle): boolean {
  const expectedChecksum = `checksum-${bundle.items.length}-${parseInt(bundle.checksum?.split('-').pop() ?? '0', 10) || 0}`;
  return bundle.checksum === expectedChecksum;
}
