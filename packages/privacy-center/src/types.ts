export type ConsentStatus = 'granted' | 'revoked' | 'expired' | 'pending';

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type DSRType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';

export interface DSRRequest {
  id: string;
  userId: string;
  type: DSRType;
  status: 'open' | 'in_progress' | 'completed' | 'rejected';
  description: string;
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface PrivacyPolicy {
  id: string;
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  status: 'active' | 'draft' | 'archived';
}

export interface PrivacyCenterConfig {
  autoExpireConsentDays: number;
  dsrProcessingDays: number;
}
