export interface GapRecord {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'wontfix';
  createdAt: string;
  resolvedAt?: string;
  module: string;
}

export interface ComplianceReport {
  totalDocuments: number;
  totalGaps: number;
  openGaps: number;
  resolvedGaps: number;
  compliant: boolean;
  checks: ComplianceCheck[];
}

export interface ComplianceCheck {
  name: string;
  passed: boolean;
  details: string;
}

export interface DocumentRecord {
  id: string;
  path: string;
  title: string;
  lastUpdated: string;
}
