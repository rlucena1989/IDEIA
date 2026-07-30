import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import type { ConsentRecord, ConsentStatus } from './types';

const logger = createLogger('privacy-center:consent');

export class ConsentManager {
  private consents: Map<string, ConsentRecord> = new Map();

  recordConsent(userId: string, purpose: string, expiresAt?: Date): ConsentRecord {
    const record: ConsentRecord = {
      id: uuidv4(),
      userId,
      purpose,
      status: 'granted',
      grantedAt: new Date(),
      expiresAt,
    };
    this.consents.set(record.id, record);
    logger.info('Consent recorded', { id: record.id, userId, purpose });
    return record;
  }

  revokeConsent(id: string): ConsentRecord | undefined {
    const record = this.consents.get(id);
    if (!record) {
      logger.warn('Consent not found for revocation', { id });
      return undefined;
    }
    record.status = 'revoked';
    record.revokedAt = new Date();
    logger.info('Consent revoked', { id, userId: record.userId });
    return record;
  }

  getUserConsents(userId: string): ConsentRecord[] {
    return Array.from(this.consents.values()).filter(c => c.userId === userId);
  }

  checkConsent(userId: string, purpose: string): boolean {
    const record = Array.from(this.consents.values()).find(
      c => c.userId === userId && c.purpose === purpose && c.status === 'granted'
    );
    return !!record;
  }

  expireConsent(id: string): ConsentRecord | undefined {
    const record = this.consents.get(id);
    if (!record) {
      logger.warn('Consent not found for expiration', { id });
      return undefined;
    }
    record.status = 'expired';
    logger.info('Consent expired', { id, userId: record.userId });
    return record;
  }

  autoExpire(now: Date = new Date()): number {
    let count = 0;
    for (const [id, record] of this.consents) {
      if (record.status === 'granted' && record.expiresAt && record.expiresAt <= now) {
        record.status = 'expired';
        count++;
      }
    }
    if (count > 0) {
      logger.info(`Auto-expired ${count} consents`);
    }
    return count;
  }
}
