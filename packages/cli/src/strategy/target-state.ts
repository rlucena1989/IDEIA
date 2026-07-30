import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('target-state');

export interface TargetCapability {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

export interface TargetState {
  targetId: string;
  name: string;
  description: string;
  capabilities: TargetCapability[];
  successCriteria: string[];
  constraints: string[];
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function createTargetState(params: {
  name: string;
  description: string;
  capabilities?: TargetCapability[];
  successCriteria?: string[];
  constraints?: string[];
  dependencies?: string[];
  riskLevel?: TargetState['riskLevel'];
}): TargetState {
  return {
    targetId: crypto.randomUUID(),
    name: params.name,
    description: params.description,
    capabilities: params.capabilities ?? [],
    successCriteria: params.successCriteria ?? [],
    constraints: params.constraints ?? [],
    dependencies: params.dependencies ?? [],
    riskLevel: params.riskLevel ?? 'medium',
  };
}
