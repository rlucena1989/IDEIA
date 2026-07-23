import { SelfAwareness } from '../ecosystem/self-awareness';
import { ServiceCatalog } from '../ecosystem/service-catalog';
import { CapabilityDiscovery } from '../ecosystem/capability-discovery';

interface TaskProfile {
  category: 'bugfix' | 'feature' | 'refactor' | 'question' | 'documentation' | 'devops' | 'test' | 'review' | 'unknown';
  scope: 'single_file' | 'multi_file' | 'module' | 'cross_module' | 'project';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  language?: string;
  keywords: string[];
}

interface _ContextPackage {
  system: string;
  capabilities: string;
  architecture: string;
  workflows: string;
  relevantServices: string;
}

export interface CompiledContext {
  systemOverview: string;
  relevantCapabilities: string[];
  suggestedWorkflows: string[];
  relevantServices: Array<{ name: string; description: string }>;
  tokenEstimate: number;
  priority: number;
}

export class LLMContextBuilder {
  private selfAwareness: SelfAwareness;
  private catalog: ServiceCatalog;
  private discovery: CapabilityDiscovery;

  constructor(catalog?: ServiceCatalog, discovery?: CapabilityDiscovery, awareness?: SelfAwareness) {
    this.catalog = catalog ?? new ServiceCatalog();
    this.discovery = discovery ?? new CapabilityDiscovery(this.catalog);
    this.selfAwareness = awareness ?? new SelfAwareness(this.catalog, this.discovery);
  }

  buildContext(task: TaskProfile, _maxTokens: number = 2000): CompiledContext {
    const system = this.selfAwareness.describeSystem();

    const systemOverview = [
      `IDEIA — ${system.description}`,
      `Version: ${system.version}`,
      `Packages: ${system.totalPackages} | Capabilities: ${system.totalCapabilities}`,
      `Architecture: ${system.architecture.description}`,
    ].join('\n');

    const relevantCapabilities = this.findRelevantCapabilities(task);
    const suggestedWorkflows = this.findRelevantWorkflows(task);
    const relevantServices = this.findRelevantServices(task);

    const tokenEstimate = this.estimateTokens(systemOverview) +
      relevantCapabilities.reduce((s, c) => s + this.estimateTokens(c), 0) +
      suggestedWorkflows.reduce((s, w) => s + this.estimateTokens(w), 0) +
      relevantServices.reduce((s, r) => s + this.estimateTokens(r.name + r.description), 0);

    const priority = this.calculatePriority(task);

    return {
      systemOverview,
      relevantCapabilities,
      suggestedWorkflows,
      relevantServices,
      tokenEstimate,
      priority,
    };
  }

  private findRelevantCapabilities(task: TaskProfile): string[] {
    const allCaps = this.catalog.findCapabilities();
    const keywordBased = allCaps.filter(cap => {
      const name = cap.name.toLowerCase();
      return task.keywords.some(kw => name.includes(kw.toLowerCase()));
    });

    const categoryBased = allCaps.filter(cap => {
      if (task.category === 'bugfix') return cap.category === 'security';
      if (task.category === 'feature') return cap.category === 'execution' || cap.category === 'orchestration';
      if (task.category === 'devops') return cap.category === 'infra' || cap.category === 'execution';
      if (task.category === 'test') return cap.category === 'integration';
      return false;
    });

    const combined = [...new Set([...keywordBased, ...categoryBased].map(c => c.name))];
    return combined.slice(0, 15);
  }

  private findRelevantWorkflows(task: TaskProfile): string[] {
    const workflows = this.selfAwareness.getWorkflows();
    const matched = workflows.filter(w => {
      const name = w.name.toLowerCase();
      return task.keywords.some(kw => name.includes(kw.toLowerCase()));
    });

    if (task.category === 'feature' || task.category === 'devops') {
      const deployWorkflow = workflows.find(w => w.name.toLowerCase().includes('deploy'));
      const featureWorkflow = workflows.find(w => w.name.toLowerCase().includes('feature'));
      return [...matched, deployWorkflow, featureWorkflow].filter((w): w is NonNullable<typeof w> => w != null).map(w => w.name);
    }

    return matched.length > 0 ? matched.map(w => w.name) : ['Idea to Deploy'];
  }

  private findRelevantServices(task: TaskProfile): Array<{ name: string; description: string }> {
    const services = this.catalog.listServices();
    const matched = services.filter(s => {
      const searchText = `${s.name} ${s.description} ${s.tags.join(' ')}`.toLowerCase();
      return task.keywords.some(kw => searchText.includes(kw.toLowerCase()));
    });

    if (matched.length === 0) {
      return services.slice(0, 3).map(s => ({ name: s.name, description: s.description }));
    }

    return matched.slice(0, 10).map(s => ({ name: s.name, description: s.description }));
  }

  private calculatePriority(task: TaskProfile): number {
    let score = 0.5;
    if (task.urgency === 'critical') score += 0.3;
    if (task.urgency === 'high') score += 0.2;
    if (task.scope === 'project') score += 0.1;
    return Math.min(score, 1.0);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  compressContext(context: CompiledContext, maxTokens: number): string {
    const parts: string[] = [`[IDEIA: ${context.systemOverview}]`];

    if (context.relevantCapabilities.length > 0) {
      parts.push(`[CAPS: ${context.relevantCapabilities.slice(0, 5).join(', ')}]`);
    }

    if (context.suggestedWorkflows.length > 0) {
      parts.push(`[FLOW: ${context.suggestedWorkflows.slice(0, 3).join(' | ')}]`);
    }

    let result = parts.join(' ');
    while (this.estimateTokens(result) > maxTokens && parts.length > 1) {
      parts.pop();
      result = parts.join(' ');
    }

    return result;
  }

  buildSystemOverview(): string {
    const system = this.selfAwareness.describeSystem();
    return [
      `IDEIA v${system.version} — ${system.totalPackages} packages, ${system.totalCapabilities} capabilities`,
      `Stack: ${system.stack.languages.join('/')} | ${system.stack.frameworks.join('/')}`,
      `Architecture: ${system.architecture.layers.map(l => l.name).join(' → ')}`,
    ].join('\n');
  }

  buildCapabilityReport(): string {
    const caps = this.selfAwareness.getCapabilities();
    const byCategory = new Map<string, typeof caps>();
    for (const cap of caps) {
      const existing = byCategory.get(cap.category) ?? [];
      existing.push(cap);
      byCategory.set(cap.category, existing);
    }

    const lines: string[] = ['Available Capabilities:'];
    for (const [category, items] of byCategory) {
      lines.push(`  ${category}: ${items.map(i => i.name).join(', ')}`);
    }
    return lines.join('\n');
  }
}
