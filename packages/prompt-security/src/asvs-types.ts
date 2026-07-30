export interface AsvsCheck {
  id: string;
  name: string;
  category: AsvsCategory;
  level: 1 | 2 | 3;
  passed: boolean;
  evidence: string;
  details?: string;
}

export interface AsvsCategoryResult {
  category: AsvsCategory;
  name: string;
  total: number;
  passed: number;
  checks: AsvsCheck[];
}

export interface LevelSummary {
  total: number;
  passed: number;
  percent: number;
}

export interface AsvsReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    overallPercent: number;
  };
  l1Summary: LevelSummary;
  l2Summary: LevelSummary;
  l3Summary: LevelSummary;
  categories: AsvsCategoryResult[];
  timestamp: string;
}

export type AsvsCategory = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10' | 'V11' | 'V12' | 'V13';

export const ASVS_CATEGORIES: Record<AsvsCategory, string> = {
  V1: 'Architecture/Design/Threat Modeling',
  V2: 'Authentication',
  V3: 'Session Management',
  V4: 'Access Control',
  V5: 'Validation/Sanitization',
  V6: 'Storage Cryptography',
  V7: 'Error Handling',
  V8: 'Data Protection',
  V9: 'Communications',
  V10: 'Malicious Code',
  V11: 'Business Logic',
  V12: 'Secure File Upload',
  V13: 'API and Web Service',
};

export interface AsvsCheckDefinition {
  id: string;
  name: string;
  category: AsvsCategory;
  level: 1 | 2 | 3;
  check: (rootDir: string) => AsvsCheck;
}
