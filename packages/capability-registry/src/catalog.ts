import type { Capability } from './types/capability';

function cap(id: string, name: string, desc: string, cat: Capability['category'], sub: string, deps: Capability['dependsOn'] = [], tags: string[] = []): Capability {
  return { id, name, description: desc, category: cat, subcategory: sub, version: '1.0.0', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependsOn: deps, inputs: [], outputs: [], examples: [], tags, metadata: { tags, keywords: [], links: {} } };
}

export const CATALOG: Capability[] = [
  // Agents
  cap('agent.analyst', 'Analyst Agent', 'Analisa requisitos, identifica ambiguidades, documenta especificacoes', 'agent', 'analysis', [], ['agent', 'analysis']),
  cap('agent.architect', 'Architect Agent', 'Propoe arquiteturas, avalia tecnologias, define contratos', 'agent', 'architecture', [], ['agent', 'architecture']),
  cap('agent.programmer', 'Programmer Agent', 'Implementa features, corrige bugs, escreve testes', 'agent', 'implementation', [{ id: 'tool.file.read', version: '>=1.0.0' }, { id: 'tool.file.write', version: '>=1.0.0' }], ['agent', 'implementation']),
  cap('agent.reviewer', 'Reviewer Agent', 'Revisa codigo, verifica qualidade e seguranca', 'agent', 'review', [], ['agent', 'review']),
  cap('agent.tester', 'Tester Agent', 'Gera e executa testes, analisa cobertura', 'agent', 'testing', [], ['agent', 'testing']),
  cap('agent.devops', 'DevOps Agent', 'Configura infra, pipelines, deploy e monitoramento', 'agent', 'devops', [], ['agent', 'devops']),

  // Tools
  cap('tool.file.read', 'File Reader', 'Le conteudo de arquivos do workspace', 'tool', 'codegen', [], ['tool', 'file']),
  cap('tool.file.write', 'File Writer', 'Escreve conteudo em arquivos', 'tool', 'codegen', [], ['tool', 'file']),
  cap('tool.command.run', 'Command Runner', 'Executa comandos shell', 'tool', 'codegen', [], ['tool', 'shell']),
  cap('tool.search.codebase', 'Codebase Search', 'Busca no codigo fonte', 'tool', 'search', [], ['tool', 'search']),
  cap('tool.code.generate', 'Code Generator', 'Gera codigo a partir de templates', 'tool', 'codegen', [], ['tool', 'codegen']),
  cap('tool.code.analyze', 'Code Analyzer', 'Analise estatica de codigo', 'tool', 'analyzer', [], ['tool', 'analyzer']),
  cap('tool.security.scan', 'Security Scanner', 'Varredura de seguranca', 'tool', 'analyzer', [], ['tool', 'security']),
  cap('tool.test.run', 'Test Runner', 'Executa suite de testes', 'tool', 'validator', [{ id: 'tool.command.run', version: '>=1.0.0' }], ['tool', 'testing']),
  cap('tool.git.operate', 'Git Operations', 'Operacoes git (commit, push, branch)', 'tool', 'publisher', [], ['tool', 'git']),
  cap('tool.docker.operate', 'Docker Operations', 'Operacoes Docker (build, run, push)', 'tool', 'publisher', [], ['tool', 'docker']),

  // Context Packs
  cap('pack.ideia-introduction', 'IDEIA Introduction', 'Apresentacao completa da IDEIA para LLMs', 'context-pack', 'project', [], ['core', 'essential']),
  cap('pack.fullstack-feature', 'Fullstack Feature', 'Contexto para features fullstack', 'context-pack', 'domain', [], ['feature', 'fullstack']),
  cap('pack.bugfix', 'Bug Fix', 'Contexto para correcao de bugs', 'context-pack', 'domain', [], ['debug', 'fix']),
  cap('pack.refactor', 'Refactoring', 'Contexto para refatoracao de codigo', 'context-pack', 'domain', [], ['refactoring', 'quality']),
  cap('pack.documentation', 'Documentation', 'Contexto para geracao de documentacao', 'context-pack', 'domain', [], ['docs', 'writing']),
  cap('pack.performance', 'Performance', 'Contexto para otimizacao de performance', 'context-pack', 'domain', [], ['perf', 'optimization']),
  cap('pack.security-review', 'Security Review', 'Contexto para revisao de seguranca', 'context-pack', 'domain', [], ['security', 'audit']),
  cap('pack.migration', 'Migration', 'Contexto para migracao de codigo', 'context-pack', 'domain', [], ['migration', 'upgrade']),
  cap('pack.testing', 'Testing', 'Contexto para criacao de testes', 'context-pack', 'domain', [], ['testing', 'quality']),
  cap('pack.deployment', 'Deployment', 'Contexto para deploy', 'context-pack', 'domain', [], ['deploy', 'devops']),
  cap('pack.onboarding', 'Onboarding', 'Contexto para onboarding de novos usuarios', 'context-pack', 'project', [], ['onboarding', 'learning']),

  // Adapters
  ...['TypeScript', 'Python', 'Rust', 'Go', 'Java', 'Kotlin', 'Elixir', 'Haskell', 'Dart', 'C#', 'PHP', 'Ruby', 'Scala', 'Swift', 'Zig'].map(l => cap(`adapter.${l.toLowerCase()}`, `${l} Adapter`, `Adaptador para linguagem ${l}`, 'adapter', 'language', [], ['adapter', l.toLowerCase()])),
];

export function getCapabilitiesByCategory(cat: Capability['category']): Capability[] {
  return CATALOG.filter(c => c.category === cat);
}

export function getCapabilityById(id: string): Capability | undefined {
  return CATALOG.find(c => c.id === id);
}

export function searchCapabilities(query: string): Capability[] {
  const q = query.toLowerCase();
  return CATALOG.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.tags.some(t => t.includes(q)));
}
