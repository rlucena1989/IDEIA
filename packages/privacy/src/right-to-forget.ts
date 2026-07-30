import { createLogger } from '@ideia/logger';

const logger = createLogger('privacy:right-to-forget');

export interface DataStore {
  name: string;
  deleteByUserId(userId: string): Promise<number>;
  deleteByField(field: string, value: string): Promise<number>;
  findDataByUserId(userId: string): Promise<Array<{ id: string; store: string; data: unknown }>>;
}

export interface ForgetRequest {
  id: string;
  userId: string;
  reason: string;
  requestedAt: string;
  completedAt?: string;
  storesAffected: string[];
  recordsDeleted: number;
  status: 'pending' | 'completed' | 'failed' | 'partially_completed';
  errors: string[];
}

export interface ForgetResult {
  requestId: string;
  userId: string;
  storesAffected: string[];
  totalRecordsDeleted: number;
  status: ForgetRequest['status'];
  errors: string[];
  completedAt: string;
}

export class RightToBeForgotten {
  private stores: Map<string, DataStore> = new Map();
  private requests: ForgetRequest[] = [];
  private maxRecords: number;

  constructor(maxRecords = 1000) {
    this.maxRecords = maxRecords;
  }

  registerStore(store: DataStore): void {
    if (this.stores.has(store.name)) {
      logger.warn(`Store "${store.name}" already registered, overwriting`);
    }
    this.stores.set(store.name, store);
    logger.info(`Data store registered for right-to-forget: ${store.name}`);
  }

  unregisterStore(storeName: string): boolean {
    return this.stores.delete(storeName);
  }

  listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  async forget(userId: string, reason: string): Promise<ForgetResult> {
    const requestId = crypto.randomUUID();
    const request: ForgetRequest = {
      id: requestId,
      userId,
      reason,
      requestedAt: new Date().toISOString(),
      storesAffected: [],
      recordsDeleted: 0,
      status: 'pending',
      errors: [],
    };
    this.requests.push(request);

    if (this.requests.length > this.maxRecords) {
      this.requests = this.requests.slice(-this.maxRecords);
    }

    const storesAffected: string[] = [];
    let totalDeleted = 0;
    const errors: string[] = [];

    for (const [, store] of this.stores) {
      try {
        const deleted = await store.deleteByUserId(userId);
        if (deleted > 0) {
          storesAffected.push(store.name);
          totalDeleted += deleted;
        }
      } catch (__err) {
        const errMsg = `Store "${store.name}": ${String(__err)}`;
        errors.push(errMsg);
        logger.error('Right-to-forget failed for store', { store: store.name, userId, error: String(__err) });
      }
    }

    request.storesAffected = storesAffected;
    request.recordsDeleted = totalDeleted;
    request.status = errors.length === 0 ? 'completed' : storesAffected.length > 0 ? 'partially_completed' : 'failed';
    request.errors = errors;
    request.completedAt = new Date().toISOString();

    if (request.status === 'completed') {
      logger.info(`Right-to-forget completed for user ${userId}: ${totalDeleted} records from ${storesAffected.length} stores`);
    } else {
      logger.warn(`Right-to-forget ${request.status} for user ${userId}: ${totalDeleted} records, ${errors.length} errors`);
    }

    return this.toResult(request);
  }

  async findByUserId(userId: string): Promise<Array<{ id: string; store: string; data: unknown }>> {
    const results: Array<{ id: string; store: string; data: unknown }> = [];
    for (const [, store] of this.stores) {
      try {
        const found = await store.findDataByUserId(userId);
        results.push(...found);
      } catch (__err) {
        logger.warn(`Error finding data for user ${userId} in store "${store.name}"`, { error: String(__err) });
      }
    }
    return results;
  }

  async forgetByField(field: string, value: string, reason: string): Promise<ForgetResult> {
    const requestId = crypto.randomUUID();
    const errors: string[] = [];
    const storesAffected: string[] = [];
    let totalDeleted = 0;

    for (const [, store] of this.stores) {
      try {
        const deleted = await store.deleteByField(field, value);
        if (deleted > 0) {
          storesAffected.push(store.name);
          totalDeleted += deleted;
        }
      } catch (__err) {
        const errMsg = `Store "${store.name}": ${String(__err)}`;
        errors.push(errMsg);
      }
    }

    const request: ForgetRequest = {
      id: requestId,
      userId: value,
      reason,
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      storesAffected,
      recordsDeleted: totalDeleted,
      status: errors.length === 0 ? 'completed' : storesAffected.length > 0 ? 'partially_completed' : 'failed',
      errors,
    };
    this.requests.push(request);

    return this.toResult(request);
  }

  getRequest(requestId: string): ForgetRequest | undefined {
    return this.requests.find(r => r.id === requestId);
  }

  getRequestsByUser(userId: string): ForgetRequest[] {
    return this.requests.filter(r => r.userId === userId);
  }

  getHistory(): ForgetRequest[] {
    return [...this.requests];
  }

  private toResult(request: ForgetRequest): ForgetResult {
    return {
      requestId: request.id,
      userId: request.userId,
      storesAffected: request.storesAffected,
      totalRecordsDeleted: request.recordsDeleted,
      status: request.status,
      errors: request.errors,
      completedAt: request.completedAt ?? '',
    };
  }
}

export function createRightToBeForgotten(maxRecords?: number): RightToBeForgotten {
  return new RightToBeForgotten(maxRecords);
}
