export enum ComplianceFramework {
  SOC2 = 'SOC2',
  LGPD = 'LGPD',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
}

export enum ControlStatus {
  implemented = 'implemented',
  partial = 'partial',
  missing = 'missing',
  not_applicable = 'not_applicable',
}

export interface ControlRecord {
  id: string;
  framework: ComplianceFramework;
  criterion: string;
  article?: string;
  description: string;
  status: ControlStatus;
  evidence: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceRecord {
  id: string;
  controlId: string;
  type: 'log' | 'screenshot' | 'config' | 'policy';
  content: string;
  timestamp: Date;
  hash: string;
}

export interface ComplianceScore {
  framework: ComplianceFramework;
  total: number;
  implemented: number;
  partial: number;
  missing: number;
  score: number;
  level: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  scores: ComplianceScore[];
  controls: ControlRecord[];
  generatedAt: Date;
  period: string;
}
