export type CertificationStatus = 'none'|'in_progress'|'achieved'|'expired'|'revoked';
export interface Certification { id: string; name: string; standard: string; status: CertificationStatus; achievedAt?: string; expiresAt?: string; evidence: string[]; }
export interface ComplianceCheck { name: string; category: string; passed: boolean; details: string; timestamp: string; }
export interface TrustReport { certifications: Certification[]; checks: ComplianceCheck[]; score: number; level: 'low'|'medium'|'high'|'critical'; }
