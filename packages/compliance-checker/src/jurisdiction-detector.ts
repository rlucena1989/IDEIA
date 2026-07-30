import { UserProfile, Region, Jurisdiction, DataCategory, RegulationFramework } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('jurisdiction-detector');

interface FrameworkEntry {
  framework: RegulationFramework;
  required: boolean;
}

export class JurisdictionDetector {
  private geoDatabase: Map<string, Region> = new Map([
    ['BR', 'BR'], ['PT', 'BR'],
    ['DE', 'EU'], ['FR', 'EU'], ['IT', 'EU'], ['ES', 'EU'],
    ['UK', 'EU'], ['NL', 'EU'], ['SE', 'EU'], ['DK', 'EU'],
    ['FI', 'EU'], ['AT', 'EU'], ['BE', 'EU'], ['IE', 'EU'],
    ['PL', 'EU'], ['CZ', 'EU'], ['PT', 'EU'], ['GR', 'EU'],
    ['HU', 'EU'], ['RO', 'EU'], ['BG', 'EU'], ['HR', 'EU'],
    ['SK', 'EU'], ['SI', 'EU'], ['LT', 'EU'], ['LV', 'EU'],
    ['EE', 'EU'], ['LU', 'EU'], ['CY', 'EU'], ['MT', 'EU'],
    ['US', 'US'], ['CA', 'US'],
    ['JP', 'GLOBAL'], ['AU', 'GLOBAL'], ['SG', 'GLOBAL'],
    ['KR', 'GLOBAL'], ['IN', 'GLOBAL'], ['ZA', 'GLOBAL'],
  ]);

  private frameworkMap: Record<Region, FrameworkEntry[]> = {
    BR: [{ framework: 'LGPD', required: true }],
    EU: [
      { framework: 'GDPR', required: true },
      { framework: 'ISO27001', required: false },
    ],
    US: [
      { framework: 'SOC2', required: false },
      { framework: 'CCPA', required: true },
    ],
    US_HEALTH: [
      { framework: 'HIPAA', required: true },
      { framework: 'SOC2', required: false },
    ],
    GLOBAL: [
      { framework: 'ISO27001', required: false },
      { framework: 'PCI_DSS', required: false },
    ],
  };

  detect(user: UserProfile): Jurisdiction[] {
    const jurisdictions: Jurisdiction[] = [];
    const primaryRegion = this.getRegion(user.country);
    const frameworks = this.frameworkMap[primaryRegion] || [];

    jurisdictions.push({
      region: primaryRegion,
      frameworks: frameworks.filter(f => f.required).map(f => f.framework),
      dataResidencyRequired: this.isDataResidencyRequired(primaryRegion, user.dataCategories),
      dataResidencyRegion: primaryRegion,
      authority: this.getAuthority(primaryRegion),
      consentRequired: this.isConsentRequired(primaryRegion, user.dataCategories),
      breachNotificationHours: this.getBreachNotificationHours(primaryRegion),
      maxRetentionDays: this.getMaxRetentionDays(primaryRegion),
      encryptionRequired: this.isEncryptionRequired(user.dataCategories),
    });

    if (user.healthData && primaryRegion !== 'US_HEALTH') {
      jurisdictions.push({
        region: 'US_HEALTH',
        frameworks: ['HIPAA'],
        dataResidencyRequired: true,
        dataResidencyRegion: 'US',
        authority: 'HHS',
        consentRequired: true,
        breachNotificationHours: 60,
        maxRetentionDays: 6 * 365,
        encryptionRequired: true,
      });
    }

    if (user.paymentData) {
      const existingPCI = jurisdictions.find(j => j.frameworks.includes('PCI_DSS'));
      if (!existingPCI) {
        jurisdictions.push({
          region: 'GLOBAL',
          frameworks: ['PCI_DSS'],
          dataResidencyRequired: false,
          authority: 'PCI SSC',
          consentRequired: false,
          breachNotificationHours: 24,
          maxRetentionDays: 365,
          encryptionRequired: true,
        });
      }
    }

    return jurisdictions;
  }

  detectByCountry(countryCode: string): Region[] {
    const region = this.getRegion(countryCode);
    return [region];
  }

  detectByDataCategory(categories: DataCategory[]): Region[] {
    const regions: Region[] = [];
    if (categories.includes('health')) regions.push('US_HEALTH');
    if (categories.includes('payment')) regions.push('GLOBAL');
    if (categories.includes('personal')) { regions.push('BR'); regions.push('EU'); }
    return [...new Set(regions)];
  }

  getConflictMatrix(): { region1: Region; region2: Region; conflictAreas: string[] }[] {
    return [
      { region1: 'BR', region2: 'EU', conflictAreas: ['data_retention', 'consent_age'] },
      { region1: 'EU', region2: 'US', conflictAreas: ['data_retention', 'breach_notification'] },
      { region1: 'BR', region2: 'US_HEALTH', conflictAreas: ['encryption', 'data_residency'] },
    ];
  }

  private getRegion(country: string): Region {
    const upper = country.toUpperCase();
    const mapped = this.geoDatabase.get(upper);
    if (mapped) return mapped;
    return 'GLOBAL';
  }

  private isDataResidencyRequired(region: Region, categories: DataCategory[]): boolean {
    if (region === 'BR') return categories.includes('personal') || categories.includes('financial');
    if (region === 'EU') return true;
    if (region === 'US_HEALTH') return categories.includes('health');
    return false;
  }

  private getAuthority(region: Region): string {
    const authorities: Record<Region, string> = {
      BR: 'ANPD', EU: 'EDPB', US: 'FTC',
      US_HEALTH: 'HHS', GLOBAL: 'ISO',
    };
    return authorities[region] || 'Unknown';
  }

  private isConsentRequired(region: Region, categories: DataCategory[]): boolean {
    if (region === 'BR') return categories.includes('personal');
    if (region === 'EU') return true;
    if (region === 'US_HEALTH') return categories.includes('health');
    return false;
  }

  private getBreachNotificationHours(region: Region): number {
    const hours: Record<Region, number> = {
      BR: 48, EU: 72, US: 0, US_HEALTH: 60, GLOBAL: 72,
    };
    return hours[region] || 72;
  }

  private getMaxRetentionDays(region: Region): number {
    const days: Record<Region, number> = {
      BR: 365, EU: 365, US: 730, US_HEALTH: 2190, GLOBAL: 365,
    };
    return days[region] || 365;
  }

  private isEncryptionRequired(categories: DataCategory[]): boolean {
    return categories.includes('health') || categories.includes('financial')
        || categories.includes('payment') || categories.includes('biometric');
  }
}
