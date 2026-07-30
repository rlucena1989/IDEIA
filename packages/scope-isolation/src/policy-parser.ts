import fs from 'fs';
import { createLogger } from '@ideia/logger';
import yaml from 'js-yaml';
import { Scope } from './types';
import { Operation } from './path-validator';
const logger = createLogger('policy-parser');

export interface YamlScopeRule {
  allow_read?: string[];
  allow_write?: string[];
  deny_read?: string[];
  deny_write?: string[];
}

export interface IsolationYaml {
  version?: string;
  scopes?: Record<string, YamlScopeRule>;
}

export interface ScopeAccessRules {
  allowRead: Set<Scope>;
  allowWrite: Set<Scope>;
  denyRead: Set<Scope>;
  denyWrite: Set<Scope>;
}

export interface ParsedIsolationPolicy {
  version: string;
  scopes: Map<Scope, ScopeAccessRules>;
}

function toScope(value: string): Scope {
  if (value === 'self' || value === 'project' || value === 'system') return value;
  throw new Error(`Invalid scope: ${value}`);
}

export class PolicyParser {
  static parseIsolationYaml(yamlContent: string): ParsedIsolationPolicy {
    return PolicyParser.parse(yamlContent);
  }

  static parse(yamlContent: string): ParsedIsolationPolicy {
    const doc = yaml.load(yamlContent) as IsolationYaml | undefined;
    if (!doc || typeof doc !== 'object') {
      throw new Error('Invalid isolation.yaml format');
    }

    const scopes = new Map<Scope, ScopeAccessRules>();
    const rawScopes = doc.scopes ?? {};

    for (const [scopeName, rule] of Object.entries(rawScopes)) {
      const scope = toScope(scopeName);
      scopes.set(scope, {
        allowRead: new Set((rule.allow_read ?? []).map(toScope)),
        allowWrite: new Set((rule.allow_write ?? []).map(toScope)),
        denyRead: new Set((rule.deny_read ?? []).map(toScope)),
        denyWrite: new Set((rule.deny_write ?? []).map(toScope)),
      });
    }

    return {
      version: doc.version ?? '1.0',
      scopes,
    };
  }

  static parseFile(filePath: string): ParsedIsolationPolicy {
    const content = fs.readFileSync(filePath, 'utf-8');
    return PolicyParser.parse(content);
  }

  static isOperationAllowed(policy: ParsedIsolationPolicy, operation: Operation, fromScope: Scope, targetScope: Scope): boolean {
    const rules = policy.scopes.get(targetScope);
    if (!rules) return false;

    const denySet = operation === 'read' ? rules.denyRead : rules.denyWrite;
    if (denySet.has(fromScope)) return false;

    const allowSet = operation === 'read' ? rules.allowRead : rules.allowWrite;
    if (allowSet.size === 0) return true;
    return allowSet.has(fromScope);
  }

  static generateDefaultYaml(): string {
    const defaultYaml: IsolationYaml = {
      version: '1.0',
      scopes: {
        self: {
          allow_read: ['self', 'project'],
          allow_write: ['self'],
          deny_read: [],
          deny_write: ['project', 'system'],
        },
        project: {
          allow_read: ['project'],
          allow_write: ['project', 'self'],
          deny_read: ['system'],
          deny_write: ['system'],
        },
        system: {
          allow_read: ['self', 'project', 'system'],
          allow_write: ['system'],
          deny_read: [],
          deny_write: ['self', 'project'],
        },
      },
    };
    return yaml.dump(defaultYaml, { indent: 2 });
  }
}
