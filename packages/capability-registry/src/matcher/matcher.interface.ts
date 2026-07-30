import type { CapabilityMatch } from '../types/capability';
import { createLogger } from '@ideia/logger';
const logger = createLogger('matcher.interface');

export interface MatchRequest {
  text: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
  versionMin?: string;
  limit?: number;
}

export interface ICapabilityMatcher {
  match(request: MatchRequest): Promise<CapabilityMatch[]>;
  matchExact(id: string): Promise<CapabilityMatch | null>;
  getSimilar(id: string, limit?: number): Promise<CapabilityMatch[]>;
}
