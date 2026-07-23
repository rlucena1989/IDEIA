import { NatsConnectionManager } from './nats-connection';
import { createLogger } from '@ideia/logger';

const log = createLogger('object-store');

export interface ObjectMetadata {
  name: string;
  size: number;
  contentType?: string;
  uploadedAt: number;
  version: number;
}

export interface StoredObject {
  metadata: ObjectMetadata;
  data: Buffer;
}

export interface ObjectStoreConfig {
  maxAge?: number;
  maxObjects?: number;
  maxSizeBytes?: number;
}

const DEFAULT_OBJECT_STORE_CONFIG: ObjectStoreConfig = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  maxObjects: 1000,
  maxSizeBytes: 1024 * 1024 * 1024,
};

export class ObjectStore {
  private connectionManager: NatsConnectionManager;
  private config: ObjectStoreConfig;
  private store: Map<string, StoredObject> = new Map();
  private versionCounter: number = 0;
  private totalSizeBytes: number = 0;

  constructor(connectionManager: NatsConnectionManager, config: ObjectStoreConfig = {}) {
    this.connectionManager = connectionManager;
    this.config = { ...DEFAULT_OBJECT_STORE_CONFIG, ...config };
  }

  async initialize(config?: Partial<ObjectStoreConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    try {
      await this.connectionManager.connect();
    } catch (_err) {
      log.info(`Initialized (offline mode): ${err}`);
      return;
    }
    log.info('Initialized');
  }

  async put(name: string, data: Buffer, contentType?: string): Promise<ObjectMetadata> {
    const now = Date.now();
    this.versionCounter++;

    if (this.config.maxSizeBytes && this.totalSizeBytes + data.length > this.config.maxSizeBytes) {
      throw new Error(`Object store size limit exceeded (max: ${this.config.maxSizeBytes} bytes)`);
    }

    const metadata: ObjectMetadata = {
      name,
      size: data.length,
      contentType,
      uploadedAt: now,
      version: this.versionCounter,
    };

    this.store.set(name, { metadata, data });
    this.totalSizeBytes += data.length;

    await this.cleanup();
    return metadata;
  }

  async get(name: string): Promise<StoredObject | null> {
    const obj = this.store.get(name);
    if (!obj) return null;

    if (this.config.maxAge && (Date.now() - obj.metadata.uploadedAt) > this.config.maxAge) {
      await this.delete(name);
      return null;
    }

    return obj;
  }

  async getMetadata(name: string): Promise<ObjectMetadata | null> {
    const obj = await this.get(name);
    return obj ? obj.metadata : null;
  }

  async delete(name: string): Promise<boolean> {
    const obj = this.store.get(name);
    if (obj) {
      this.totalSizeBytes -= obj.metadata.size;
      this.store.delete(name);
      return true;
    }
    return false;
  }

  async list(): Promise<ObjectMetadata[]> {
    return Array.from(this.store.values()).map(obj => obj.metadata);
  }

  async has(name: string): Promise<boolean> {
    return this.store.has(name);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.totalSizeBytes = 0;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    if (this.config.maxAge) {
      for (const [name, obj] of this.store.entries()) {
        if ((now - obj.metadata.uploadedAt) > this.config.maxAge) {
          this.store.delete(name);
          this.totalSizeBytes -= obj.metadata.size;
        }
      }
    }

    if (this.config.maxObjects && this.store.size > this.config.maxObjects) {
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].metadata.uploadedAt - b[1].metadata.uploadedAt);
      const toRemove = entries.slice(0, this.store.size - this.config.maxObjects);
      for (const [name, obj] of toRemove) {
        this.store.delete(name);
        this.totalSizeBytes -= obj.metadata.size;
      }
    }
  }

  async getStats(): Promise<{
    totalObjects: number;
    totalSizeBytes: number;
    totalVersions: number;
  }> {
    return {
      totalObjects: this.store.size,
      totalSizeBytes: this.totalSizeBytes,
      totalVersions: this.versionCounter,
    };
  }
}

export function createObjectStore(
  connectionManager: NatsConnectionManager,
  config?: ObjectStoreConfig
): ObjectStore {
  return new ObjectStore(connectionManager, config);
}
