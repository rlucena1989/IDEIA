import path from 'path';
import { createLogger } from '@ideia/logger';
import { Scope } from './types';
const logger = createLogger('path-validator');

export type Operation = 'read' | 'write' | 'execute' | 'delete';

export interface ValidationResult {
  allowed: boolean;
  reason: string;
  resolvedPath: string;
}

const SCOPE_RULES: Record<Scope, { allowRead: Scope[]; allowWrite: Scope[] }> = {
  self: {
    allowRead: ['self', 'project'],
    allowWrite: ['self'],
  },
  project: {
    allowRead: ['project'],
    allowWrite: ['project', 'self'],
  },
  system: {
    allowRead: ['self', 'project', 'system'],
    allowWrite: ['system'],
  },
};

export class PathValidator {
  static validate(operation: Operation, targetPath: string, fromScope: Scope): ValidationResult {
    const hasTraversal = PathValidator.hasPathTraversal(targetPath);
    const resolved = path.resolve(targetPath);

    const allowedReads = SCOPE_RULES[fromScope].allowRead;
    const allowedWrites = SCOPE_RULES[fromScope].allowWrite;

    const targetScope = PathValidator.detectScope(resolved);

    if (hasTraversal) {
      return {
        allowed: false,
        reason: `Path traversal detected in target: ${targetPath}`,
        resolvedPath: resolved,
      };
    }

    if (operation === 'read' && !allowedReads.includes(targetScope)) {
      return {
        allowed: false,
        reason: `Scope '${fromScope}' cannot read from '${targetScope}'`,
        resolvedPath: resolved,
      };
    }

    if (operation !== 'read' && !allowedWrites.includes(targetScope)) {
      return {
        allowed: false,
        reason: `Scope '${fromScope}' cannot write to '${targetScope}'`,
        resolvedPath: resolved,
      };
    }

    return {
      allowed: true,
      reason: `Operation ${operation} on ${targetScope} allowed from ${fromScope}`,
      resolvedPath: resolved,
    };
  }

  static hasPathTraversal(targetPath: string): boolean {
    const normalized = targetPath.replace(/\\/g, '/');
    const segments = normalized.split('/');
    for (const seg of segments) {
      if (seg === '..') return true;
    }
    return false;
  }

  static detectScope(resolvedPath: string): Scope {
    const normalized = resolvedPath.replace(/\\/g, '/');

    if (normalized.includes('/.ideia/') || normalized.includes('/.ai/')) {
      return 'self';
    }

    if (normalized.includes('/node_modules/') || normalized.includes('/.git/')) {
      return 'system';
    }

    return 'project';
  }
}
