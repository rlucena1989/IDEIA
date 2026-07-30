import { createLogger } from '@ideia/logger';
import {  type ThreatModel,
  type STRIDEComponent,
  type STRIDECategory,
  type RiskLevel,
  type AttackVector,
  type Mitigation,
} from './types';
const logger = createLogger('threat-model-analyzer');

export class ThreatModelAnalyzer {
  private _models: Map<string, ThreatModel> = new Map();

  analyzeComponent(
    component: string,
    threats: STRIDEComponent[],
    attackVectors: AttackVector[],
    mitigations: Mitigation[],
  ): ThreatModel {
    const overallRisk = this._computeOverallRisk(threats);
    const model: ThreatModel = {
      component,
      threats,
      overallRisk,
      attackSurface: attackVectors,
      mitigations,
      lastUpdated: Date.now(),
    };
    this._models.set(component, model);
    return model;
  }

  getDefaultCoreThreats(): STRIDEComponent[] {
    return [
      {
        category: 'spoofing',
        threat: 'Attacker impersonates a valid NATS client using stolen JWT or NKey',
        impact: 'critical',
        probability: 'medium',
        description: 'Without proper authentication, an attacker can spoof identity by reusing a stolen JWT token or NKey seed.',
      },
      {
        category: 'tampering',
        threat: 'Message content modified in transit between publisher and subscriber',
        impact: 'high',
        probability: 'low',
        description: 'Without TLS, a MITM attacker can modify NATS messages in transit.',
      },
      {
        category: 'repudiation',
        threat: 'Client denies having published a specific message',
        impact: 'medium',
        probability: 'medium',
        description: 'Without audit trail with chain of custody, clients can deny actions.',
      },
      {
        category: 'information_disclosure',
        threat: 'Unauthorized client subscribes to restricted subjects',
        impact: 'critical',
        probability: 'high',
        description: 'Without ACL with default-deny, any client can subscribe to any subject.',
      },
      {
        category: 'denial_of_service',
        threat: 'Attacker floods NATS server with connection requests',
        impact: 'high',
        probability: 'medium',
        description: 'Without rate limiting and connection throttling, NATS server can be overwhelmed.',
      },
      {
        category: 'elevation_of_privilege',
        threat: 'User JWT modified to grant additional permissions',
        impact: 'high',
        probability: 'low',
        description: 'JWT signature with Ed25519 prevents forgery, but signing key compromise enables escalation.',
      },
    ];
  }

  getDefaultACLThreats(): STRIDEComponent[] {
    return [
      {
        category: 'information_disclosure',
        threat: 'Wildcard pattern too permissive, exposing sensitive subjects',
        impact: 'high',
        probability: 'medium',
        description: 'Using `>` wildcard without proper deny rules can expose more than intended.',
      },
      {
        category: 'elevation_of_privilege',
        threat: 'Queue group restriction bypassed',
        impact: 'medium',
        probability: 'low',
        description: 'Attacker joins restricted queue group to intercept messages.',
      },
    ];
  }

  getDefaultmTLSThreats(): STRIDEComponent[] {
    return [
      {
        category: 'spoofing',
        threat: 'Client presents revoked certificate that is not checked',
        impact: 'high',
        probability: 'medium',
        description: 'Without OCSP or CRL checking, revoked certificates can still authenticate.',
      },
      {
        category: 'tampering',
        threat: 'TLS downgrade attack forces weaker cipher suite',
        impact: 'medium',
        probability: 'low',
        description: 'Server accepting older TLS versions allows downgrade attacks.',
      },
    ];
  }

  getDefaultMultiTenantThreats(): STRIDEComponent[] {
    return [
      {
        category: 'information_disclosure',
        threat: 'Cross-tenant data leak via misconfigured export/import',
        impact: 'critical',
        probability: 'medium',
        description: 'Account A can subscribe to Account B streams if exports are too permissive.',
      },
      {
        category: 'denial_of_service',
        threat: 'One tenant exhausts shared resources affecting all tenants',
        impact: 'high',
        probability: 'medium',
        description: 'Without per-account limits, a single tenant can degrade the entire system.',
      },
    ];
  }

  addMitigation(threat: STRIDEComponent): Mitigation {
    const mitigationMap: Record<STRIDECategory, Mitigation> = {
      spoofing: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Enforce mTLS with client certificate verification and JWT authentication',
        type: 'preventive',
        priority: 'critical',
        implemented: false,
      },
      tampering: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Use TLS 1.3 with AEAD cipher suites for all connections',
        type: 'preventive',
        priority: 'critical',
        implemented: false,
      },
      repudiation: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Implement SHA-256 audit trail with chain of custody for all auth events',
        type: 'detective',
        priority: 'high',
        implemented: false,
      },
      information_disclosure: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Apply default-deny ACL with explicit allow rules by subject pattern',
        type: 'preventive',
        priority: 'critical',
        implemented: true,
      },
      denial_of_service: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Configure connection rate limiting and per-account resource limits',
        type: 'preventive',
        priority: 'high',
        implemented: false,
      },
      elevation_of_privilege: {
        id: `MIT-${threat.category}-001`,
        threatId: `T-${threat.category}`,
        description: 'Sign all JWTs with Ed25519 NKeys and validate on every connection',
        type: 'preventive',
        priority: 'critical',
        implemented: true,
      },
    };
    return mitigationMap[threat.category];
  }

  getModel(component: string): ThreatModel | undefined {
    return this._models.get(component);
  }

  listModels(): ThreatModel[] {
    return Array.from(this._models.values());
  }

  getOverallRiskProfile(): RiskLevel {
    const allRisks = this.listModels();
    if (allRisks.length === 0) {
      return 'none';
    }
    let hasCritical = false;
    let hasHigh = false;
    let hasMedium = false;
    for (const model of allRisks) {
      if (model.overallRisk === 'critical') hasCritical = true;
      else if (model.overallRisk === 'high') hasHigh = true;
      else if (model.overallRisk === 'medium') hasMedium = true;
    }
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  getUnmitigatedThreats(): STRIDEComponent[] {
    const unmitigated: STRIDEComponent[] = [];
    for (const model of this._models.values()) {
      for (const threat of model.threats) {
        const hasMitigation = model.mitigations.some(m => m.threatId === `T-${threat.category}`);
        if (!hasMitigation) {
          unmitigated.push(threat);
        }
      }
    }
    return unmitigated;
  }

  computeRiskScore(threats: STRIDEComponent[]): number {
    const riskValues: Record<RiskLevel, number> = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1,
      none: 0,
    };
    if (threats.length === 0) {
      return 0;
    }
    let totalScore = 0;
    for (const threat of threats) {
      const impact = riskValues[threat.impact];
      const probability = riskValues[threat.probability];
      totalScore += impact * probability;
    }
    return Math.round(totalScore / threats.length);
  }

  private _computeOverallRisk(threats: STRIDEComponent[]): RiskLevel {
    if (threats.length === 0) {
      return 'none';
    }
    let hasCritical = false;
    let hasHigh = false;
    for (const threat of threats) {
      if (threat.impact === 'critical') hasCritical = true;
      else if (threat.impact === 'high') hasHigh = true;
    }
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    return 'medium';
  }
}
