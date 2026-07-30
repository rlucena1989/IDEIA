import { createLogger } from '@ideia/logger'
import { Manifest, GenerateOptions, ScanResult, DescriptionLevel, AutonomyLevel } from './types'
import { CodeScanner } from './scanner'
import { ManifestStore } from './store'
import { ManifestValidator } from './validator'

const logger = createLogger('manifest-generator')

export class ManifestGenerator {
  private scanner: CodeScanner
  private store: ManifestStore
  private validator: ManifestValidator

  constructor(scanner?: CodeScanner, store?: ManifestStore, validator?: ManifestValidator) {
    this.scanner = scanner ?? new CodeScanner()
    this.store = store ?? new ManifestStore()
    this.validator = validator ?? new ManifestValidator()
  }

  async generate(options?: GenerateOptions): Promise<Manifest> {
    const scan = await this.scanner.scan()
    const manifest = await this.generateFromScan(scan)

    if (!options?.skipValidation) {
      const validation = this.validator.validate(manifest)
      if (!validation.valid && !options?.force) {
        throw new Error(`Manifest validation failed: ${validation.errors.map(e => e.message).join('; ')}`)
      }
      if (!validation.valid) {
        logger.warn('Manifest validation errors ignored (force)', { errors: validation.errors.length })
      }
    }

    await this.store.write(manifest)
    logger.info('Manifest generated', { id: manifest.id, version: manifest.version })
    return manifest
  }

  async generateFromScan(scan: ScanResult): Promise<Manifest> {
    const now = new Date().toISOString()
    return {
      id: 'ideia-platform',
      version: '1.0.0',
      platformVersion: '0.5.0',
      generatedAt: now,
      generatorVersion: '1.0.0',
      name: 'IDEIA',
      description: 'IDEIA e uma plataforma de desenvolvimento assistido por IA que transforma ideias em sistemas completos.',
      architecture: {
        pattern: 'Clean Architecture + DDD + Event-Driven',
        layers: [
          { id: 'shell', name: 'Shell', description: 'Desktop/Web/Theia Cloud', packages: ['packages/desktop', 'packages/theia-cloud'] },
          { id: 'platform', name: 'Theia Platform', description: 'Theia, Monaco, Theia AI', packages: ['packages/theia-ai', 'packages/editor-core'] },
          { id: 'agents', name: 'Agent Layer', description: '6 agentes especializados', packages: ['packages/agent-runtime', 'packages/workflow-engine'] },
          { id: 'intelligence', name: 'Intelligence Layer', description: 'Pattern Detector, Learning Engine', packages: ['packages/learning-engine', 'packages/rag-engine'] },
          { id: 'memory', name: 'Memory Layer', description: 'Mem0, SQLite+FTS5, DuckDB', packages: ['packages/memory-store', 'packages/vector-store'] },
          { id: 'execution', name: 'Execution Layer', description: 'Agent Runtime, Delivery Orchestrator', packages: ['packages/execution-layer', 'packages/delivery-orchestrator'] },
          { id: 'messaging', name: 'Messaging Layer', description: 'NATS JetStream', packages: ['packages/event-bus'] },
          { id: 'security', name: 'Security Layer', description: 'Cedar Policy, LLM Guard', packages: ['packages/policy-engine', 'packages/prompt-security'] },
          { id: 'infrastructure', name: 'Infrastructure Layer', description: 'Resilience Engine, Trace', packages: ['packages/resilience-engine', 'packages/observability-engine'] },
          { id: 'data', name: 'Data Layer', description: 'PostgreSQL+pgvector, Schema Registry', packages: ['packages/data-layer', 'packages/schema-registry'] },
        ],
        messageBus: { type: 'event-driven', implementation: 'NATS JetStream (in-memory bridge)', patterns: ['pub/sub', 'request/reply', 'key-value', 'dead letter queue', 'work queue'] },
        extensibility: { pluginSystem: true, mcpSupport: true, adapterArchitecture: true },
      },
      agents: [
        { id: 'analyst', name: 'Analyst', role: 'Requirements analysis and specification', capabilities: ['intent-classification', 'requirement-analysis', 'ambiguity-detection', 'specification-writing'], autonomyLevel: 'N1' as AutonomyLevel, tools: ['read-file', 'search-codebase', 'ask-user'] },
        { id: 'architect', name: 'Architect', role: 'System design and architecture decisions', capabilities: ['system-design', 'technology-evaluation', 'contract-definition', 'adr-creation'], autonomyLevel: 'N1' as AutonomyLevel, tools: ['read-file', 'write-file', 'analyze-dependencies'] },
        { id: 'programmer', name: 'Programmer', role: 'Code implementation', capabilities: ['code-generation', 'code-refactoring', 'bug-fixing', 'unit-test-writing'], autonomyLevel: 'N2' as AutonomyLevel, tools: ['read-file', 'write-file', 'run-command', 'git-operations'] },
        { id: 'reviewer', name: 'Reviewer', role: 'Code review and quality assurance', capabilities: ['code-review', 'quality-check', 'security-scan', 'style-enforcement'], autonomyLevel: 'N1' as AutonomyLevel, tools: ['read-file', 'run-linter', 'security-scan'] },
        { id: 'tester', name: 'Tester', role: 'Test generation and execution', capabilities: ['test-generation', 'test-execution', 'coverage-analysis', 'mutation-testing'], autonomyLevel: 'N2' as AutonomyLevel, tools: ['read-file', 'write-file', 'run-tests'] },
        { id: 'devops', name: 'DevOps', role: 'Infrastructure, deployment, and operations', capabilities: ['infrastructure-as-code', 'ci-cd-pipeline', 'deployment-automation', 'monitoring-setup'], autonomyLevel: 'N2' as AutonomyLevel, tools: ['read-file', 'run-command', 'docker-operations', 'kubernetes-operations'] },
      ],
      capabilities: [
        { id: 'cap-intent-classification', name: 'Intent Classification', description: 'Classifica intencao do usuario', category: 'intelligence', riskLevel: 'low' },
        { id: 'cap-code-generation', name: 'Code Generation', description: 'Gera codigo TypeScript, Python, Rust', category: 'implementation', riskLevel: 'medium' },
        { id: 'cap-code-review', name: 'Code Review', description: 'Revisa codigo automaticamente', category: 'quality', riskLevel: 'low' },
        { id: 'cap-deployment', name: 'Automated Deployment', description: 'Deploy automatizado com rollback', category: 'delivery', riskLevel: 'high' },
        { id: 'cap-memory', name: 'Persistent Memory', description: 'Memoria entre sessoes', category: 'intelligence', riskLevel: 'low' },
      ],
      tools: [
        { id: 'read-file', name: 'readFile', description: 'Read a file from the filesystem', parameters: { path: { type: 'string', description: 'Absolute path to the file', required: true } }, dangerous: false },
        { id: 'write-file', name: 'writeFile', description: 'Write content to a file', parameters: { path: { type: 'string', description: 'Absolute path to the file', required: true }, content: { type: 'string', description: 'Content to write', required: true } }, dangerous: false },
        { id: 'run-command', name: 'runCommand', description: 'Execute a shell command', parameters: { command: { type: 'string', description: 'Shell command to execute', required: true }, timeout: { type: 'integer', description: 'Maximum execution time in ms', required: false } }, dangerous: true },
      ],
      commands: [
        { path: 'IDEIA init', description: 'Initialize a new project', category: 'core', examples: ['IDEIA init my-project --template node-api'] },
        { path: 'IDEIA generate', description: 'Generate code from templates', category: 'core', examples: ['IDEIA generate component Button --type react'] },
        { path: 'IDEIA audit', description: 'Run all auditors', category: 'governance', examples: ['IDEIA audit --ci'] },
        { path: 'IDEIA verify', description: 'Verify project compliance', category: 'governance', examples: ['IDEIA verify --all'] },
        { path: 'IDEIA reality-sync', description: 'Synchronize documentation with code reality', category: 'governance', aliases: ['IDEIA rs'], examples: ['IDEIA reality-sync start'] },
      ],
      contextPacks: [
        { level: 'summary' as DescriptionLevel, tokenBudget: 500, sections: [{ id: 'identity', name: 'Platform Identity', maxTokens: 100 }, { id: 'agents', name: 'Available Agents', maxTokens: 200 }, { id: 'capabilities', name: 'Key Capabilities', maxTokens: 200 }] },
        { level: 'full' as DescriptionLevel, tokenBudget: 4000, sections: [{ id: 'identity', name: 'Platform Identity', maxTokens: 200 }, { id: 'architecture', name: 'Architecture Overview', maxTokens: 800 }, { id: 'agents', name: 'Agent Definitions', maxTokens: 1000 }, { id: 'tools', name: 'Available Tools', maxTokens: 600 }, { id: 'commands', name: 'CLI Commands', maxTokens: 600 }, { id: 'capabilities', name: 'Capabilities', maxTokens: 400 }, { id: 'rules', name: 'Rules and Constraints', maxTokens: 400 }] },
        { level: 'detailed' as DescriptionLevel, tokenBudget: 8000, sections: [{ id: 'identity', name: 'Platform Identity', maxTokens: 300 }, { id: 'architecture', name: 'Full Architecture', maxTokens: 1500 }, { id: 'agents', name: 'All Agents', maxTokens: 1500 }, { id: 'tools', name: 'All Tools', maxTokens: 1000 }, { id: 'commands', name: 'All Commands', maxTokens: 1000 }, { id: 'capabilities', name: 'All Capabilities', maxTokens: 800 }, { id: 'rules', name: 'All Rules', maxTokens: 800 }, { id: 'events', name: 'Event Registry', maxTokens: 500 }, { id: 'contracts', name: 'Contract Registry', maxTokens: 500 }, { id: 'limitations', name: 'Limitations', maxTokens: 100 }] },
      ],
      registries: {
        schemas: [{ name: 'Manifest Schema', version: '1.0.0', url: '.ideia/manifest/schema.json', description: 'JSON Schema for IDEIA manifest' }],
        events: [{ name: 'Event Registry', version: '1.0.0', url: '.ideia/manifest/events.json', description: 'All events published/subscribed by IDEIA' }],
        contracts: [{ name: 'Contract Registry', version: '1.0.0', url: '.ideia/manifest/contracts.json', description: 'All cross-layer contracts in IDEIA' }],
      },
      adapters: [
        { id: 'adapter-ts', language: 'TypeScript', status: 'stable' as const, capabilities: ['generation', 'analysis', 'refactoring'] },
        { id: 'adapter-py', language: 'Python', status: 'beta' as const, capabilities: ['generation', 'analysis'] },
        { id: 'adapter-rs', language: 'Rust', status: 'beta' as const, capabilities: ['generation'] },
      ],
      workflows: [
        {
          id: 'wf-feature', name: 'Feature Implementation',
          description: 'Complete feature implementation: analyze, design, implement, test, deploy',
          steps: [
            { id: 'step-analyze', agent: 'analyst', action: 'analyze-requirements', timeout: 120000 },
            { id: 'step-design', agent: 'architect', action: 'design-solution', timeout: 180000 },
            { id: 'step-implement', agent: 'programmer', action: 'implement-feature', timeout: 600000 },
            { id: 'step-test', agent: 'tester', action: 'run-tests', timeout: 300000 },
            { id: 'step-review', agent: 'reviewer', action: 'review-code', timeout: 120000 },
            { id: 'step-deploy', agent: 'devops', action: 'deploy', timeout: 300000 },
          ],
        },
      ],
      limitations: {
        notImplemented: ['NATS JetStream nativo', 'LangGraph multi-agente', 'Cedar Policy Engine', 'Tauri desktop app', 'Theia Cloud deployment', 'ArgoCD/GitOps delivery', 'DSPy optimization pipeline'],
        experimental: ['Self-Optimization Panel', 'Autonomous Evolution Engine', 'Knowledge Graph', 'Contract Testing (Pact)'],
        deprecated: [],
        maxContextWindow: 128000,
        maxTokens: 4096,
        supportedModels: ['ollama/*', 'openai/gpt-4', 'openai/gpt-4o', 'anthropic/claude-3-opus', 'deepseek/deepseek-chat'],
      },
    }
  }
}
