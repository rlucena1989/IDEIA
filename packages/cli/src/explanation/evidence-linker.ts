import { EvidenceLink } from './explanation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('evidence-linker');

export function linkEvidence(items: Array<{
  sourceType: EvidenceLink['sourceType'];
  sourceRef: string;
  description: string;
}>): EvidenceLink[] {
  return items.map(item => ({
    evidenceId: `evidence-${Date.now()}-${item.sourceRef}`,
    ...item,
  }));
}
