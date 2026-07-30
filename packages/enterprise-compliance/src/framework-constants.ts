import { TrustPrinciple, ComplianceFramework } from './types';

export const SOC2_TRUST_PRINCIPLES: TrustPrinciple[] = ['security', 'availability', 'processing_integrity', 'confidentiality', 'privacy'];

export const FRAMEWORK_REQUIREMENTS: Record<ComplianceFramework, string[]> = {
  soc2: ['CC1.1', 'CC2.1', 'CC2.2', 'CC3.1', 'CC3.2', 'CC4.1', 'CC4.2', 'CC5.1', 'CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6', 'CC7.1', 'CC7.2', 'CC7.3', 'CC7.4', 'CC8.1', 'CC9.1'],
  iso27001: ['A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10', 'A.11', 'A.12', 'A.13', 'A.14', 'A.15', 'A.16', 'A.17', 'A.18'],
  gdpr: ['Art.5', 'Art.6', 'Art.7', 'Art.9', 'Art.12', 'Art.15', 'Art.16', 'Art.17', 'Art.18', 'Art.20', 'Art.21', 'Art.22', 'Art.25', 'Art.28', 'Art.30', 'Art.32', 'Art.33', 'Art.35', 'Art.37'],
  lgpd: ['Art.7', 'Art.9', 'Art.15', 'Art.17', 'Art.18', 'Art.19', 'Art.20', 'Art.21', 'Art.37', 'Art.39', 'Art.41', 'Art.46', 'Art.48'],
  hipaa: ['164.308(a)(1)', '164.308(a)(2)', '164.308(a)(3)', '164.308(a)(4)', '164.308(a)(5)', '164.308(a)(6)', '164.308(a)(7)', '164.308(b)', '164.310', '164.312(a)', '164.312(b)', '164.312(c)', '164.312(d)', '164.312(e)'],
  'pci-dss': ['Req.1', 'Req.2', 'Req.3', 'Req.4', 'Req.5', 'Req.6', 'Req.7', 'Req.8', 'Req.9', 'Req.10', 'Req.11', 'Req.12'],
};

export interface ScenarioDefinition {
  framework: ComplianceFramework;
  requirementId: string;
  scenario: string;
  expectedOutcome: 'pass' | 'fail';
  condition: () => boolean;
}
