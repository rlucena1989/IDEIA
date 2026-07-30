export type KeyType = 'operator' | 'account' | 'user';

export const KEY_PREFIXES: Record<KeyType, string> = {
  operator: 'O',
  account: 'A',
  user: 'U',
};

export interface NKEYPair {
  publicKey: string;
  seed: Uint8Array;
  sign(data: Uint8Array): Uint8Array;
  verify(data: Uint8Array, sig: Uint8Array): boolean;
}

export interface OperatorJWT {
  jwt: string;
  payload: OperatorClaims;
}

export interface AccountJWT {
  jwt: string;
  payload: AccountClaims;
}

export interface UserJWT {
  jwt: string;
  payload: UserClaims;
}

export interface OperatorClaims {
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
  name: string;
  type: 'operator';
  nkey: string;
  signingKeys: string[];
  accountServerUrl: string;
  operatorServiceUrls: string[];
  maxTokenTTL: number;
}

export interface AccountClaims {
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
  name: string;
  type: 'account';
  nkey: string;
  signingKeys: string[];
  limits: AccountLimits;
  exports: StreamExport[];
  imports: StreamImport[];
  revocations: Record<string, number>;
}

export interface UserClaims {
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
  name: string;
  type: 'user';
  nkey: string;
  account: string;
  pub: SubjectPermission;
  allow_sub: string[];
  deny_sub: string[];
  subs: number;
  data: number;
  payload: number;
  tags: string[];
}

export interface AccountLimits {
  subs: number;
  data: number;
  payload: number;
  imports: number;
  exports: number;
}

export interface SubjectPermission {
  allow: string[];
  deny: string[];
}

export interface PermissionMap {
  identity: string;
  account: string;
  publish: SubjectPermission;
  subscribe: SubjectPermission;
  queueGroup?: QueueGroupRestriction;
  response?: ResponsePermission;
  priority: number;
  expiresAt?: number;
  tags?: string[];
}

export interface QueueGroupRestriction {
  allow: string[];
  deny: string[];
}

export interface ResponsePermission {
  allow: string[];
  maxMessages: number;
  ttl: number;
}

export interface PubAllow {
  subject: string;
  maxMessages?: number;
}

export interface SubAllow {
  subject: string;
  queueGroup?: string;
}

export interface TLSConfig {
  enabled: boolean;
  certFile: string;
  keyFile: string;
  caFile: string;
  verifyClient: boolean;
  mapCertToUser: boolean;
  handshakeTimeout: number;
  minVersion?: string;
  maxVersion?: string;
  cipherSuites?: string[];
  ecdhCurve?: string;
  sessionTimeout?: number;
  sessionCacheSize?: number;
}

export interface CACert {
  pem: string;
  fingerprint: string;
  expiresAt: number;
}

export interface ClientCert {
  pem: string;
  commonName: string;
  issuer: string;
  notBefore: number;
  notAfter: number;
  serialNumber: string;
  fingerprint: string;
}

export interface CertValidity {
  valid: boolean;
  reason?: string;
  expiresInDays?: number;
  issuerMatch?: boolean;
  notBeforeValid?: boolean;
  notAfterValid?: boolean;
}

export interface AuthCalloutRequest {
  clientNkey: string;
  clientIp: string;
  clientCert?: string;
  account?: string;
  tags?: string[];
  timestamp: number;
}

export interface AuthCalloutResponse {
  ok: boolean;
  jwt?: string;
  userNkey?: string;
  expiry?: number;
  error?: string;
}

export interface TenantConfig {
  name: string;
  nkey: string;
  signingKeys: string[];
  limits: AccountLimits;
  exports: StreamExport[];
  imports: StreamImport[];
  users: TenantUserConfig[];
}

export interface TenantUserConfig {
  identity: string;
  pubAllow: string[];
  pubDeny: string[];
  subAllow: string[];
  subDeny: string[];
  tags?: string[];
  ttlMs: number;
}

export interface StreamExport {
  name: string;
  subject: string;
  type: 'stream' | 'service';
  tokenReq: boolean;
  accountTokenPosition?: number;
  approvedAccounts?: string[];
  latency?: LatencyConfig;
}

export interface StreamImport {
  name: string;
  subject: string;
  account: string;
  type: 'stream' | 'service';
  localSubject?: string;
}

export interface LatencyConfig {
  sampling: number;
  subject: string;
}

export interface ServiceExport {
  name: string;
  subject: string;
  accounts: string[];
  latency?: LatencyConfig;
}

export interface ThreatModel {
  component: string;
  threats: STRIDEComponent[];
  overallRisk: RiskLevel;
  attackSurface: AttackVector[];
  mitigations: Mitigation[];
  lastUpdated: number;
}

export interface STRIDEComponent {
  category: STRIDECategory;
  threat: string;
  impact: RiskLevel;
  probability: RiskLevel;
  description: string;
}

export type STRIDECategory = 'spoofing' | 'tampering' | 'repudiation' | 'information_disclosure' | 'denial_of_service' | 'elevation_of_privilege';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface AttackVector {
  id: string;
  name: string;
  description: string;
  component: string;
  likelihood: RiskLevel;
  impact: RiskLevel;
  prerequisites: string[];
}

export interface Mitigation {
  id: string;
  threatId: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  priority: RiskLevel;
  implemented: boolean;
}
