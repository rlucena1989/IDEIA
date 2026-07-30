import { Region, ConflictResult, RegionalCheckResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('conflict-resolver');

interface RegionData {
  maxRetentionDays: number;
  encryptionRequired: boolean;
  consentRequired: boolean;
  breachNotificationHours: number;
  dataResidencyRequired: boolean;
  authority: string;
}

export class ConflictResolver {
  resolve(regions: Region[], jurisdictionData: Map<Region, RegionData>): ConflictResult[] {
    const conflicts: ConflictResult[] = [];

    const retentionConflict = this.resolveRetentionConflict(regions, jurisdictionData);
    if (retentionConflict) conflicts.push(retentionConflict);

    const encryptionConflict = this.resolveEncryptionConflict(regions, jurisdictionData);
    if (encryptionConflict) conflicts.push(encryptionConflict);

    const consentConflict = this.resolveConsentConflict(regions, jurisdictionData);
    if (consentConflict) conflicts.push(consentConflict);

    const notificationConflict = this.resolveNotificationConflict(regions, jurisdictionData);
    if (notificationConflict) conflicts.push(notificationConflict);

    const residencyConflict = this.resolveResidencyConflict(regions, jurisdictionData);
    if (residencyConflict) conflicts.push(residencyConflict);

    return conflicts;
  }

  resolveResults(results: RegionalCheckResult[]): RegionalCheckResult[] {
    const merged: RegionalCheckResult[] = [];
    const grouped = this.groupByArticle(results);

    for (const [, group] of grouped) {
      const hasFailure = group.some(r => !r.passed);
      const strictestRegion = group.reduce((a, b) =>
        this.regionSeverity(a.region) > this.regionSeverity(b.region) ? a : b
      );

      if (hasFailure && group.length > 1) {
        merged.push({
          passed: false,
          details: `[CONFLICT RESOLVED] Follow strictest (${strictestRegion.region}): ${strictestRegion.details}`,
          evidence: group.flatMap(r => r.evidence),
          remediation: group.find(r => r.remediation)?.remediation,
          region: strictestRegion.region,
        });
      } else {
        merged.push(strictestRegion);
      }
    }

    return merged;
  }

  private resolveRetentionConflict(regions: Region[], data: Map<Region, RegionData>): ConflictResult | null {
    const retentionDays = regions.map(r => ({ region: r, days: data.get(r)?.maxRetentionDays ?? 365 }));
    const uniqueDays = [...new Set(retentionDays.map(r => r.days))];
    if (uniqueDays.length <= 1) return null;

    const strictest = retentionDays.reduce((a, b) => a.days < b.days ? a : b);
    const overridden = retentionDays.filter(r => r.days !== strictest.days).map(r => r.region);

    return {
      ruleId: 'dataRetention',
      regions,
      conflictType: 'retention',
      resolution: 'follow_strictest',
      appliedValue: strictest.days,
      overriddenRules: overridden.map(r => `${r}: ${this.getRetentionReason(r)}`),
    };
  }

  private resolveEncryptionConflict(regions: Region[], data: Map<Region, RegionData>): ConflictResult | null {
    const encryptionValues = regions.map(r => ({ region: r, required: data.get(r)?.encryptionRequired ?? false }));
    const allSame = encryptionValues.every(e => e.required === encryptionValues[0].required);
    if (allSame) return null;

    return {
      ruleId: 'encryptionRequired',
      regions,
      conflictType: 'encryption',
      resolution: 'follow_strictest',
      appliedValue: true,
      overriddenRules: encryptionValues.filter(e => !e.required).map(e => `${e.region}: encryption not required`),
    };
  }

  private resolveConsentConflict(regions: Region[], data: Map<Region, RegionData>): ConflictResult | null {
    const consentValues = regions.map(r => ({ region: r, required: data.get(r)?.consentRequired ?? false }));
    const allSame = consentValues.every(c => c.required === consentValues[0].required);
    if (allSame) return null;

    return {
      ruleId: 'consentRequired',
      regions,
      conflictType: 'consent',
      resolution: 'follow_strictest',
      appliedValue: true,
      overriddenRules: consentValues.filter(c => !c.required).map(c => `${c.region}: consent not required`),
    };
  }

  private resolveNotificationConflict(regions: Region[], data: Map<Region, RegionData>): ConflictResult | null {
    const hours = regions.map(r => ({ region: r, h: data.get(r)?.breachNotificationHours ?? 72 }));
    const uniqueHours = [...new Set(hours.map(h => h.h))];
    if (uniqueHours.length <= 1) return null;

    const strictest = hours.reduce((a, b) => a.h < b.h ? a : b);
    return {
      ruleId: 'breachNotificationHours',
      regions,
      conflictType: 'notification',
      resolution: 'follow_strictest',
      appliedValue: strictest.h,
      overriddenRules: hours.filter(h => h.h !== strictest.h).map(h => `${h.region}: ${h.h}h`),
    };
  }

  private resolveResidencyConflict(regions: Region[], data: Map<Region, RegionData>): ConflictResult | null {
    const residencyRegions = regions.filter(r => data.get(r)?.dataResidencyRequired);
    if (residencyRegions.length <= 1) return null;

    return {
      ruleId: 'dataResidency',
      regions,
      conflictType: 'residency',
      resolution: 'merge_requirements',
      appliedValue: residencyRegions.map(r => ({ region: r, requiredBy: data.get(r)?.authority ?? 'Unknown' })),
      overriddenRules: regions.filter(r => !residencyRegions.includes(r)).map(r => `${r}: no residency requirement`),
    };
  }

  private groupByArticle(results: RegionalCheckResult[]): Map<string, RegionalCheckResult[]> {
    const groups = new Map<string, RegionalCheckResult[]>();
    for (const r of results) {
      const key = r.details.substring(0, 30);
      const existing = groups.get(key);
      if (existing) {
        existing.push(r);
      } else {
        groups.set(key, [r]);
      }
    }
    return groups;
  }

  private regionSeverity(region: Region): number {
    const order: Record<Region, number> = {
      US_HEALTH: 5, BR: 4, EU: 3, US: 2, GLOBAL: 1,
    };
    return order[region] ?? 0;
  }

  private getRetentionReason(region: Region): string {
    const reasons: Record<Region, string> = {
      BR: 'LGPD Art. 15: 365 days', EU: 'GDPR Art. 5(1)(e): 365 days',
      US: 'SOC2: 730 days', US_HEALTH: 'HIPAA 164.308: 2190 days',
      GLOBAL: 'Standard: 365 days',
    };
    return reasons[region] || 'Standard retention';
  }
}
