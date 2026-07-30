import { ContextPack } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('prebuilt-packs');

const IDEIA_INTRO: ContextPack = {
  name: 'ideia-introduction',
  version: '1.0.0',
  displayName: 'IDEIA Introduction',
  description: 'Complete presentation of IDEIA — architecture, agents, commands, rules, tools, workflow. Fundamental pack every LLM needs to understand the system.',
  author: 'IDEIA',
  tags: ['core', 'essential', 'mandatory'],
  categories: ['core'],
  level: 'beginner',
  variables: [
    { name: 'agent_role', type: 'string', description: 'Agent role', required: false, default: 'assistant' },
    { name: 'interaction_type', type: 'enum', description: 'Type of interaction', required: false, default: 'chat', enum: ['chat', 'command', 'agent'] },
    { name: 'autonomy_level', type: 'enum', description: 'Autonomy level', required: false, default: 'N1', enum: ['N0', 'N1', 'N2', 'N3'] },
  ],
  sections: [
    { id: 'architecture_overview', title: 'Architecture Overview', format: 'markdown', priority: 'P0', content: 'IDEIA has 15 layers of architecture: Shell → Theia Platform → Agent Layer → Intelligence → Memory → Execution → Messaging → Security → Infra → Data.' },
    { id: 'agent_roles', title: 'Agent Roles', format: 'markdown', priority: 'P0', content: 'Six agents: Analyst (requirements), Architect (design), Programmer (code), Reviewer (quality), Tester (tests), DevOps (deploy).' },
    { id: 'global_rules', title: 'Global Rules', format: 'markdown', priority: 'P0', content: 'R1: No secrets in code. R2: All code must be typed. R3: Tests required for new features. R4: Follow Clean Architecture. R5: No circular dependencies. R6: Prefer pure functions.' },
    { id: 'commands_reference', title: 'Commands Reference', format: 'markdown', priority: 'P1', content: '153+ CLI commands across categories: init, generate, audit, verify, drift, policy, compliance, docs, workflow, report, memory, evolution, optimize, coverage, agents, catalog, tutorial, lifecycle.' },
    { id: 'tools_available', title: 'Tools Available', format: 'markdown', priority: 'P1', content: 'FileSystem, Search, Code, Shell, LLM, Browser, Agent communication via NATS.' },
    { id: 'architecture_principles', title: 'Architecture Principles', format: 'markdown', priority: 'P2', content: 'Clean Architecture, DDD, NATS JetStream, LangGraph, Theia Platform, Inversify DI.' },
    { id: 'quality_gates', title: 'Quality Gates', format: 'markdown', priority: 'P2', content: '4 gates: Commit, PR, Release, Production. 7 quality dimensions: Code, Security, Performance, UX, Integration, Resilience, Data.' },
  ],
  dependencies: [],
  slicing: [
    { maxTokens: 4096, strategy: 'priority', maxSections: 3 },
    { maxTokens: 8192, strategy: 'priority', maxSections: 5 },
    { maxTokens: 32768, strategy: 'priority' },
  ],
  hooks: [],
  examples: [],
  totalTokens: 2450,
};

const BUGFIX_PACK: ContextPack = {
  name: 'bugfix',
  version: '1.0.0',
  displayName: 'Bug Fix Context',
  description: 'Complete context for bug fixing on IDEIA platform. Structured diagnosis, reproduction template, root cause analysis, fix patterns and post-fix validation checklist.',
  author: 'IDEIA',
  tags: ['debug', 'fix', 'quality', 'troubleshooting'],
  categories: ['quality', 'maintenance'],
  level: 'intermediate',
  variables: [
    { name: 'bug_description', type: 'string', description: 'Detailed bug description', required: true },
    { name: 'severity', type: 'enum', description: 'Bug severity level', required: false, default: 'medium', enum: ['low', 'medium', 'high', 'critical'] },
    { name: 'expected_behavior', type: 'string', description: 'Expected behavior', required: true },
    { name: 'actual_behavior', type: 'string', description: 'Actual behavior', required: true },
    { name: 'reproduction_steps', type: 'string', description: 'Steps to reproduce', required: true },
  ],
  sections: [
    { id: 'bug_context', title: 'Bug Context', format: 'markdown', priority: 'P0', content: '## Bug Context\n**Description:** {{bug_description}}\n**Severity:** {{severity}}\n**Expected:** {{expected_behavior}}\n**Actual:** {{actual_behavior}}' },
    { id: 'reproduction', title: 'Reproduction Steps', format: 'markdown', priority: 'P0', content: '## Reproduction\n{{reproduction_steps}}' },
    { id: 'diagnosis_framework', title: 'Diagnosis Framework', format: 'markdown', priority: 'P1', content: '## 5 Whys Method\n1. Why does the current behavior occur?\n2. Why does the above cause exist?\n3. Why does the above cause exist?\n4. Why does the above cause exist?\n5. Why does the above cause exist?' },
    { id: 'fix_patterns', title: 'Fix Patterns', format: 'markdown', priority: 'P2', content: '| Bug Type | Pattern | Approach |\n| NullPointer | Null Object | Return empty object |\n| Race Condition | Mutex | Synchronize resource |\n| Memory Leak | WeakRef | Release in finally |\n| Timeout | Circuit Breaker | Fail fast |' },
    { id: 'validation_checklist', title: 'Validation Checklist', format: 'markdown', priority: 'P1', content: '- [ ] Bug no longer reproducible\n- [ ] Unit test covers the scenario\n- [ ] Regression test added' },
  ],
  dependencies: [{ pack: 'ideia-introduction', version: '^1.0.0', required: true }],
  slicing: [{ maxTokens: 4096, strategy: 'priority', maxSections: 3 }, { maxTokens: 8192, strategy: 'priority', maxSections: 5 }, { maxTokens: 32768, strategy: 'priority' }],
  hooks: [],
  examples: [],
  totalTokens: 3800,
};

const SECURITY_PACK: ContextPack = {
  name: 'security-review',
  version: '1.0.0',
  displayName: 'Security Review',
  description: 'Context for security review and auditing. OWASP Top 10 checklist, threat modeling template, remediation guides, and reporting templates.',
  author: 'IDEIA',
  tags: ['security', 'audit', 'review', 'vulnerability'],
  categories: ['security', 'quality'],
  level: 'advanced',
  variables: [
    { name: 'review_scope', type: 'string', description: 'Scope of the security review', required: true },
    { name: 'threat_model', type: 'string', description: 'Threat model to use', required: false },
    { name: 'compliance_standard', type: 'enum', description: 'Compliance standard', required: false, enum: ['owasp', 'lgpd', 'soc2', 'pci', 'hipaa'] },
    { name: 'severity_threshold', type: 'enum', description: 'Severity threshold', required: false, default: 'high', enum: ['low', 'medium', 'high', 'critical'] },
  ],
  sections: [
    { id: 'scope_and_context', title: 'Scope and Context', format: 'markdown', priority: 'P0', content: '## Security Review\n**Scope:** {{review_scope}}\n**Threat Model:** {{threat_model}}\n**Standard:** {{compliance_standard}}' },
    { id: 'owasp_top10_checklist', title: 'OWASP Top 10', format: 'markdown', priority: 'P1', content: '1. Broken Access Control\n2. Cryptographic Failures\n3. Injection\n4. Insecure Design\n5. Security Misconfiguration\n6. Vulnerable Components\n7. Auth Failures\n8. Data Integrity Failures\n9. Logging Failures\n10. SSRF' },
    { id: 'threat_modeling_template', title: 'Threat Modeling', format: 'markdown', priority: 'P1', content: '## STRIDE per Component\n- Spoofing\n- Tampering\n- Repudiation\n- Info Disclosure\n- DoS\n- Elevation of Privilege' },
    { id: 'remediation_templates', title: 'Remediation Templates', format: 'markdown', priority: 'P2', content: '## Remediation Plan\n1. Identify affected components\n2. Apply fix\n3. Verify fix\n4. Monitor for 48h\n5. Update runbooks' },
    { id: 'security_testing_guide', title: 'Security Testing', format: 'markdown', priority: 'P2', content: 'Tools: SAST (ESLint security), DAST (OWASP ZAP), Dependency scan (Snyk), Secret scan (truffleHog).' },
  ],
  dependencies: [
    { pack: 'ideia-introduction', version: '^1.0.0', required: true },
    { pack: 'compliance', version: '^1.0.0', required: false },
  ],
  slicing: [{ maxTokens: 4096, strategy: 'priority', maxSections: 2 }, { maxTokens: 8192, strategy: 'priority', maxSections: 4 }],
  hooks: [],
  examples: [],
  totalTokens: 4500,
};

const COMPLIANCE_PACK: ContextPack = {
  name: 'compliance',
  version: '1.0.0',
  displayName: 'Compliance Context',
  description: 'Context for compliance with regulations like LGPD, SOC2, PCI-DSS. Control mapping, evidence templates, audit checklists and remediation guides.',
  author: 'IDEIA',
  tags: ['compliance', 'regulation', 'lgpd', 'soc2', 'audit'],
  categories: ['security', 'compliance'],
  level: 'advanced',
  variables: [
    { name: 'compliance_standard', type: 'enum', description: 'Compliance standard', required: true, enum: ['lgpd', 'soc2', 'pci-dss', 'hipaa', 'sox', 'iso27001', 'gdpr'] },
    { name: 'audit_type', type: 'enum', description: 'Audit type', required: false, default: 'internal', enum: ['internal', 'external', 'self-assessment', 'continuous'] },
  ],
  sections: [
    { id: 'compliance_context', title: 'Compliance Context', format: 'markdown', priority: 'P0', content: '## Compliance: {{compliance_standard}}\n**Audit Type:** {{audit_type}}' },
    { id: 'control_mapping', title: 'Control Mapping', format: 'table', priority: 'P1', content: '| Control ID | Description | Status |\n| CTRL-001 | Access Control | Implemented |\n| CTRL-002 | Encryption at Rest | Implemented |\n| CTRL-003 | Audit Logging | In Progress |' },
    { id: 'evidence_template', title: 'Evidence Template', format: 'markdown', priority: 'P1', content: '## Evidence Collection\n1. Configuration snapshots\n2. Access logs\n3. Encryption verification\n4. Incident reports' },
    { id: 'audit_checklist', title: 'Audit Checklist', format: 'markdown', priority: 'P2', content: '- [ ] Data inventory complete\n- [ ] Consent mechanisms in place\n- [ ] DPIAs conducted\n- [ ] Breach notification procedure defined' },
  ],
  dependencies: [
    { pack: 'ideia-introduction', version: '^1.0.0', required: true },
    { pack: 'security-review', version: '^1.0.0', required: false },
  ],
  slicing: [],
  hooks: [],
  examples: [],
  totalTokens: 3500,
};

const CODING_STANDARDS_PACK: ContextPack = {
  name: 'coding-standards',
  version: '1.0.0',
  displayName: 'Coding Standards',
  description: 'Context for coding standards and conventions. TypeScript strict mode rules, naming conventions, project structure guidelines and code quality rules.',
  author: 'IDEIA',
  tags: ['coding', 'standards', 'style', 'typescript', 'quality'],
  categories: ['quality', 'development'],
  level: 'intermediate',
  variables: [
    { name: 'language', type: 'language', description: 'Primary language', required: true },
    { name: 'framework', type: 'framework', description: 'Framework', required: false, default: 'React' },
  ],
  sections: [
    { id: 'ts_strict_rules', title: 'TypeScript Strict Rules', format: 'code', priority: 'P0', content: '// TypeScript Strict Mode\n// - noImplicitAny: true\n// - strictNullChecks: true\n// - noUnusedLocals: true\n// - noUnusedParameters: true\n// - exactOptionalPropertyTypes: true' },
    { id: 'naming_conventions', title: 'Naming Conventions', format: 'markdown', priority: 'P1', content: '| Element | Convention | Example |\n| Classes | PascalCase | UserService |\n| Functions | camelCase | getUserById |\n| Interfaces | PascalCase | IUserRepository |\n| Types | PascalCase | UserStatus |\n| Enums | PascalCase | HttpStatus |\n| Constants | UPPER_CASE | MAX_RETRY_COUNT |' },
    { id: 'project_structure', title: 'Project Structure', format: 'markdown', priority: 'P1', content: 'packages/\n  module-name/\n    src/\n      index.ts\n      types.ts\n      service.ts\n    tests/\n      service.test.ts' },
    { id: 'quality_rules', title: 'Quality Rules', format: 'markdown', priority: 'P2', content: '- No `any` type without justification\n- No `!` non-null assertions in production\n- Prefer pure functions over side effects\n- Single responsibility per module\n- Maximum 300 lines per file' },
  ],
  dependencies: [{ pack: 'ideia-introduction', version: '^1.0.0', required: true }],
  slicing: [{ maxTokens: 4096, strategy: 'priority', maxSections: 3 }],
  hooks: [],
  examples: [],
  totalTokens: 2800,
};

const REFACTOR_PACK: ContextPack = {
  name: 'refactor',
  version: '1.0.0',
  displayName: 'Refactoring Context',
  description: 'Context for code refactoring. Behavior preservation strategies, code smell checklists, target patterns and validation plans.',
  author: 'IDEIA',
  tags: ['refactoring', 'quality', 'clean-code'],
  categories: ['quality', 'maintenance'],
  level: 'advanced',
  variables: [
    { name: 'refactor_target', type: 'string', description: 'Target to refactor', required: true },
    { name: 'refactor_goal', type: 'string', description: 'Goal of refactoring', required: true },
    { name: 'target_pattern', type: 'string', description: 'Target design pattern', required: false },
    { name: 'preserve_api', type: 'boolean', description: 'Preserve existing API', required: false, default: true },
  ],
  sections: [
    { id: 'refactor_context', title: 'Refactoring Context', format: 'markdown', priority: 'P0', content: '## Refactoring: {{refactor_target}}\n**Goal:** {{refactor_goal}}\n**Preserve API:** {{preserve_api}}' },
    { id: 'behavior_preservation', title: 'Behavior Preservation', format: 'markdown', priority: 'P0', content: '1. Characterize existing behavior (tests)\n2. Identify input/output contracts\n3. Write characterization tests\n4. Refactor with test protection\n5. Verify behavior unchanged' },
    { id: 'strategy_suggestions', title: 'Strategy Suggestions', format: 'markdown', priority: 'P1', content: '| Goal | Strategy |\n| Reduce complexity | Extract method |\n| Remove duplication | Pull up / Template Method |\n| Improve cohesion | Extract class |\n| Reduce coupling | Dependency inversion |' },
    { id: 'code_smell_checklist', title: 'Code Smells', format: 'markdown', priority: 'P1', content: '- [ ] Long method (>30 lines)\n- [ ] Large class (>300 lines)\n- [ ] Feature envy\n- [ ] Shotgun surgery\n- [ ] Primitive obsession\n- [ ] Switch statement' },
    { id: 'validation_plan', title: 'Validation Plan', format: 'markdown', priority: 'P2', content: '- Same outputs for same inputs\n- No performance regression\n- Test coverage maintained\n- Public API unchanged' },
  ],
  dependencies: [{ pack: 'ideia-introduction', version: '^1.0.0', required: true }],
  slicing: [],
  hooks: [],
  examples: [],
  totalTokens: 3200,
};

export const PREBUILT_PACKS: Record<string, ContextPack> = {
  'ideia-introduction': IDEIA_INTRO,
  'bugfix': BUGFIX_PACK,
  'security-review': SECURITY_PACK,
  'compliance': COMPLIANCE_PACK,
  'coding-standards': CODING_STANDARDS_PACK,
  'refactor': REFACTOR_PACK,
};
