export type BumpType = 'major' | 'minor' | 'patch' | 'none';
export type ContractStatus = 'compatible' | 'breaking' | 'unknown';
export type InteractionType = 'request-response' | 'event' | 'command';

export interface ContractDiff {
  moduleA: string;
  moduleB: string;
  changes: string[];
  breaking: boolean;
  classification: BumpType;
}

export interface VersionSuggestion {
  current: string;
  suggested: string;
  bump: BumpType;
  reason: string;
}

export interface CDCEndpoint {
  method: string;
  path: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

export interface PactInteraction {
  description: string;
  type: InteractionType;
  providerState?: string;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface PactContract {
  consumer: string;
  provider: string;
  interactions: PactInteraction[];
  metadata?: Record<string, unknown>;
  version: string;
}

export interface CDCContract {
  consumer: string;
  provider: string;
  endpoints: CDCEndpoint[];
  version: string;
}

export interface ConsumerExpectation {
  consumer: string;
  provider: string;
  interaction: PactInteraction;
  createdAt: string;
  verified: boolean;
}

export interface ProviderVerificationResult {
  provider: string;
  passed: boolean;
  failures: Array<{ interaction: string; reason: string; expected: unknown; actual: unknown }>;
  summary: { total: number; passed: number; failed: number };
}

export interface CompatibilityMatrixEntry {
  compatible: boolean;
  status: ContractStatus;
  consumerVersion: string;
  providerVersion: string;
  diff: ContractDiff | null;
  lastVerified: string | null;
}

export interface CompatibilityMatrix {
  consumers: string[];
  providers: string[];
  matrix: Record<string, Record<string, CompatibilityMatrixEntry>>;
  generatedAt: string;
}

export interface PublishedContract {
  consumer: string;
  provider: string;
  version: string;
  pact: PactContract;
  publishedAt: string;
  checksum: string;
}
