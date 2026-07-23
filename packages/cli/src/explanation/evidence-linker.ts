import { EvidenceLink } from './explanation-types';

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
