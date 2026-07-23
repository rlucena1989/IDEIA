import { ServiceCatalog } from './service-catalog';
import { CapabilityDiscovery } from './capability-discovery';

export interface SystemArchitecture {
  layers: ArchitectureLayer[];
  description: string;
}

export interface ArchitectureLayer {
  name: string;
  description: string;
  components: string[];
}

export interface SystemStack {
  languages: string[];
  frameworks: string[];
  databases: string[];
  messaging: string[];
  ai: string[];
  infrastructure: string[];
}

export interface SystemWorkflow {
  name: string;
  description: string;
  steps: string[];
  agents: string[];
  estimatedDuration: string;
}

export interface SystemDescription {
  name: string;
  version: string;
  description: string;
  totalPackages: number;
  totalCapabilities: number;
  architecture: SystemArchitecture;
  stack: SystemStack;
  workflows: SystemWorkflow[];
  principles: string[];
}

const ARCHITECTURE: SystemArchitecture = {
  layers: [
    { name: 'Shell', description: 'Desktop/Web/Theia Cloud presentation layer', components: ['Electron', 'Tauri (planned)', 'Theia Cloud'] },
    { name: 'Platform', description: 'Theia IDE Platform with Monaco editor, AI, OpenVSX', components: ['Theia Platform', 'Monaco Editor', 'Theia AI', 'OpenVSX', 'Inversify DI'] },
    { name: 'Agents', description: 'Multi-agent orchestration layer (Analyst, Architect, Programmer, Reviewer, Tester, DevOps)', components: ['AgentRuntime', 'LangGraph', 'AgentRegistry', 'StepExecutor'] },
    { name: 'Intelligence', description: 'Cognitive layer for pattern detection, learning, intent classification, RAG', components: ['PatternDetector', 'LearningEngine', 'IntentClassifier', 'RAGEngine', 'ADAPT'] },
    { name: 'Memory', description: 'Memory and context persistence layer', components: ['MemoryStore', 'KnowledgeGraph', 'ContextEngine', 'VectorStore'] },
    { name: 'Execution', description: 'Execution layer for autonomous operations, workflows, delivery', components: ['AgentRuntime', 'AutonomousEditor', 'WorkflowEngine', 'DeliveryOrchestrator', 'VerificationLayer'] },
    { name: 'Messaging', description: 'Event-driven messaging backbone', components: ['EventBus', 'NATS JetStream', 'Pub/Sub', 'Req/Rep', 'KV', 'DLQ'] },
    { name: 'Security', description: 'Security and governance layer', components: ['PolicyEngine', 'LLMGuard', 'OutputValidation', 'AuditTrail', 'SafetyCircuit'] },
    { name: 'Infrastructure', description: 'Infrastructure and resilience layer', components: ['ExecutionLayer', 'ResilienceEngine', 'TracePropagation', 'ObservabilityEngine'] },
    { name: 'Data', description: 'Data persistence and storage layer', components: ['DataLayer', 'SchemaRegistry', 'VectorStore', 'MetricsStore'] },
  ],
  description: 'Clean Architecture layered system with Domain-Driven Design, explicit contracts, and event-driven communication via NATS JetStream',
};

const STACK: SystemStack = {
  languages: ['TypeScript', 'JavaScript', 'Node.js 20'],
  frameworks: ['React 18', 'Theia Platform', 'Express', 'Commander'],
  databases: ['PostgreSQL+pgvector', 'SQLite', 'JSON File (MemoryStore)'],
  messaging: ['NATS JetStream', 'In-Memory EventBus', 'WebSocket'],
  ai: ['LangGraph', 'Ollama', 'OpenAI', 'DeepSeek', 'RAG Engine'],
  infrastructure: ['Docker', 'GitHub Actions', 'Docker Compose'],
};

const WORKFLOWS: SystemWorkflow[] = [
  { name: 'Idea to Deploy', description: 'Complete lifecycle from user idea to production deployment', steps: ['Idea → Analysis → Architecture → Implementation → Testing → Deployment → Monitoring'], agents: ['Analyst', 'Architect', 'Programmer', 'Reviewer', 'Tester', 'DevOps'], estimatedDuration: '15-30 min (automated)' },
  { name: 'Bug Fix', description: 'Automated bug detection, analysis, fix, and verification', steps: ['Report → Analyze → Fix → Test → Review → Deploy'], agents: ['Programmer', 'Reviewer', 'Tester'], estimatedDuration: '5-10 min' },
  { name: 'Feature Implementation', description: 'End-to-end feature development with quality gates', steps: ['Spec → Architecture → Implement → Review → Test → Deploy'], agents: ['Analyst', 'Architect', 'Programmer', 'Reviewer', 'Tester', 'DevOps'], estimatedDuration: '20-40 min' },
  { name: 'Security Audit', description: 'Automated security analysis, compliance checking, and remediation', steps: ['Scan → Analyze → Report → Fix → Verify'], agents: ['Reviewer', 'Programmer'], estimatedDuration: '10-15 min' },
  { name: 'Performance Optimization', description: 'Performance profiling, bottleneck detection, and optimization', steps: ['Profile → Analyze → Optimize → Benchmark → Verify'], agents: ['Programmer', 'Reviewer'], estimatedDuration: '15-20 min' },
];

const PRINCIPLES: string[] = [
  'Clean Architecture — domain does not import infrastructure; use cases are testable in isolation',
  'Domain-Driven Design — entities, value objects, aggregates, domain events',
  'Explicit Contracts — every DTO validated with Contract.pre(); schemas in Schema Registry',
  'Event-Driven — every event crosses the message bus; no direct calls between modules',
  'Security by Design — policy engine, output validation, audit chain, sandbox execution',
  'Self-Awareness — the system can describe itself, its capabilities, and its state programmatically',
  'Continuous Audit — every operation is logged, traceable, and verifiable',
  'Cross-Platform — all scripts run on Windows (PowerShell 5.1+) and Linux (bash)',
  'Quality Gates — 4 gates (Commit, PR, Release, Sprint) with automated enforcement',
  'Zero-to-Deploy — guiding users from idea to production in a continuous, automated flow',
];

export class SelfAwareness {
  private serviceCatalog: ServiceCatalog;
  private capabilityDiscovery: CapabilityDiscovery;

  constructor(catalog?: ServiceCatalog, discovery?: CapabilityDiscovery) {
    this.serviceCatalog = catalog ?? new ServiceCatalog();
    this.capabilityDiscovery = discovery ?? new CapabilityDiscovery(this.serviceCatalog);
  }

  describeSystem(): SystemDescription {
    return {
      name: 'IDEIA',
      version: '2026.07',
      description: 'IDE que transforma ideias em sistemas completos — Dê a ideia, nós entregamos a solução',
      totalPackages: this.serviceCatalog.getServiceCount(),
      totalCapabilities: this.serviceCatalog.getCapabilityCount(),
      architecture: ARCHITECTURE,
      stack: STACK,
      workflows: WORKFLOWS,
      principles: PRINCIPLES,
    };
  }

  getCapabilities(category?: string): Array<{ name: string; service: string; category: string; level: string }> {
    const services = this.serviceCatalog.listServices();
    return this.serviceCatalog.findCapabilities(category as 'orchestration' | 'intelligence' | 'memory' | 'execution' | 'security' | 'integration' | 'ux' | 'infra' | 'data').map(c => ({
      name: c.name,
      service: services.find(s => s.serviceId === c.serviceId)?.name ?? 'unknown',
      category: c.category,
      level: c.level,
    }));
  }

  getArchitecture(): SystemArchitecture {
    return ARCHITECTURE;
  }

  getStack(): SystemStack {
    return STACK;
  }

  getWorkflows(workflowName?: string): SystemWorkflow[] {
    if (workflowName) return WORKFLOWS.filter(w => w.name.toLowerCase().includes(workflowName.toLowerCase()));
    return [...WORKFLOWS];
  }

  discoverAvailableCapabilities(): Array<{ name: string; available: boolean; service: string }> {
    return this.capabilityDiscovery.discoverAll();
  }

  formatAsMarkdown(): string {
    const system = this.describeSystem();
    const sections: string[] = [
      `# ${system.name} — System Self-Description`,
      ``,
      `**Version:** ${system.version}`,
      `**Description:** ${system.description}`,
      `**Packages:** ${system.totalPackages} | **Capabilities:** ${system.totalCapabilities}`,
      ``,
      `## Architecture (${system.architecture.layers.length} layers)`,
      ``,
      ...system.architecture.layers.map(l => `### ${l.name}\n${l.description}\n\nComponents: ${l.components.join(', ')}`),
      ``,
      `## Technology Stack`,
      ``,
      `**Languages:** ${system.stack.languages.join(', ')}`,
      `**Frameworks:** ${system.stack.frameworks.join(', ')}`,
      `**Databases:** ${system.stack.databases.join(', ')}`,
      `**Messaging:** ${system.stack.messaging.join(', ')}`,
      `**AI:** ${system.stack.ai.join(', ')}`,
      `**Infrastructure:** ${system.stack.infrastructure.join(', ')}`,
      ``,
      `## Available Workflows`,
      ``,
      ...system.workflows.map(w => `### ${w.name}\n${w.description}\n- Steps: ${w.steps.join(' → ')}\n- Agents: ${w.agents.join(', ')}\n- Duration: ${w.estimatedDuration}`),
      ``,
      `## Guiding Principles`,
      ``,
      ...system.principles.map((p, i) => `${i + 1}. ${p}`),
      ``,
      `## Available Capabilities (${system.totalCapabilities})`,
      ``,
      ...this.getCapabilities().map(c => `- \`${c.name}\` — ${c.service} (${c.category}, ${c.level})`),
      ``,
      `## All Packages (${system.totalPackages})`,
      ``,
      ...this.serviceCatalog.listServices().map(s => `- \`${s.name}\` — ${s.type} — ${s.description}`),
    ];
    return sections.join('\n');
  }
}
