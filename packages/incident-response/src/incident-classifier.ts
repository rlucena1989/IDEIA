import type { IncidentSeverity, IncidentType, DetectionSource } from './types';
import { createLogger } from '@ideia/logger';

export interface ClassificationInput {
  agentId: string;
  actions: Array<{ type: string; destination?: string; payload?: string }>;
  filesAffected: string[];
  agentsAffected: number;
  violationCount: number;
  pattern?: string;
  source?: DetectionSource;
  llmPrompt?: string;
  llmResponse?: string;
  context?: Record<string, unknown>;
}

export interface ClassificationResult {
  severity: IncidentSeverity;
  type: IncidentType;
  confidence: number;
  factors: string[];
  score: number;
}

export class IncidentClassifier {
  classify(input: ClassificationInput): ClassificationResult {
    const factors = this._evaluateFactors(input);
    const score = Object.values(factors).filter(Boolean).length;
    const severity = this._computeSeverity(factors, score);
    const type = this._classifyType(input);
    const confidence = this._computeConfidence(factors, score);

    return {
      severity,
      type,
      confidence,
      factors: Object.entries(factors).filter(([, v]) => v).map(([k]) => k),
      score,
    };
  }

  private _evaluateFactors(input: ClassificationInput): Record<string, boolean> {
    return {
      fileModification: input.actions.some(a => a.type === 'file:write' || a.type === 'file:delete'),
      dataExfiltration: input.actions.some(a => a.type === 'network:connect' && a.destination !== 'local'),
      shellExecution: input.actions.some(a => a.type === 'shell:execute'),
      multipleAgents: input.agentsAffected > 1,
      sensitiveFiles: input.filesAffected.some(f =>
        /\.(key|pem|env|secret|sql|dump|p12|jks|cer|crt|p7b|pfx)$/i.test(f) ||
        /(password|token|secret|credential|\.env)/i.test(f)
      ),
      repeatedViolation: input.violationCount > 3,
      privilegeEscalation: input.actions.some(a => a.type === 'sudo' || a.type === 'su' || a.type === 'runas'),
      dataDestruction: input.actions.some(a =>
        a.type === 'file:delete' &&
        /^(bin|boot|dev|etc|lib|sys|usr|windows|system32)/i.test(a.destination || '')
      ),
      credentialAccess: input.actions.some(a =>
        a.type === 'file:read' && /(passwd|shadow|\.htpasswd)/i.test(a.destination || '')
      ),
      lateralMovement: input.agentsAffected > 2,
      persistence: input.actions.some(a =>
        a.type === 'file:write' &&
        /(cron|systemd|registry|startup|autorun)/i.test(a.destination || '')
      ),
      llmManipulation: input.pattern === 'prompt_injection' || input.pattern === 'jailbreak' || input.pattern === 'model_poisoning',
    };
  }

  private _computeSeverity(factors: Record<string, boolean>, score: number): IncidentSeverity {
    if (factors.privilegeEscalation || factors.dataDestruction) return 'P0';
    if (factors.llmManipulation && factors.credentialAccess) return 'P0';
    if (score >= 6) return 'P0';
    if (score >= 4) return 'P1';
    if (score >= 2) return 'P2';
    if (score >= 1) return 'P3';
    return 'P4';
  }

  private _classifyType(input: ClassificationInput): IncidentType {
    if (input.pattern === 'prompt_injection' || input.pattern === 'jailbreak' || input.pattern === 'model_poisoning') {
      return 'intrusion';
    }
    if (input.actions.some(a => a.type === 'file:read' && /(passwd|shadow|credential)/i.test(a.destination || ''))) {
      return 'data_breach';
    }
    if (input.actions.some(a => a.type === 'file:delete' || a.type === 'file:write')) {
      return 'malware';
    }
    if (input.agentsAffected > 2) {
      return 'intrusion';
    }
    if (input.actions.some(a => a.type === 'network:connect')) {
      return 'data_breach';
    }
    return 'intrusion';
  }

  private _computeConfidence(_factors: Record<string, boolean>, score: number): number {
    if (score >= 6) return 0.95;
    if (score >= 4) return 0.85;
    if (score >= 2) return 0.7;
    if (score >= 1) return 0.5;
    return 0.2;
  }
}
