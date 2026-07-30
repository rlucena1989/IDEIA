import { LocalFileSystemStorage, InMemoryStorage, StorageProvider } from './storage-provider';
import { createLogger } from '@ideia/logger';
export { StorageProvider, StorageEntry, StorageConfig, LocalFileSystemStorage, InMemoryStorage } from './storage-provider';
const logger = createLogger('storage-index');

export type StorageType = 'filesystem' | 'memory';

export function createStorage(type: StorageType = 'filesystem', config?: { basePath?: string; defaultTtl?: number }): StorageProvider {
  switch (type) {
    case 'filesystem':
      return new LocalFileSystemStorage(config);
    case 'memory':
      return new InMemoryStorage();
    default:
      return new InMemoryStorage();
  }
}
