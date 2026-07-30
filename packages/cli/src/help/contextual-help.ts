import { Glossary, GlossaryTerm } from './glossary';
import { createLogger } from '@ideia/logger';
const logger = createLogger('contextual-help');

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  relatedTopics: string[];
  keywords: string[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Primeiros passos com a IDEIA',
    content: `A IDEIA transforma ideias em sistemas completos.
Use 'IDEIA init' para iniciar um novo projeto.
Use 'IDEIA generate' para criar código a partir de descrições.
Use 'IDEIA status' para ver o estado atual do projeto.`,
    relatedTopics: ['init', 'generate', 'workflow'],
    keywords: ['start', 'begin', 'new', 'init', 'tutorial'],
  },
  {
    id: 'autonomy',
    title: 'Níveis de Autonomia',
    description: 'Entenda os níveis N0 a N4',
    content: `N0 (Assistido) — relatar bugs, sugerir features
N1 (Supervisionado) — abrir PR com testes
N2 (Semi-autônomo) — implementar módulo completo
N3 (Autônomo) — orquestrar entrega cross-módulo
N4 (Total) — definir visão estratégica`,
    relatedTopics: ['profile', 'agent', 'scope'],
    keywords: ['autonomy', 'n0', 'n1', 'n2', 'n3', 'n4', 'level'],
  },
  {
    id: 'quality-gates',
    title: 'Quality Gates',
    description: 'Barreiras de qualidade automatizadas',
    content: `Gate 1 — Commit: lint-staged, tsc, jest --changedSince
Gate 2 — PR: lint, types, coverage, security, integration
Gate 3 — Release: E2E, performance, security, resilience
Gate 4 — Sprint: NPS, bugs, technical debt, SLA`,
    relatedTopics: ['quality', 'checkpoint', 'compliance'],
    keywords: ['gate', 'quality', 'check', 'pr', 'release', 'commit'],
  },
  {
    id: 'agent-types',
    title: 'Tipos de Agente',
    description: 'Agentes especializados disponíveis',
    content: `Analyst — analisa requisitos e define escopo
Architect — define arquitetura e contratos
Programmer — implementa código
Reviewer — revisa código e documentação
Tester — cria e executa testes
DevOps — configura CI/CD e infraestrutura`,
    relatedTopics: ['autonomy', 'orchestrator', 'workflow'],
    keywords: ['agent', 'analyst', 'architect', 'programmer', 'reviewer', 'tester', 'devops'],
  },
  {
    id: 'security',
    title: 'Segurança',
    description: 'Camadas de segurança do sistema',
    content: `Sandbox — execução isolada com vm.Script
Policy Engine — 27 patterns (Linux + Windows)
Output Validation — 31 regras PII/secretas
Audit Trail — SHA-256 chain imutável
Red Teaming — testes automatizados de penetração
3 níveis de approval: dev → tech-lead → security`,
    relatedTopics: ['compliance', 'policy', 'audit-trail'],
    keywords: ['security', 'sandbox', 'policy', 'audit', 'red-team', 'approval'],
  },
  {
    id: 'cli-commands',
    title: 'Comandos CLI',
    description: 'Visão geral dos comandos disponíveis',
    content: 'A IDEIA possui 153+ comandos CLI. Use --help em qualquer comando para detalhes. Categorias principais: init, generate, audit, verify, drift, policy, compliance, docs, workflow, report, memory, evolution, optimize, coverage, agents.',
    relatedTopics: ['getting-started', 'workflow'],
    keywords: ['cli', 'command', 'terminal', 'help'],
  },
  {
    id: 'workflow',
    title: 'Fluxo de Trabalho',
    description: 'Como criar e executar workflows',
    content: `1. Defina a ideia ou tarefa
2. A IA classifica e enriquece o prompt
3. Agentes são orquestrados conforme necessário
4. Quality Gates verificam cada etapa
5. Checkpoints permitem aprovação/revisão
6. Entrega contínua com canary deploy`,
    relatedTopics: ['agent-types', 'quality-gates', 'checkpoint'],
    keywords: ['workflow', 'flow', 'process', 'pipeline'],
  },
  {
    id: 'checkpoint',
    title: 'Checkpoints e Aprovação',
    description: 'Sistema de aprovação em 3 níveis',
    content: `Checkpoints salvam o estado do workflow para revisão.
Aprovação em 3 níveis:
Nível 1 — Dev: aprova mudanças no próprio código
Nível 2 — Tech Lead: aprova mudanças entre módulos
Nível 3 — Security: aprova mudanças sensíveis`,
    relatedTopics: ['workflow', 'quality-gates', 'security'],
    keywords: ['checkpoint', 'approve', 'approval', 'review'],
  },
];

export class ContextualHelp {
  private topics: Map<string, HelpTopic>;
  private glossary: Glossary;

  constructor(glossary?: Glossary) {
    this.topics = new Map();
    this.glossary = glossary ?? new Glossary();
    for (const topic of HELP_TOPICS) {
      this.topics.set(topic.id, topic);
    }
  }

  getHelp(topic: string): HelpTopic | undefined {
    return this.topics.get(topic.toLowerCase().trim());
  }

  search(query: string): HelpTopic[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Array.from(this.topics.values()).filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some(k => k.includes(q)),
    );
  }

  getHelpForContext(widget: string): HelpTopic[] {
    const widgetMap: Record<string, string[]> = {
      dashboard: ['getting-started', 'quality-gates'],
      chat: ['agent-types', 'workflow'],
      search: ['getting-started', 'cli-commands'],
      studies: ['quality-gates'],
      security: ['security', 'compliance'],
      approval: ['checkpoint', 'security'],
      diff: ['workflow'],
    };
    const topicIds = widgetMap[widget.toLowerCase()] ?? ['getting-started'];
    return topicIds.map(id => this.topics.get(id)).filter((t): t is HelpTopic => t !== undefined);
  }

  getAllTopics(): HelpTopic[] {
    return Array.from(this.topics.values());
  }

  lookupTerm(term: string): GlossaryTerm | undefined {
    return this.glossary.lookup(term);
  }

  searchGlossary(query: string): GlossaryTerm[] {
    return this.glossary.search(query);
  }
}

export { HELP_TOPICS };
