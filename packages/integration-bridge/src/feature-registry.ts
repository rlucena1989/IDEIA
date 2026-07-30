export type FeatureStatus = 'planned' | 'in-progress' | 'completed' | 'deprecated';

export interface FeatureDependency {
  featureId: string;
  type: 'required' | 'optional';
}

export interface FeatureEntry {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  version: string;
  dependencies: FeatureDependency[];
  capabilities: string[];
  packagePath: string | null;
}

export class FeatureRegistry {
  private _features: Map<string, FeatureEntry> = new Map();

  register(feature: FeatureEntry): void {
    this._features.set(feature.id, feature);
  }

  get(id: string): FeatureEntry | undefined {
    return this._features.get(id);
  }

  getAll(): FeatureEntry[] {
    return Array.from(this._features.values());
  }

  getByStatus(status: FeatureStatus): FeatureEntry[] {
    return Array.from(this._features.values()).filter(f => f.status === status);
  }

  getDependencies(id: string): FeatureDependency[] {
    const feature = this._features.get(id);
    if (feature) {
      return feature.dependencies;
    }
    return [];
  }

  hasFeature(id: string): boolean {
    return this._features.has(id);
  }

  getFeatureGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const [id, feature] of this._features) {
      graph.set(id, feature.dependencies.map(d => d.featureId));
    }
    return graph;
  }

  loadDefaults(): void {
    this.register({
      id: 'computer-use',
      name: 'Computer Use',
      description: 'Computer Use (Browser Automation)',
      status: 'completed',
      version: '1.0.0',
      dependencies: [],
      capabilities: ['browser-automation', 'vision-based-ui', 'session-recording'],
      packagePath: 'packages/browser-agent'
    });
    this.register({
      id: 'sso',
      name: 'SSO',
      description: 'SSO (SAML/LDAP/OIDC)',
      status: 'planned',
      version: '0.5.0',
      dependencies: [{ featureId: 'compliance', type: 'required' }],
      capabilities: ['saml-auth', 'ldap-auth', 'oidc-auth', 'sso-profiles'],
      packagePath: null
    });
    this.register({
      id: 'compliance',
      name: 'Compliance',
      description: 'Compliance (SOC2/LGPD/HIPAA)',
      status: 'in-progress',
      version: '0.8.0',
      dependencies: [{ featureId: 'computer-use', type: 'optional' }],
      capabilities: ['soc2-audit', 'lgpd-enforcement', 'hipaa-compliance'],
      packagePath: null
    });
    this.register({
      id: 'reasoning',
      name: 'Reasoning Models',
      description: 'Reasoning Models (o1/R1)',
      status: 'planned',
      version: '0.3.0',
      dependencies: [],
      capabilities: ['chain-of-thought', 'step-by-step-reasoning', 'confidence-scoring'],
      packagePath: null
    });
    this.register({
      id: 'gemini',
      name: 'Gemini Provider',
      description: 'Gemini Provider',
      status: 'completed',
      version: '1.0.0',
      dependencies: [{ featureId: 'reasoning', type: 'optional' }],
      capabilities: ['gemini-api', 'multi-modal-input', 'streaming-response'],
      packagePath: null
    });
  }
}
