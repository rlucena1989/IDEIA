import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import type { DSRRequest, DSRType } from './types';

const logger = createLogger('privacy-center:dsr');

export class DSRManager {
  private requests: Map<string, DSRRequest> = new Map();

  createRequest(userId: string, type: DSRType, description: string): DSRRequest {
    const request: DSRRequest = {
      id: uuidv4(),
      userId,
      type,
      status: 'open',
      description,
      createdAt: new Date(),
    };
    this.requests.set(request.id, request);
    logger.info('DSR request created', { id: request.id, userId, type });
    return request;
  }

  processRequest(id: string): DSRRequest | undefined {
    const request = this.requests.get(id);
    if (!request) {
      logger.warn('DSR request not found for processing', { id });
      return undefined;
    }
    if (request.status !== 'open') {
      logger.warn('DSR request not in open status', { id, status: request.status });
      return undefined;
    }
    request.status = 'in_progress';
    logger.info('DSR request processing started', { id });
    return request;
  }

  completeRequest(id: string, notes: string): DSRRequest | undefined {
    const request = this.requests.get(id);
    if (!request) {
      logger.warn('DSR request not found for completion', { id });
      return undefined;
    }
    request.status = 'completed';
    request.completedAt = new Date();
    request.notes = notes;
    logger.info('DSR request completed', { id, userId: request.userId });
    return request;
  }

  rejectRequest(id: string, reason: string): DSRRequest | undefined {
    const request = this.requests.get(id);
    if (!request) {
      logger.warn('DSR request not found for rejection', { id });
      return undefined;
    }
    request.status = 'rejected';
    request.notes = reason;
    logger.info('DSR request rejected', { id, reason });
    return request;
  }

  getUserRequests(userId: string): DSRRequest[] {
    return Array.from(this.requests.values()).filter(r => r.userId === userId);
  }

  listOpenRequests(): DSRRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'open');
  }

  getStats(): { total: number; open: number; inProgress: number; completed: number; rejected: number; byType: Record<string, number> } {
    const all = Array.from(this.requests.values());
    const byType: Record<string, number> = {};
    for (const r of all) {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
    }
    return {
      total: all.length,
      open: all.filter(r => r.status === 'open').length,
      inProgress: all.filter(r => r.status === 'in_progress').length,
      completed: all.filter(r => r.status === 'completed').length,
      rejected: all.filter(r => r.status === 'rejected').length,
      byType,
    };
  }
}
