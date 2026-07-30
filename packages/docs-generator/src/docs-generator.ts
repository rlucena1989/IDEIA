import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
import { APIDoc, CommandDoc, DocFormat, GenerateOptions, PackageDoc } from './types';

const PACKAGES_META: PackageDoc[] = [
  { name: '@ideia/contracts', description: 'Tipos, schemas e contratos do domínio da IDE', exports: ['RequirementSchema', 'WorkflowTaskSchema', 'TraceLinkSchema', 'FeedbackEventSchema', 'AgentIdentitySchema', 'Decision', 'RiskLevel', 'Actor'], dependencies: ['zod'], commands: [] },
  { name: '@ideia/event-bus', description: 'Event Bus pub-sub com 16 tipos de evento, WebSocket broadcast', exports: ['EventBus', 'WSBroadcast', 'EventType', 'BusEvent'], dependencies: ['@ideia/contracts', 'ws'], commands: [] },
  { name: '@ideia/policy-engine', description: 'Engine de classificação e controle de ações (auto/ask/block)', exports: ['evaluatePolicy', 'evaluateBatch', 'PolicyInput', 'PolicyResult'], dependencies: ['@ideia/contracts'], commands: [] },
  { name: '@ideia/policy-gateway', description: 'Gateway de políticas com audit log e endpoint guard', exports: ['PolicyGateway', 'EndpointGuard', 'processRequest', 'processBatch', 'GuardRequest', 'GuardResult'], dependencies: ['@ideia/policy-engine'], commands: [] },
  { name: '@ideia/trace-registry', description: 'Trace linking, graph traversal e path finding', exports: ['TraceRegistry', 'TraceLink', 'TraceGraph', 'TracePath', 'LinkRequest'], dependencies: [], commands: [] },
  { name: '@ideia/feedback-pipeline', description: 'Pipeline feedback → recomendações → memória', exports: ['FeedbackPipeline', 'FeedbackEntry', 'Recommendation', 'MemoryEntry', 'FeedbackSubmission'], dependencies: [], commands: [] },
  { name: '@ideia/ide-integration', description: 'Integração central event-bus + trace + feedback + policy', exports: ['IDEIntegration'], dependencies: ['@ideia/event-bus', '@ideia/trace-registry', '@ideia/feedback-pipeline', '@ideia/policy-gateway'], commands: [] },
  { name: '@ideia/requirements-engine', description: 'CRUD, discover, list/search de requisitos com persistência', exports: ['RequirementsEngine', 'Requirement', 'RequirementCreate', 'DiscoveredRequirement'], dependencies: [], commands: [] },
  { name: '@ideia/spec-generator', description: 'Gherkin parser, test stubs para Jest/Vitest/Mocha', exports: ['GherkinParser', 'TestStubGenerator', 'GherkinFeature', 'GherkinScenario'], dependencies: [], commands: [] },
  { name: '@ideia/agent-identity', description: 'RBAC com 5 roles, permission check e pattern matching', exports: ['AgentIdentity', 'RoleDefinition', 'IdentityCheckRequest', 'IdentityCheckResult'], dependencies: [], commands: [] },
  { name: '@ideia/prompt-security', description: 'Sanitização de prompts, rate limiter, 11 regras de segurança', exports: ['PromptSecurity', 'ScanResult', 'SecurityRule', 'SecurityIssue'], dependencies: [], commands: [] },
  { name: '@ideia/delivery-orchestrator', description: 'Deploy, release, review gate, rollback e incidentes', exports: ['DeliveryOrchestrator', 'ReleasePlan', 'DeployEntry', 'Incident', 'ReviewGateRequest'], dependencies: [], commands: [] },
  { name: '@ideia/workflow-engine', description: 'Workflow steps, sprint manager, burndown, AI scheduler', exports: ['WorkflowEngine', 'Workflow', 'Sprint', 'WorkflowStep', 'WorkflowSummary'], dependencies: [], commands: [] },
  { name: '@ideia/schema-registry', description: 'Registro, versionamento, diff e busca de schemas', exports: ['SchemaRegistry', 'SchemaEntry', 'SchemaVersionDiff'], dependencies: [], commands: [] },
  { name: '@ideia/external-connectors', description: 'Connectors Slack, Jira, webhook via MCP-style interface', exports: ['ExternalConnectors', 'SlackMessage', 'JiraIssue', 'WebhookPayload', 'ConnectorConfig'], dependencies: [], commands: [] },
  { name: '@ideia/a11y-scanner', description: 'Scanner de acessibilidade WCAG com 12 regras', exports: ['A11yScanner', 'A11yReport', 'A11yViolation', 'A11yRule', 'ScanOptions'], dependencies: [], commands: [] },
];

export class DocsGenerator {
  generate(_options: GenerateOptions): APIDoc {
    return {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      packages: PACKAGES_META.map(pkg => ({
        ...pkg,
        commands: pkg.commands || this.inferCommands(pkg.name),
      })),
    };
  }

  generateMarkdown(doc: APIDoc): string {
    const lines: string[] = [];

    lines.push(`# AI-Devkit v2 API Documentation`);
    lines.push('');
    lines.push(`**Version:** ${doc.version}`);
    lines.push(`**Generated:** ${doc.generatedAt}`);
    lines.push(`**Packages:** ${doc.packages.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const pkg of doc.packages) {
      lines.push(`## ${pkg.name}`);
      lines.push('');
      lines.push(`${pkg.description}`);
      lines.push('');
      lines.push(`**Exports:** \`${pkg.exports.join('`, `')}\``);
      lines.push('');

      if (pkg.dependencies.length > 0) {
        lines.push(`**Dependencies:** ${pkg.dependencies.join(', ')}`);
        lines.push('');
      }

      if (pkg.commands && pkg.commands.length > 0) {
        lines.push('### Commands');
        lines.push('');
        lines.push('| Command | Description |');
        lines.push('|---------|-------------|');
        for (const cmd of pkg.commands) {
          lines.push(`| \`${cmd.name}\` | ${cmd.description} |`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  generateJSON(doc: APIDoc): string {
    return JSON.stringify(doc, null, 2);
  }

  save(doc: APIDoc, options: GenerateOptions): string[] {
    const outputDir = options.outputDir || '.ai/docs';
    const created: string[] = [];

    fs.mkdirSync(path.resolve(outputDir), { recursive: true });

    const files: Record<string, string> = {
      'api-docs.md': this.generateMarkdown(doc),
      'api-docs.json': this.generateJSON(doc),
    };

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.resolve(outputDir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      created.push(filePath);
    }

    return created;
  }

  private inferCommands(packageName: string): CommandDoc[] {
    const name = packageName.replace('@ideia/', '');
    return [
      { name: `${name}:help`, description: `Show help for ${name}`, category: 'utility' },
    ];
  }
}

export function createDocsGenerator(): DocsGenerator {
  return new DocsGenerator();
}
