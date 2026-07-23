let _nextId = 0;

function nextId(): string {
  _nextId++;
  return `id-${_nextId}`;
}

export interface ServiceEntry {
  serviceId: string;
  name: string;
  type: 'library' | 'cli' | 'frontend' | 'plugin' | 'adapter' | 'api';
  description: string;
  capabilities: string[];
  dependencies: string[];
  status: 'active' | 'deprecated' | 'planned';
  tags: string[];
}

export interface CapabilityEntry {
  capabilityId: string;
  name: string;
  description: string;
  serviceId: string;
  category: 'orchestration' | 'intelligence' | 'memory' | 'execution' | 'security' | 'integration' | 'ux' | 'infra' | 'data';
  level: 'core' | 'standard' | 'advanced';
}

const PREDEFINED_SERVICES: ServiceEntry[] = [
  { serviceId: nextId(), name: 'agent-runtime', type: 'library', description: 'Multi-agent orchestration with LangGraph, state graphs, sub-graphs, parallel execution, timeout/retry', capabilities: ['agent-orchestration', 'state-graph', 'sub-graph', 'parallel-execution', 'timeout-retry'], dependencies: ['policy-engine', 'audit-trail', 'memory-store', 'contracts'], status: 'active', tags: ['agent', 'orchestration', 'langgraph'] },
  { serviceId: nextId(), name: 'event-bus', type: 'library', description: 'Event bus with in-memory and NATS JetStream backends, pub/sub, req/rep, KV, Object Store, DLQ, consumer groups', capabilities: ['pub-sub', 'req-rep', 'kv-store', 'object-store', 'dlq', 'consumer-groups', 'heartbeat'], dependencies: ['audit-trail', 'contracts'], status: 'active', tags: ['messaging', 'nats', 'events'] },
  { serviceId: nextId(), name: 'cli', type: 'cli', description: 'Main CLI entry point with 130+ commands, prompt pipeline, ecosystem management, context engine, approval flow', capabilities: ['command-execution', 'prompt-pipeline', 'ecosystem-management', 'context-engine', 'approval-flow', 'audit-tracing', 'knowledge-indexing'], dependencies: ['agent-runtime', 'event-bus', 'delivery-orchestrator', 'memory-store', 'policy-engine', 'config-engine'], status: 'active', tags: ['cli', 'main', 'entrypoint'] },
  { serviceId: nextId(), name: 'delivery-orchestrator', type: 'library', description: 'Delivery orchestration with deploy commands, rollback, backup, quality gates, environment promotion', capabilities: ['deploy', 'rollback', 'backup', 'quality-gates', 'environment-promotion'], dependencies: ['event-bus', 'audit-trail'], status: 'active', tags: ['delivery', 'deploy', 'cd'] },
  { serviceId: nextId(), name: 'workflow-engine', type: 'library', description: 'Workflow engine managing workflows, sprints, quality gates, state transitions', capabilities: ['workflow-management', 'sprint-management', 'quality-gates', 'state-transitions'], dependencies: ['delivery-orchestrator', 'event-bus', 'audit-trail'], status: 'active', tags: ['workflow', 'sprint', 'quality'] },
  { serviceId: nextId(), name: 'policy-engine', type: 'library', description: 'Policy engine with 27 security patterns (Linux + Windows + PowerShell), YAML externalized rules, compliance checking', capabilities: ['policy-evaluation', 'compliance-checking', 'pattern-matching', 'rule-management'], dependencies: ['contracts'], status: 'active', tags: ['security', 'policy', 'compliance'] },
  { serviceId: nextId(), name: 'memory-store', type: 'library', description: 'Memory store with JSON file persistence, knowledge graph, entity extraction, context management', capabilities: ['memory-persistence', 'knowledge-graph', 'entity-extraction', 'context-management'], dependencies: ['contracts'], status: 'active', tags: ['memory', 'persistence', 'knowledge'] },
  { serviceId: nextId(), name: 'audit-trail', type: 'library', description: 'Audit trail with SHA-256 hash chain, verification, tamper detection, query capabilities', capabilities: ['audit-logging', 'hash-chain', 'tamper-detection', 'audit-query'], dependencies: ['contracts'], status: 'active', tags: ['audit', 'security', 'compliance'] },
  { serviceId: nextId(), name: 'llm-provider', type: 'library', description: 'LLM provider abstraction with Ollama, OpenAI, DeepSeek support, streaming, embeddings, tool calls, fallback', capabilities: ['llm-completion', 'streaming', 'embeddings', 'tool-calls', 'provider-fallback', 'provider-routing'], dependencies: [], status: 'active', tags: ['llm', 'ai', 'provider'] },
  { serviceId: nextId(), name: 'schema-registry', type: 'library', description: 'Schema registry with Zod schemas, versioning, compatibility checking, contract enforcement', capabilities: ['schema-management', 'versioning', 'compatibility-check', 'contract-enforcement'], dependencies: [], status: 'active', tags: ['schema', 'contract', 'validation'] },
  { serviceId: nextId(), name: 'ideia-plugin', type: 'plugin', description: 'Theia IDE plugin with 5 widgets (Chat, Dashboard, Diff, Approval, Search), 6 backend services, 8 contributions', capabilities: ['ide-integration', 'widget-rendering', 'backend-services', 'theia-contributions'], dependencies: ['cli'], status: 'active', tags: ['theia', 'ide', 'plugin'] },
  { serviceId: nextId(), name: 'onboarding-engine', type: 'library', description: 'Onboarding engine for LLM configuration, tutorial progress tracking, first-run experience', capabilities: ['llm-configuration', 'tutorial-progress', 'first-run-setup'], dependencies: [], status: 'active', tags: ['onboarding', 'tutorial', 'ux'] },
  { serviceId: nextId(), name: 'environment-snapshot', type: 'library', description: 'Environment snapshot for reproducibility, verification, diff, restore', capabilities: ['snapshot-capture', 'environment-verification', 'snapshot-diff', 'snapshot-restore'], dependencies: [], status: 'active', tags: ['environment', 'reproducibility', 'snapshot'] },
  { serviceId: nextId(), name: 'data-layer', type: 'library', description: 'Data layer with PostgreSQL+pgvector (opt) and SQLite fallback, migrations, query building', capabilities: ['database-access', 'pgvector', 'migrations', 'query-building'], dependencies: ['contracts'], status: 'active', tags: ['database', 'data', 'persistence'] },
  { serviceId: nextId(), name: 'security-middleware', type: 'library', description: 'Security middleware with 14 tests, injection protection, CORS, rate limiting, request validation', capabilities: ['injection-protection', 'cors', 'rate-limiting', 'request-validation'], dependencies: [], status: 'active', tags: ['security', 'middleware', 'api'] },
  { serviceId: nextId(), name: 'execution-layer', type: 'library', description: 'Execution layer for running commands in sandboxed environments, with output capture and timeout', capabilities: ['command-execution', 'sandbox', 'output-capture', 'timeout-control'], dependencies: [], status: 'active', tags: ['execution', 'sandbox', 'runtime'] },
  { serviceId: nextId(), name: 'resilience-engine', type: 'library', description: 'Resilience engine with circuit breaker, retry with backoff, timeout, bulkhead, fallback', capabilities: ['circuit-breaker', 'retry', 'timeout', 'bulkhead', 'fallback'], dependencies: [], status: 'active', tags: ['resilience', 'fault-tolerance', 'reliability'] },
  { serviceId: nextId(), name: 'observability-engine', type: 'library', description: 'Observability engine for distributed tracing, metrics collection, logging, alerting', capabilities: ['distributed-tracing', 'metrics-collection', 'logging', 'alerting'], dependencies: [], status: 'active', tags: ['observability', 'monitoring', 'telemetry'] },
  { serviceId: nextId(), name: 'feedback-pipeline', type: 'library', description: 'Feedback pipeline for collecting, processing, and acting on user feedback and system signals', capabilities: ['feedback-collection', 'feedback-processing', 'signal-analysis'], dependencies: ['memory-store', 'event-bus', 'audit-trail'], status: 'active', tags: ['feedback', 'learning', 'signals'] },
  { serviceId: nextId(), name: 'contracts', type: 'library', description: 'Core contracts and types used across all packages, Zod validation schemas', capabilities: ['type-definitions', 'zod-validation', 'shared-contracts'], dependencies: [], status: 'active', tags: ['contracts', 'types', 'core'] },
  { serviceId: nextId(), name: 'core', type: 'library', description: 'Core utilities, helpers, and foundational types for the entire IDEIA platform', capabilities: ['core-utilities', 'foundational-types'], dependencies: [], status: 'active', tags: ['core', 'utilities', 'foundation'] },
  { serviceId: nextId(), name: 'cache', type: 'library', description: 'Caching layer with in-memory and optional Redis backend, TTL, invalidation strategies', capabilities: ['in-memory-cache', 'ttl', 'cache-invalidation'], dependencies: [], status: 'active', tags: ['cache', 'performance'] },
  { serviceId: nextId(), name: 'vector-store', type: 'library', description: 'Vector store with embedding storage, similarity search, indexing for RAG applications', capabilities: ['embedding-storage', 'similarity-search', 'vector-indexing', 'rag'], dependencies: [], status: 'active', tags: ['vector', 'embeddings', 'rag'] },
  { serviceId: nextId(), name: 'trace-registry', type: 'library', description: 'Trace registry for distributed tracing, span management, trace context propagation', capabilities: ['trace-storage', 'span-management', 'trace-propagation'], dependencies: ['observability-engine', 'event-bus'], status: 'active', tags: ['tracing', 'observability', 'distributed'] },
  { serviceId: nextId(), name: 'mcp', type: 'library', description: 'Model Context Protocol implementation for standardized LLM tool/context interaction', capabilities: ['mcp-server', 'mcp-client', 'tool-registration', 'context-protocol'], dependencies: [], status: 'active', tags: ['mcp', 'protocol', 'llm'] },
  { serviceId: nextId(), name: 'plugin-sdk', type: 'library', description: 'Plugin SDK for developing third-party plugins with lifecycle management, sandboxing, API access', capabilities: ['plugin-lifecycle', 'plugin-sandboxing', 'api-access', 'extension-points'], dependencies: [], status: 'active', tags: ['plugin', 'sdk', 'extensibility'] },
  { serviceId: nextId(), name: 'reality-sync', type: 'library', description: 'Reality sync with study intensifier, gap analysis, auto-fix, documentation drift detection', capabilities: ['study-intensification', 'gap-analysis', 'auto-fix', 'drift-detection'], dependencies: [], status: 'active', tags: ['reality', 'sync', 'documentation'] },
  { serviceId: nextId(), name: 'autonomous-editor', type: 'library', description: 'Autonomous editor with diff-based file modification (Myers diff), safety rules, preview, approval', capabilities: ['file-editing', 'diff-generation', 'safety-rules', 'preview', 'approval'], dependencies: ['diff-engine'], status: 'active', tags: ['editor', 'autonomous', 'diff'] },
  { serviceId: nextId(), name: 'terminal-sandbox', type: 'library', description: 'Terminal sandbox with command validation, output capture, timeout, restricted execution', capabilities: ['command-validation', 'output-capture', 'restricted-execution'], dependencies: [], status: 'active', tags: ['terminal', 'sandbox', 'security'] },
  { serviceId: nextId(), name: 'logger', type: 'library', description: 'Structured logger with levels, context propagation, JSON output, redaction support', capabilities: ['structured-logging', 'context-propagation', 'json-output', 'redaction'], dependencies: [], status: 'active', tags: ['logging', 'observability'] },
  { serviceId: nextId(), name: 'config-engine', type: 'library', description: 'Configuration engine with YAML/JSON loading, environment variable interpolation, validation', capabilities: ['config-loading', 'env-interpolation', 'config-validation', 'schema-based-config'], dependencies: [], status: 'active', tags: ['config', 'settings', 'environment'] },
  { serviceId: nextId(), name: 'safety-circuit', type: 'library', description: 'Safety circuit for LLM output validation, dangerous pattern detection, PII/secret scanning', capabilities: ['output-validation', 'pattern-detection', 'pii-scanning', 'secret-scanning'], dependencies: [], status: 'active', tags: ['safety', 'security', 'llm'] },
  { serviceId: nextId(), name: 'prompt-security', type: 'library', description: 'Prompt security with injection detection, jailbreak prevention, prompt leak protection', capabilities: ['injection-detection', 'jailbreak-prevention', 'prompt-leak-protection'], dependencies: [], status: 'active', tags: ['security', 'prompt', 'llm'] },
  { serviceId: nextId(), name: 'scope-isolation', type: 'library', description: 'Scope isolation for multi-tenant operations, resource limits, access control enforcement', capabilities: ['multi-tenant-isolation', 'resource-limits', 'access-control'], dependencies: [], status: 'active', tags: ['isolation', 'multi-tenant', 'security'] },
  { serviceId: nextId(), name: 'control-tower', type: 'library', description: 'Control tower for centralized management, health checks, system-wide monitoring', capabilities: ['centralized-management', 'health-checks', 'system-monitoring'], dependencies: [], status: 'active', tags: ['management', 'monitoring', 'control'] },
  { serviceId: nextId(), name: 'autonomous-evolution-engine', type: 'library', description: 'Autonomous evolution engine for self-improvement, pattern learning, code optimization', capabilities: ['self-improvement', 'pattern-learning', 'code-optimization'], dependencies: [], status: 'active', tags: ['evolution', 'self-improvement', 'ai'] },
  { serviceId: nextId(), name: 'technology-radar', type: 'library', description: 'Technology radar for tracking technology adoption, maturity assessment, recommendation engine', capabilities: ['tech-tracking', 'maturity-assessment', 'recommendation'], dependencies: [], status: 'active', tags: ['technology', 'radar', 'assessment'] },
  { serviceId: nextId(), name: 'org-trust', type: 'library', description: 'Organization trust model for cross-domain trust evaluation, certificate management, identity verification', capabilities: ['trust-evaluation', 'certificate-management', 'identity-verification'], dependencies: [], status: 'active', tags: ['trust', 'identity', 'security'] },
  { serviceId: nextId(), name: 'api', type: 'api', description: 'Express REST API server with 42 endpoints for filesystem, git, chat, tasks, approval, settings, sandbox', capabilities: ['rest-api', 'websocket', 'file-management', 'git-operations', 'chat-completions', 'task-management', 'approval-flow', 'settings-management'], dependencies: ['cli'], status: 'active', tags: ['api', 'rest', 'backend'] },
  { serviceId: nextId(), name: 'diff-engine', type: 'library', description: 'Diff engine with Myers diff algorithm, unified diff output, patch application', capabilities: ['diff-generation', 'patch-application', 'unified-diff'], dependencies: [], status: 'active', tags: ['diff', 'patch', 'versioning'] },
  { serviceId: nextId(), name: 'spec-generator', type: 'library', description: 'Spec generator for creating detailed specifications from user ideas with acceptance criteria', capabilities: ['spec-generation', 'acceptance-criteria', 'requirement-analysis'], dependencies: [], status: 'active', tags: ['spec', 'requirements', 'documentation'] },
  { serviceId: nextId(), name: 'docs-generator', type: 'library', description: 'Documentation generator for creating README, API docs, changelog from codebase analysis', capabilities: ['doc-generation', 'api-docs', 'changelog-generation'], dependencies: [], status: 'active', tags: ['documentation', 'generator', 'docs'] },
  { serviceId: nextId(), name: 'contract-cdc', type: 'library', description: 'Consumer-driven contract testing for API compatibility verification between services', capabilities: ['contract-testing', 'compatibility-verification', 'pact-integration'], dependencies: ['contracts'], status: 'active', tags: ['contract', 'testing', 'cdc'] },
  { serviceId: nextId(), name: 'agent-benchmark', type: 'library', description: 'Agent benchmark for measuring agent performance, accuracy, latency, and resource usage', capabilities: ['performance-benchmarking', 'accuracy-measurement', 'latency-tracking'], dependencies: [], status: 'active', tags: ['benchmark', 'performance', 'agent'] },
  { serviceId: nextId(), name: 'agent-identity', type: 'library', description: 'Agent identity management for agent authentication, authorization, and secure communication', capabilities: ['agent-authentication', 'agent-authorization', 'secure-communication'], dependencies: ['contracts'], status: 'active', tags: ['identity', 'agent', 'security'] },
  { serviceId: nextId(), name: 'architecture-adr', type: 'library', description: 'Architecture Decision Record management for tracking and documenting architectural decisions', capabilities: ['adr-management', 'decision-tracking', 'architecture-documentation'], dependencies: [], status: 'active', tags: ['adr', 'architecture', 'decisions'] },
  { serviceId: nextId(), name: 'auto-adr', type: 'library', description: 'Automatic ADR generation from code changes, detecting architectural implications', capabilities: ['auto-adr-generation', 'architectural-analysis'], dependencies: [], status: 'active', tags: ['adr', 'automation', 'architecture'] },
  { serviceId: nextId(), name: 'bhp', type: 'library', description: 'Behavior-driven Health Protocol for continuous system health validation and reporting', capabilities: ['health-validation', 'continuous-monitoring', 'health-reporting'], dependencies: [], status: 'active', tags: ['health', 'monitoring', 'bdd'] },
  { serviceId: nextId(), name: 'continuity-engine', type: 'library', description: 'Continuity engine for session persistence, crash recovery, state restoration after failures', capabilities: ['session-persistence', 'crash-recovery', 'state-restoration'], dependencies: [], status: 'active', tags: ['continuity', 'recovery', 'resilience'] },
  { serviceId: nextId(), name: 'correction-oracle', type: 'library', description: 'Correction oracle for identifying and suggesting fixes for code issues and anti-patterns', capabilities: ['issue-identification', 'fix-suggestion', 'anti-pattern-detection'], dependencies: [], status: 'active', tags: ['correction', 'code-quality', 'oracle'] },
  { serviceId: nextId(), name: 'economic-control', type: 'library', description: 'Economic control for token budget management, cost tracking, and usage optimization', capabilities: ['token-budgeting', 'cost-tracking', 'usage-optimization'], dependencies: [], status: 'active', tags: ['economics', 'tokens', 'cost'] },
  { serviceId: nextId(), name: 'external-connectors', type: 'library', description: 'External connectors for integrating with third-party services, APIs, and data sources', capabilities: ['third-party-integration', 'api-connectivity', 'data-sync'], dependencies: [], status: 'active', tags: ['connectors', 'integration', 'external'] },
  { serviceId: nextId(), name: 'ide-integration', type: 'library', description: 'IDE integration layer for connecting with VS Code, Theia, and other editors', capabilities: ['ide-connectivity', 'editor-bridge', 'language-server'], dependencies: [], status: 'active', tags: ['ide', 'editor', 'integration'] },
  { serviceId: nextId(), name: 'metrics-store', type: 'library', description: 'Metrics store for collecting, aggregating, and querying system metrics and KPIs', capabilities: ['metrics-collection', 'metrics-aggregation', 'metrics-querying', 'kpi-tracking'], dependencies: [], status: 'active', tags: ['metrics', 'kpi', 'analytics'] },
  { serviceId: nextId(), name: 'model-manager', type: 'library', description: 'Model manager for AI model lifecycle, versioning, A/B testing, and deployment management', capabilities: ['model-lifecycle', 'model-versioning', 'ab-testing', 'model-deployment'], dependencies: [], status: 'active', tags: ['model', 'ml', 'lifecycle'] },
  { serviceId: nextId(), name: 'notification-system', type: 'library', description: 'Notification system for multi-channel notifications (in-app, email, webhook) with templates', capabilities: ['in-app-notification', 'email-notification', 'webhook', 'notification-templates'], dependencies: [], status: 'active', tags: ['notification', 'events', 'communication'] },
  { serviceId: nextId(), name: 'onboarding-wizard', type: 'library', description: 'Onboarding wizard for guided first-time setup, project initialization wizard, and interactive configuration', capabilities: ['guided-setup', 'project-initialization', 'interactive-config'], dependencies: [], status: 'active', tags: ['onboarding', 'wizard', 'ux'] },
  { serviceId: nextId(), name: 'performance-monitor', type: 'library', description: 'Performance monitor for real-time system performance tracking, bottleneck detection, profiling', capabilities: ['real-time-monitoring', 'bottleneck-detection', 'profiling'], dependencies: [], status: 'active', tags: ['performance', 'monitoring', 'profiling'] },
  { serviceId: nextId(), name: 'persistent-instructions', type: 'library', description: 'Persistent instructions for maintaining cross-session context, user preferences, and learned patterns', capabilities: ['cross-session-context', 'user-preferences', 'pattern-learning'], dependencies: [], status: 'active', tags: ['persistence', 'context', 'learning'] },
  { serviceId: nextId(), name: 'policy-gateway', type: 'library', description: 'Policy gateway for distributed policy enforcement across services with caching and validation', capabilities: ['distributed-enforcement', 'policy-caching', 'policy-validation'], dependencies: [], status: 'active', tags: ['policy', 'gateway', 'distributed'] },
  { serviceId: nextId(), name: 'profiles', type: 'library', description: 'Profiles management for user, team, and organization profiles with settings and preferences', capabilities: ['user-profiles', 'team-profiles', 'settings-management'], dependencies: [], status: 'active', tags: ['profiles', 'users', 'settings'] },
  { serviceId: nextId(), name: 'prototyping-engine', type: 'library', description: 'Prototyping engine for rapid application prototyping, scaffolding, and proof-of-concept generation', capabilities: ['rapid-prototyping', 'scaffolding', 'poc-generation'], dependencies: [], status: 'active', tags: ['prototyping', 'scaffolding', 'rapid'] },
  { serviceId: nextId(), name: 'real-data', type: 'library', description: 'Real data integration for connecting with production-like datasets for testing and validation', capabilities: ['data-integration', 'test-data-generation', 'data-masking'], dependencies: [], status: 'active', tags: ['data', 'testing', 'integration'] },
  { serviceId: nextId(), name: 'requirements-engine', type: 'library', description: 'Requirements engine for eliciting, analyzing, and managing project requirements with traceability', capabilities: ['requirements-elicitation', 'requirements-analysis', 'traceability'], dependencies: [], status: 'active', tags: ['requirements', 'analysis', 'traceability'] },
  { serviceId: nextId(), name: 'self-optimization-panel', type: 'library', description: 'Self-optimization panel for monitoring and tuning system performance automatically', capabilities: ['auto-tuning', 'performance-monitoring', 'optimization-suggestions'], dependencies: [], status: 'active', tags: ['optimization', 'self-tuning', 'performance'] },
  { serviceId: nextId(), name: 'slo-monitor', type: 'library', description: 'SLO monitor for tracking Service Level Objectives, burn rate alerts, error budget management', capabilities: ['slo-tracking', 'burn-rate-alerts', 'error-budget'], dependencies: [], status: 'active', tags: ['slo', 'monitoring', 'reliability'] },
  { serviceId: nextId(), name: 'telemetry', type: 'library', description: 'Telemetry system for anonymous usage data collection, feature adoption tracking, and product analytics', capabilities: ['usage-tracking', 'feature-adoption', 'product-analytics'], dependencies: [], status: 'active', tags: ['telemetry', 'analytics', 'usage'] },
  { serviceId: nextId(), name: 'test-orchestrator', type: 'library', description: 'Test orchestrator for coordinating multi-package test execution, parallel runs, and reporting', capabilities: ['test-coordination', 'parallel-execution', 'test-reporting'], dependencies: [], status: 'active', tags: ['testing', 'orchestration', 'quality'] },
  { serviceId: nextId(), name: 'trace-propagation', type: 'library', description: 'Trace propagation for distributed context propagation across service boundaries', capabilities: ['context-propagation', 'distributed-tracing', 'trace-context'], dependencies: [], status: 'active', tags: ['tracing', 'propagation', 'distributed'] },
  { serviceId: nextId(), name: 'trusted-context', type: 'library', description: 'Trusted context for validating and securing context information passed between components', capabilities: ['context-validation', 'context-security', 'trust-verification'], dependencies: [], status: 'active', tags: ['context', 'trust', 'security'] },
  { serviceId: nextId(), name: 'verification-layer', type: 'library', description: 'Verification layer for pre-deployment checks, contract validation, and quality assurance', capabilities: ['pre-deployment-checks', 'contract-validation', 'quality-assurance'], dependencies: [], status: 'active', tags: ['verification', 'quality', 'deployment'] },
  { serviceId: nextId(), name: 'violation-registry', type: 'library', description: 'Violation registry for tracking policy violations, security incidents, and compliance issues', capabilities: ['violation-tracking', 'incident-logging', 'compliance-auditing'], dependencies: [], status: 'active', tags: ['violation', 'compliance', 'audit'] },
  { serviceId: nextId(), name: 'browser-agent', type: 'library', description: 'Browser agent for automated browser interactions, web scraping, and UI testing', capabilities: ['browser-automation', 'web-scraping', 'ui-testing'], dependencies: [], status: 'active', tags: ['browser', 'automation', 'testing'] },
  { serviceId: nextId(), name: 'a11y-scanner', type: 'library', description: 'Accessibility scanner for automated WCAG compliance checking and accessibility issue detection', capabilities: ['a11y-scanning', 'wcag-compliance', 'issue-detection'], dependencies: [], status: 'active', tags: ['accessibility', 'a11y', 'compliance'] },
  { serviceId: nextId(), name: 'acceleration', type: 'library', description: 'Acceleration engine for optimizing build times, caching compilation artifacts, parallel processing', capabilities: ['build-optimization', 'artifact-caching', 'parallel-processing'], dependencies: [], status: 'active', tags: ['acceleration', 'performance', 'build'] },
];

export class ServiceCatalog {
  private services: ServiceEntry[] = [...PREDEFINED_SERVICES];
  private capabilities: CapabilityEntry[] = [];

  constructor() {
    this.buildCapabilityIndex();
  }

  private buildCapabilityIndex(): void {
    for (const service of this.services) {
      for (const capName of service.capabilities) {
        const category = this.inferCategory(capName);
        this.capabilities.push({
          capabilityId: nextId(),
          name: capName,
          description: `Capability: ${capName} — provided by ${service.name}`,
          serviceId: service.serviceId,
          category,
          level: service.type === 'cli' ? 'core' : 'standard',
        });
      }
    }
  }

  private inferCategory(capability: string): CapabilityEntry['category'] {
    if (capability.includes('agent') || capability.includes('orchestrat') || capability.includes('workflow')) return 'orchestration';
    if (capability.includes('llm') || capability.includes('prompt') || capability.includes('intent') || capability.includes('classification')) return 'intelligence';
    if (capability.includes('memory') || capability.includes('persistence') || capability.includes('knowledge') || capability.includes('store')) return 'memory';
    if (capability.includes('execut') || capability.includes('command') || capability.includes('sandbox') || capability.includes('deploy') || capability.includes('rollback')) return 'execution';
    if (capability.includes('security') || capability.includes('policy') || capability.includes('audit') || capability.includes('compliance') || capability.includes('validation') || capability.includes('protect')) return 'security';
    if (capability.includes('api') || capability.includes('integration') || capability.includes('connector') || capability.includes('bridge') || capability.includes('plugin')) return 'integration';
    if (capability.includes('ui') || capability.includes('widget') || capability.includes('ide') || capability.includes('onboarding') || capability.includes('notification')) return 'ux';
    if (capability.includes('trace') || capability.includes('metric') || capability.includes('monitor') || capability.includes('logging') || capability.includes('telemetry')) return 'infra';
    if (capability.includes('schema') || capability.includes('contract') || capability.includes('database') || capability.includes('data') || capability.includes('vector') || capability.includes('embedding')) return 'data';
    return 'integration';
  }

  listServices(type?: ServiceEntry['type']): ServiceEntry[] {
    if (type) return this.services.filter(s => s.type === type && s.status === 'active');
    return this.services.filter(s => s.status === 'active');
  }

  getService(nameOrId: string): ServiceEntry | undefined {
    return this.services.find(s => s.name === nameOrId || s.serviceId === nameOrId);
  }

  findCapabilities(category?: CapabilityEntry['category']): CapabilityEntry[] {
    if (category) return this.capabilities.filter(c => c.category === category);
    return [...this.capabilities];
  }

  queryByTag(tag: string): ServiceEntry[] {
    return this.services.filter(s => s.status === 'active' && s.tags.includes(tag));
  }

  getCapabilitiesForService(name: string): CapabilityEntry[] {
    const service = this.getService(name);
    if (!service) return [];
    return this.capabilities.filter(c => c.serviceId === service.serviceId);
  }

  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const s of this.services) {
      for (const t of s.tags) tagSet.add(t);
    }
    return [...tagSet].sort();
  }

  getServiceCount(): number {
    return this.services.filter(s => s.status === 'active').length;
  }

  getCapabilityCount(): number {
    return this.capabilities.length;
  }

  registerService(entry: ServiceEntry): void {
    const existing = this.services.findIndex(s => s.name === entry.name);
    if (existing >= 0) {
      this.services[existing] = entry;
    } else {
      this.services.push(entry);
    }
    this.buildCapabilityIndex();
  }

  exportCatalog(): { services: ServiceEntry[]; capabilities: CapabilityEntry[]; tags: string[] } {
    return {
      services: this.listServices(),
      capabilities: this.findCapabilities(),
      tags: this.getAllTags(),
    };
  }
}
