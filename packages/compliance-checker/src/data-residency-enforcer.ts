import { DataFlow, DataCategory, Region, DataResidencyConfig, DataResidencyViolation } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('data-residency-enforcer');

export class DataResidencyEnforcer {
  private readonly RESTRICTED_CATEGORIES: DataCategory[] = ['health', 'biometric', 'children'];
  private readonly ENCRYPTION_ALGORITHMS = ['AES-256', 'AES-256-GCM', 'ChaCha20-Poly1305'];

  enforce(dataFlows: DataFlow[], config: DataResidencyConfig): DataResidencyViolation[] {
    const violations: DataResidencyViolation[] = [];

    for (const flow of dataFlows) {
      this.checkCrossBorder(flow, config, violations);
      this.checkHealthEncryption(flow, config, violations);
      this.checkConsent(flow, violations);
      this.checkRetention(flow, violations);
    }

    return violations;
  }

  private checkCrossBorder(
    flow: DataFlow, config: DataResidencyConfig, violations: DataResidencyViolation[],
  ): void {
    if (flow.sourceRegion === flow.destinationRegion) return;

    const hasRestrictedData = flow.dataCategories.some(c => this.RESTRICTED_CATEGORIES.includes(c));

    if (hasRestrictedData && config.crossBorderTransferPolicy === 'prohibited') {
      const restrictedCategory = flow.dataCategories.find(c => this.RESTRICTED_CATEGORIES.includes(c));
      violations.push({
        dataFlowId: flow.id,
        dataCategory: restrictedCategory ?? 'personal',
        sourceRegion: flow.sourceRegion,
        destinationRegion: flow.destinationRegion,
        violationType: 'cross_border',
        severity: 'critical',
        remediation: `Keep ${flow.dataCategories.join(', ')} data in ${flow.sourceRegion}`,
      });
    }

    if (!flow.encryption) {
      violations.push({
        dataFlowId: flow.id,
        dataCategory: 'personal',
        sourceRegion: flow.sourceRegion,
        destinationRegion: flow.destinationRegion,
        violationType: 'no_encryption',
        severity: 'high',
        remediation: `Enable encryption for cross-border transfer: ${flow.sourceRegion} -> ${flow.destinationRegion}`,
      });
    }
  }

  private checkHealthEncryption(
    flow: DataFlow, config: DataResidencyConfig, violations: DataResidencyViolation[],
  ): void {
    if (!flow.dataCategories.includes('health')) return;
    if (this.ENCRYPTION_ALGORITHMS.includes(config.encryptionAlgorithm)) return;

    violations.push({
      dataFlowId: flow.id,
      dataCategory: 'health',
      sourceRegion: flow.sourceRegion,
      destinationRegion: flow.destinationRegion,
      violationType: 'no_encryption',
      severity: 'critical',
      remediation: 'Use AES-256-GCM or ChaCha20-Poly1305 for health data',
    });
  }

  private checkConsent(flow: DataFlow, violations: DataResidencyViolation[]): void {
    if (flow.hasConsent) return;
    if (flow.sourceRegion !== 'EU' && flow.sourceRegion !== 'BR') return;

    violations.push({
      dataFlowId: flow.id,
      dataCategory: 'personal',
      sourceRegion: flow.sourceRegion,
      destinationRegion: flow.destinationRegion,
      violationType: 'no_consent',
      severity: 'high',
      remediation: `Obtain explicit consent for data processing in ${flow.sourceRegion}`,
    });
  }

  private checkRetention(flow: DataFlow, violations: DataResidencyViolation[]): void {
    const maxRetention = this.getMaxRetentionForRegion(flow.sourceRegion);
    if (flow.retentionDays <= maxRetention) return;

    violations.push({
      dataFlowId: flow.id,
      dataCategory: 'personal',
      sourceRegion: flow.sourceRegion,
      destinationRegion: flow.destinationRegion,
      violationType: 'excessive_retention',
      severity: 'medium',
      remediation: `Reduce retention from ${flow.retentionDays} to ${maxRetention} days`,
    });
  }

  private getMaxRetentionForRegion(region: Region): number {
    const map: Record<Region, number> = {
      BR: 365, EU: 365, US: 730, US_HEALTH: 2190, GLOBAL: 365,
    };
    return map[region] ?? 365;
  }
}
