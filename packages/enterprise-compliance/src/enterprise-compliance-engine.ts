import { randomUUID, createHash } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import { ComplianceFramework, Control, ControlStatus, ControlSeverity, FrameworkRequirement, ComplianceScore, DataSubjectRight } from './types';
import { SOC2_TRUST_PRINCIPLES, FRAMEWORK_REQUIREMENTS, ScenarioDefinition } from './framework-constants';

export class EnterpriseComplianceEngine {
  private _controls: Map<string, Control> = new Map();
  private _requirements: Map<string, FrameworkRequirement> = new Map();
  private _scenarios: ScenarioDefinition[] = [];
  private _logger: Logger;

  constructor() {
    this._logger = createLogger('enterprise-compliance-engine');
    this._registerDefaultRequirements();
  }

  registerControl(control: Omit<Control, 'id'>): Control {
    const full: Control = { ...control, id: randomUUID() };
    this._controls.set(full.id, full);
    this._logger.info('Control registered', { controlId: full.controlId, framework: full.framework });
    return full;
  }

  getControl(id: string): Control | undefined {
    return this._controls.get(id);
  }

  getControlsByFramework(framework: ComplianceFramework): Control[] {
    return Array.from(this._controls.values()).filter((c) => c.framework === framework);
  }

  getControlsByStatus(status: ControlStatus): Control[] {
    return Array.from(this._controls.values()).filter((c) => c.status === status);
  }

  getControlsByOwner(owner: string): Control[] {
    return Array.from(this._controls.values()).filter((c) => c.owner === owner);
  }

  getControlsByDependency(depId: string): Control[] {
    return Array.from(this._controls.values()).filter((c) => c.dependsOn.includes(depId));
  }

  updateControlStatus(id: string, status: ControlStatus, notes?: string): boolean {
    const ctrl = this._controls.get(id);
    if (ctrl == null) return false;
    ctrl.status = status;
    if (notes != null) {
      ctrl.remediationNotes = notes;
    }
    ctrl.lastTested = new Date().toISOString();
    this._logger.info('Control status updated', { controlId: ctrl.controlId, status });
    return true;
  }

  getRequirementsByFramework(framework: ComplianceFramework): FrameworkRequirement[] {
    return Array.from(this._requirements.values()).filter((r) => r.framework === framework);
  }

  getFrameworkScore(framework: ComplianceFramework): { passing: number; total: number; score: number } {
    const fwControls = this.getControlsByFramework(framework);
    const total = fwControls.length;
    const passing = fwControls.filter((c) => c.status === 'implemented').length;
    const partial = fwControls.filter((c) => c.status === 'partial').length;
    const weighted = total > 0 ? Math.round(((passing + partial * 0.5) / total) * 100) : 0;
    return { passing, total, score: weighted };
  }

  getAllFrameworkScores(): Partial<Record<ComplianceFramework, { passing: number; total: number; score: number }>> {
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    const result: Partial<Record<ComplianceFramework, { passing: number; total: number; score: number }>> = {};
    for (const fw of frameworks) {
      result[fw] = this.getFrameworkScore(fw);
    }
    return result;
  }

  calculateOverallScore(): ComplianceScore {
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    const weights: Record<ComplianceFramework, number> = {
      soc2: 0.30,
      iso27001: 0.15,
      gdpr: 0.15,
      lgpd: 0.15,
      hipaa: 0.15,
      'pci-dss': 0.10,
    };

    const byFramework: Partial<Record<ComplianceFramework, number>> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const fw of frameworks) {
      const score = this.getFrameworkScore(fw);
      byFramework[fw] = score.score;
      const wt = weights[fw];
      weightedSum += score.score * wt;
      totalWeight += wt;
    }

    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    const allControls = Array.from(this._controls.values());
    const implementedCount = allControls.filter((c) => c.status === 'implemented').length;
    const evidenceScore = allControls.length > 0 ? Math.round((implementedCount / allControls.length) * 100) : 0;

    return {
      overall,
      byFramework,
      byDimension: {
        controls: overall,
        evidence: evidenceScore,
        testing: Math.round(evidenceScore * 0.9),
        documentation: Math.round(evidenceScore * 0.8),
      },
      lastUpdated: new Date().toISOString(),
      trend: this._calculateTrend(),
    };
  }

  addScenario(scenario: Omit<ScenarioDefinition, 'framework' | 'requirementId'> & { framework: ComplianceFramework; requirementId: string }): void {
    this._scenarios.push(scenario);
  }

  runScenarioTests(): { passed: number; failed: number; total: number; results: Array<{ scenario: string; passed: boolean }> } {
    let passed = 0;
    let failed = 0;
    const results: Array<{ scenario: string; passed: boolean }> = [];

    for (const scenario of this._scenarios) {
      const result = scenario.condition();
      if (result) {
        passed++;
      } else {
        failed++;
      }
      results.push({ scenario: scenario.scenario, passed: result });
    }

    this._logger.info('Scenario tests completed', { total: this._scenarios.length, passed, failed });
    return { passed, failed, total: this._scenarios.length, results };
  }

  registerDefaultControls(): void {
    this._registerSOC2Controls();
    this._registerISO27001Controls();
    this._registerGDPRControls();
    this._registerLGPDControls();
    this._registerHIPAAControls();
    this._registerPCIDSSControls();
  }

  runFrameworkCheck(framework: ComplianceFramework): { controlId: string; status: ControlStatus; passed: boolean; details: string }[] {
    const controls = this.getControlsByFramework(framework);
    return controls.map((ctrl) => {
      const passed = ctrl.status === 'implemented';
      return {
        controlId: ctrl.controlId,
        status: ctrl.status,
        passed,
        details: passed
          ? `Control ${ctrl.controlId} is implemented`
          : `Control ${ctrl.controlId} is ${ctrl.status}: ${ctrl.remediationNotes ?? 'No notes'}`,
      };
    });
  }

  runMultiFrameworkCheck(frameworks: ComplianceFramework[]): Record<ComplianceFramework, { passed: number; failed: number; total: number }> {
    const result: Record<string, { passed: number; failed: number; total: number }> = {};
    for (const fw of frameworks) {
      const check = this.runFrameworkCheck(fw);
      const passed = check.filter((c) => c.passed).length;
      result[fw] = { passed, failed: check.length - passed, total: check.length };
    }
    return result;
  }

  private _calculateTrend(): 'improving' | 'stable' | 'declining' {
    return 'stable';
  }

  private _registerDefaultRequirements(): void {
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    for (const fw of frameworks) {
      const reqIds = FRAMEWORK_REQUIREMENTS[fw];
      for (const reqId of reqIds) {
        const req: FrameworkRequirement = {
          id: randomUUID(),
          framework: fw,
          requirementId: reqId,
          title: `${fw.toUpperCase()} Requirement ${reqId}`,
          description: `Requirement ${reqId} for ${fw.toUpperCase()}`,
          category: 'general',
          mandatory: true,
          references: [],
        };
        this._requirements.set(req.id, req);
      }
    }
  }

  private _registerSOC2Controls(): void {
    const soc2Controls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'soc2', controlId: 'CC1.1', title: 'Control Environment',
        description: 'Demonstrate commitment to integrity and ethical values', status: 'not-implemented',
        severity: 'high', owner: 'ciso', category: 'security', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: null, dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC2.1', title: 'Communication',
        description: 'Communicate information security policy and incident communication', status: 'partial',
        severity: 'high', owner: 'ciso', category: 'security', evidenceTypes: ['policy_acknowledgment', 'audit_log'],
        lastTested: '2026-06-01T00:00:00Z', nextTestDue: '2026-09-01T00:00:00Z', remediationNotes: 'Policy exists but not formalized', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC3.1', title: 'Risk Assessment',
        description: 'Identify and assess risks to achieving objectives', status: 'partial',
        severity: 'high', owner: 'ciso', category: 'security', evidenceTypes: ['configuration_snapshot'],
        lastTested: '2026-06-15T00:00:00Z', nextTestDue: '2026-09-15T00:00:00Z', remediationNotes: 'Basic risk checks exist in policy-engine', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC6.1', title: 'Logical Access',
        description: 'Authenticate and authorize users to systems', status: 'partial',
        severity: 'critical', owner: 'security', category: 'security', evidenceTypes: ['access_review', 'audit_log'],
        lastTested: '2026-06-10T00:00:00Z', nextTestDue: '2026-09-10T00:00:00Z', remediationNotes: 'MFA not implemented', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC7.1', title: 'System Monitoring',
        description: 'Monitor infrastructure and applications for security events', status: 'partial',
        severity: 'high', owner: 'devops', category: 'security', evidenceTypes: ['configuration_snapshot', 'audit_log'],
        lastTested: '2026-07-01T00:00:00Z', nextTestDue: '2026-10-01T00:00:00Z', remediationNotes: 'observability exists, no SIEM integration', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC7.2', title: 'Incident Response',
        description: 'Establish incident response plan and testing procedures', status: 'not-implemented',
        severity: 'critical', owner: 'security', category: 'security', evidenceTypes: ['incident_report'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No incident response plan documented', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC8.1', title: 'Change Management',
        description: 'Approve, test, and deploy changes in a controlled manner', status: 'partial',
        severity: 'high', owner: 'devops', category: 'security', evidenceTypes: ['change_management'],
        lastTested: '2026-07-10T00:00:00Z', nextTestDue: '2026-10-10T00:00:00Z', remediationNotes: 'delivery-orchestrator with gates exists', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'CC9.1', title: 'Privacy',
        description: 'Provide privacy notice and data retention procedures', status: 'not-implemented',
        severity: 'medium', owner: 'dpo', category: 'privacy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Privacy program not established', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'A1.1', title: 'Availability Commitments',
        description: 'Monitor and respond to availability issues', status: 'partial',
        severity: 'high', owner: 'devops', category: 'availability', evidenceTypes: ['configuration_snapshot', 'audit_log'],
        lastTested: '2026-07-15T00:00:00Z', nextTestDue: '2026-10-15T00:00:00Z', remediationNotes: 'observability-engine with health checks exists', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'PI1.1', title: 'Processing Integrity',
        description: 'Ensure system processing is accurate and complete', status: 'partial',
        severity: 'medium', owner: 'engineering', category: 'processing_integrity', evidenceTypes: ['audit_log'],
        lastTested: '2026-06-20T00:00:00Z', nextTestDue: '2026-09-20T00:00:00Z', remediationNotes: 'audit-trail with SHA-256 chain exists', dependsOn: [],
      },
      {
        framework: 'soc2', controlId: 'C1.1', title: 'Confidential Information Protection',
        description: 'Protect confidential information with encryption and access controls', status: 'partial',
        severity: 'high', owner: 'security', category: 'confidentiality', evidenceTypes: ['configuration_snapshot'],
        lastTested: '2026-06-05T00:00:00Z', nextTestDue: '2026-09-05T00:00:00Z', remediationNotes: 'No encryption at rest', dependsOn: ['CC6.1'],
      },
    ];

    for (const ctrl of soc2Controls) {
      this.registerControl(ctrl);
    }
  }

  private _registerISO27001Controls(): void {
    const isoControls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'iso27001', controlId: 'A.9', title: 'Access Control',
        description: 'Control access to information and systems', status: 'partial',
        severity: 'high', owner: 'security', category: 'security', evidenceTypes: ['access_review'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Auth framework documented, MFA pending', dependsOn: [],
      },
      {
        framework: 'iso27001', controlId: 'A.10', title: 'Cryptography',
        description: 'Ensure proper use of cryptography to protect information', status: 'not-implemented',
        severity: 'high', owner: 'security', category: 'encryption', evidenceTypes: ['configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No encryption at rest implemented', dependsOn: [],
      },
      {
        framework: 'iso27001', controlId: 'A.12', title: 'Operations Security',
        description: 'Ensure correct and secure operation of information processing facilities', status: 'partial',
        severity: 'medium', owner: 'devops', category: 'operations', evidenceTypes: ['audit_log', 'configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Basic monitoring exists', dependsOn: [],
      },
      {
        framework: 'iso27001', controlId: 'A.16', title: 'Incident Management',
        description: 'Manage information security incidents effectively', status: 'not-implemented',
        severity: 'high', owner: 'security', category: 'incident_response', evidenceTypes: ['incident_report'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No incident management process', dependsOn: [],
      },
      {
        framework: 'iso27001', controlId: 'A.18', title: 'Compliance',
        description: 'Ensure compliance with legal and regulatory requirements', status: 'partial',
        severity: 'high', owner: 'ciso', category: 'compliance', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Partial compliance documentation', dependsOn: [],
      },
    ];

    for (const ctrl of isoControls) {
      this.registerControl(ctrl);
    }
  }

  private _registerGDPRControls(): void {
    const gdprControls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'gdpr', controlId: 'Art.5', title: 'Principles of Processing',
        description: 'Lawfulness, fairness, transparency, purpose limitation, data minimization', status: 'partial',
        severity: 'high', owner: 'dpo', category: 'privacy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Principles documented but not fully implemented', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.7', title: 'Consent',
        description: 'Obtain valid consent for data processing', status: 'partial',
        severity: 'high', owner: 'dpo', category: 'privacy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'prompt-security has consent validation', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.15', title: 'Right of Access',
        description: 'Enable data subjects to access their personal data', status: 'not-implemented',
        severity: 'medium', owner: 'engineering', category: 'privacy', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No data subject access request mechanism', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.17', title: 'Right to Erasure',
        description: 'Enable data subjects to request deletion of personal data', status: 'not-implemented',
        severity: 'medium', owner: 'engineering', category: 'privacy', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No erasure mechanism implemented', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.32', title: 'Security of Processing',
        description: 'Implement appropriate technical and organizational measures', status: 'partial',
        severity: 'critical', owner: 'ciso', category: 'security', evidenceTypes: ['configuration_snapshot', 'penetration_test'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Some controls exist, encryption pending', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.33', title: 'Breach Notification',
        description: 'Notify supervisory authority within 72 hours', status: 'not-implemented',
        severity: 'critical', owner: 'dpo', category: 'incident_response', evidenceTypes: ['incident_report'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No breach notification process', dependsOn: [],
      },
      {
        framework: 'gdpr', controlId: 'Art.35', title: 'DPIA',
        description: 'Conduct Data Protection Impact Assessments', status: 'not-implemented',
        severity: 'medium', owner: 'dpo', category: 'privacy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No DPIA process', dependsOn: [],
      },
    ];

    for (const ctrl of gdprControls) {
      this.registerControl(ctrl);
    }
  }

  private _registerLGPDControls(): void {
    const lgpdControls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'lgpd', controlId: 'Art.7', title: 'Legal Bases',
        description: 'Establish legal bases for personal data processing', status: 'partial',
        severity: 'high', owner: 'dpo', category: 'privacy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Legal bases identified, not formalized', dependsOn: [],
      },
      {
        framework: 'lgpd', controlId: 'Art.15', title: 'Right to Erasure',
        description: 'Enable data deletion on request', status: 'not-implemented',
        severity: 'high', owner: 'engineering', category: 'privacy', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No deletion mechanism', dependsOn: [],
      },
      {
        framework: 'lgpd', controlId: 'Art.18', title: 'Data Subject Rights',
        description: 'Enable access, portability, rectification, and objection', status: 'not-implemented',
        severity: 'high', owner: 'engineering', category: 'privacy', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No DSAR mechanism', dependsOn: [],
      },
      {
        framework: 'lgpd', controlId: 'Art.46', title: 'Security Measures',
        description: 'Implement technical and administrative security measures', status: 'partial',
        severity: 'critical', owner: 'ciso', category: 'security', evidenceTypes: ['configuration_snapshot', 'penetration_test'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Partial controls exist', dependsOn: [],
      },
      {
        framework: 'lgpd', controlId: 'Art.48', title: 'Breach Notification',
        description: 'Notify ANPD and affected data subjects of security incidents', status: 'not-implemented',
        severity: 'critical', owner: 'dpo', category: 'incident_response', evidenceTypes: ['incident_report'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No notification process', dependsOn: [],
      },
    ];

    for (const ctrl of lgpdControls) {
      this.registerControl(ctrl);
    }
  }

  private _registerHIPAAControls(): void {
    const hipaaControls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'hipaa', controlId: '164.308(a)(1)', title: 'Security Management Process',
        description: 'Implement risk analysis and risk management', status: 'partial',
        severity: 'critical', owner: 'ciso', category: 'administrative', evidenceTypes: ['penetration_test'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Risk analysis study exists', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.308(a)(4)', title: 'Information Access Management',
        description: 'Authorize and establish access to ePHI', status: 'not-implemented',
        severity: 'high', owner: 'security', category: 'administrative', evidenceTypes: ['access_review'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No access management for PHI', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.308(a)(6)', title: 'Security Incident Procedures',
        description: 'Establish incident response and reporting', status: 'not-implemented',
        severity: 'critical', owner: 'security', category: 'administrative', evidenceTypes: ['incident_report'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No incident response for HIPAA', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.308(b)', title: 'Business Associate Agreements',
        description: 'Obtain BAAs from business associates', status: 'not-implemented',
        severity: 'high', owner: 'legal', category: 'administrative', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No BAA templates', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.312(a)', title: 'Access Control',
        description: 'Unique user IDs, emergency access, automatic logoff, encryption', status: 'partial',
        severity: 'critical', owner: 'security', category: 'technical', evidenceTypes: ['access_review', 'audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Auth framework partial, MFA pending', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.312(b)', title: 'Audit Controls',
        description: 'Record and examine activity in systems containing ePHI', status: 'partial',
        severity: 'high', owner: 'engineering', category: 'technical', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Audit trail exists', dependsOn: [],
      },
      {
        framework: 'hipaa', controlId: '164.312(e)', title: 'Transmission Security',
        description: 'Implement integrity controls and encryption for ePHI transmission', status: 'partial',
        severity: 'high', owner: 'security', category: 'technical', evidenceTypes: ['configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'TLS planned', dependsOn: [],
      },
    ];

    for (const ctrl of hipaaControls) {
      this.registerControl(ctrl);
    }
  }

  private _registerPCIDSSControls(): void {
    const pciControls: Array<Omit<Control, 'id'>> = [
      {
        framework: 'pci-dss', controlId: 'Req.1', title: 'Network Security Controls',
        description: 'Install and maintain network security controls', status: 'not-implemented',
        severity: 'critical', owner: 'devops', category: 'network_security', evidenceTypes: ['configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No network segmentation', dependsOn: [],
      },
      {
        framework: 'pci-dss', controlId: 'Req.3', title: 'Protect Stored Account Data',
        description: 'Protect stored cardholder data', status: 'not-implemented',
        severity: 'critical', owner: 'security', category: 'data_protection', evidenceTypes: ['configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No payment data handling', dependsOn: [],
      },
      {
        framework: 'pci-dss', controlId: 'Req.4', title: 'Encrypt Transmission',
        description: 'Encrypt cardholder data over open networks', status: 'not-implemented',
        severity: 'critical', owner: 'security', category: 'encryption', evidenceTypes: ['configuration_snapshot'],
        lastTested: null, nextTestDue: null, remediationNotes: 'TLS planned but not enforced', dependsOn: [],
      },
      {
        framework: 'pci-dss', controlId: 'Req.7', title: 'Access Control',
        description: 'Restrict access to cardholder data by business need-to-know', status: 'not-implemented',
        severity: 'high', owner: 'security', category: 'access_control', evidenceTypes: ['access_review'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No access control for cardholder data', dependsOn: [],
      },
      {
        framework: 'pci-dss', controlId: 'Req.10', title: 'Audit Logging',
        description: 'Log and monitor all access to network resources and cardholder data', status: 'partial',
        severity: 'high', owner: 'engineering', category: 'audit', evidenceTypes: ['audit_log'],
        lastTested: null, nextTestDue: null, remediationNotes: 'Audit trail exists, not PCI-specific', dependsOn: [],
      },
      {
        framework: 'pci-dss', controlId: 'Req.12', title: 'Information Security Policy',
        description: 'Maintain a policy that addresses information security', status: 'not-implemented',
        severity: 'high', owner: 'ciso', category: 'policy', evidenceTypes: ['policy_acknowledgment'],
        lastTested: null, nextTestDue: null, remediationNotes: 'No formal information security policy', dependsOn: [],
      },
    ];

    for (const ctrl of pciControls) {
      this.registerControl(ctrl);
    }
  }
}