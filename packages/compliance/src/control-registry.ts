import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import { ComplianceFramework, ControlStatus, type ControlRecord } from './types';
const logger = createLogger('control-registry');

export class ComplianceControlRegistry {
  private controls: Map<string, ControlRecord> = new Map();

  registerControl(params: Omit<ControlRecord, 'id' | 'createdAt' | 'updatedAt'>): ControlRecord {
    const now = new Date();
    const control: ControlRecord = {
      id: uuidv4(),
      ...params,
      createdAt: now,
      updatedAt: now,
    };
    this.controls.set(control.id, control);
    return control;
  }

  getControl(id: string): ControlRecord | undefined {
    return this.controls.get(id);
  }

  listControls(framework?: ComplianceFramework): ControlRecord[] {
    const all = Array.from(this.controls.values());
    if (framework) {
      return all.filter(c => c.framework === framework);
    }
    return all;
  }

  getByStatus(status: ControlStatus): ControlRecord[] {
    return Array.from(this.controls.values()).filter(c => c.status === status);
  }

  count(): number {
    return this.controls.size;
  }

  statistics(framework: ComplianceFramework): {
    total: number;
    implemented: number;
    partial: number;
    missing: number;
    notApplicable: number;
  } {
    const frameworkControls = this.listControls(framework);
    return {
      total: frameworkControls.length,
      implemented: frameworkControls.filter(c => c.status === ControlStatus.implemented).length,
      partial: frameworkControls.filter(c => c.status === ControlStatus.partial).length,
      missing: frameworkControls.filter(c => c.status === ControlStatus.missing).length,
      notApplicable: frameworkControls.filter(c => c.status === ControlStatus.not_applicable).length,
    };
  }
}

function buildDefaultControls(): Omit<ControlRecord, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    ...soc2Controls(),
    ...lgpdControls(),
    ...hipaaControls(),
  ];
}

function soc2Controls(): Omit<ControlRecord, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'Logical and physical access controls to protect systems',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.2',
      description: 'User registration and de-registration for access management',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.3',
      description: 'Authorization and authentication before access',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.4',
      description: 'Physical access controls to data centers',
      status: ControlStatus.not_applicable,
      evidence: [],
      owner: 'infra-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.5',
      description: 'Environmental protections for physical assets',
      status: ControlStatus.not_applicable,
      evidence: [],
      owner: 'infra-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.6',
      description: 'Protection against malware and malicious code',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC7.1',
      description: 'System monitoring and detection of anomalies',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'observability-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC7.2',
      description: 'Incident response procedures and communication',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC7.3',
      description: 'System monitoring for compliance with criteria',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'observability-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC7.4',
      description: 'Incident response team and escalation',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC7.5',
      description: 'Vulnerability management and remediation',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC8.1',
      description: 'Change management procedures',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC9.1',
      description: 'Identification of risks and mitigation strategies',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'risk-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC9.2',
      description: 'Vendor and third-party risk management',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'procurement-team',
    },
    {
      framework: ComplianceFramework.SOC2,
      criterion: 'CC10.1',
      description: 'Business continuity and disaster recovery plans',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'infra-team',
    },
  ];
}

function lgpdControls(): Omit<ControlRecord, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 7',
      article: '7',
      description: 'Legal basis for processing personal data',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'legal-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 9',
      article: '9',
      description: 'Data subject rights to access their data',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'product-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 15',
      article: '15',
      description: 'Right to deletion of personal data',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 16',
      article: '16',
      description: 'Anonymization of data after purpose is fulfilled',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 17',
      article: '17',
      description: 'Data subject rights enforcement',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'product-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 18',
      article: '18',
      description: 'Portability of personal data',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 19',
      article: '19',
      description: 'Response time to data subject requests',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'product-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 37',
      article: '37',
      description: 'Data Protection Officer (DPO) appointment',
      status: ControlStatus.implemented,
      evidence: ['packages/privacy/src/dpo-config.ts — config via IDEIA_DPO_NAME/IDEIA_DPO_EMAIL env vars'],
      owner: 'legal-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 38',
      article: '38',
      description: 'DPO activities and responsibilities',
      status: ControlStatus.implemented,
      evidence: ['packages/privacy/src/dpo-config.ts — formatDPOContact() returns DPO info'],
      owner: 'legal-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 41',
      article: '41',
      description: 'Security measures for data protection',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 42',
      article: '42',
      description: 'Data breach notification to ANPD',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 45',
      article: '45',
      description: 'International data transfer safeguards',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'legal-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 46',
      article: '46',
      description: 'Privacy by design and by default',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 47',
      article: '47',
      description: 'Processing record keeping',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 48',
      article: '48',
      description: 'Incident response and communication plan',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
  ];
}

function hipaaControls(): Omit<ControlRecord, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(1)(i)',
      article: '164.308',
      description: 'Security management process including risk analysis',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(1)(ii)(A)',
      article: '164.308',
      description: 'Risk analysis for electronic protected health information',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(1)(ii)(B)',
      article: '164.308',
      description: 'Risk management policies and procedures',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(2)',
      article: '164.308',
      description: 'Assigned security responsibility to a designated person',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(3)(i)',
      article: '164.308',
      description: 'Workforce security and authorization policies',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'hr-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(4)(i)',
      article: '164.308',
      description: 'Information access management',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(5)(i)',
      article: '164.308',
      description: 'Security awareness and training program',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'hr-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(6)(i)',
      article: '164.308',
      description: 'Security incident procedures and response',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(7)(i)',
      article: '164.308',
      description: 'Contingency plan for data recovery',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'infra-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.308(a)(8)',
      article: '164.308',
      description: 'Evaluation of security policies and procedures',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.310(a)(1)',
      article: '164.310',
      description: 'Facility access controls',
      status: ControlStatus.not_applicable,
      evidence: [],
      owner: 'infra-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.310(b)',
      article: '164.310',
      description: 'Workstation use and security policies',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'infra-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.312(a)(1)',
      article: '164.312',
      description: 'Access control to electronic protected health information',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.312(a)(2)(i)',
      article: '164.312',
      description: 'Unique user identification for access tracking',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.312(c)(1)',
      article: '164.312',
      description: 'Integrity controls for ePHI',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.312(d)',
      article: '164.312',
      description: 'Person or entity authentication',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.312(e)(1)',
      article: '164.312',
      description: 'Transmission security for ePHI over networks',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'engineering-team',
    },
    {
      framework: ComplianceFramework.HIPAA,
      criterion: '164.314(a)(1)',
      article: '164.314',
      description: 'Business associate contracts and safeguards',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'legal-team',
    },
  ];
}

export function createDefaultRegistry(): ComplianceControlRegistry {
  const registry = new ComplianceControlRegistry();
  const defaults = buildDefaultControls();
  for (const ctrl of defaults) {
    registry.registerControl(ctrl);
  }
  return registry;
}
