export interface GlossaryTerm {
  term: string;
  description: string;
  category: 'architecture' | 'workflow' | 'security' | 'quality' | 'agent' | 'general';
  relatedTerms?: string[];
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'autonomy',
    description: 'Nível de independência concedido a um agente para tomar decisões sem supervisão humana. Varia de N0 (totalmente assistido) a N4 (totalmente autônomo).',
    category: 'architecture',
    relatedTerms: ['profile', 'agent', 'scope'],
  },
  {
    term: 'checkpoint',
    description: 'Ponto de verificação no fluxo de trabalho onde o progresso é salvo e pode ser revisado ou aprovado antes de continuar.',
    category: 'workflow',
    relatedTerms: ['gate', 'approve'],
  },
  {
    term: 'gate',
    description: 'Barreira de qualidade que impede a progressão se critérios não forem atendidos. Existem 4 gates: commit, PR, release e sprint.',
    category: 'quality',
    relatedTerms: ['checkpoint', 'quality'],
  },
  {
    term: 'scope',
    description: 'Limite contextual que define quais arquivos, diretórios e responsabilidades um agente pode acessar ou modificar.',
    category: 'architecture',
    relatedTerms: ['autonomy', 'profile'],
  },
  {
    term: 'profile',
    description: 'Configuração reutilizável que define autonomia, escopo e comportamento de um agente para um tipo específico de tarefa.',
    category: 'agent',
    relatedTerms: ['autonomy', 'scope'],
  },
  {
    term: 'agent',
    description: 'Entidade de IA especializada que executa tarefas dentro de um escopo definido. Tipos: Analyst, Architect, Programmer, Reviewer, Tester, DevOps.',
    category: 'agent',
    relatedTerms: ['autonomy', 'scope', 'orchestrator'],
  },
  {
    term: 'orchestrator',
    description: 'Coordenador de múltiplos agentes que gerencia fluxo de trabalho, dependências e handoff entre agentes especializados.',
    category: 'architecture',
    relatedTerms: ['agent', 'workflow'],
  },
  {
    term: 'workflow',
    description: 'Sequência definida de passos que orquestra agentes, gates e checkpoints para entregar um resultado.',
    category: 'workflow',
    relatedTerms: ['orchestrator', 'checkpoint', 'gate'],
  },
  {
    term: 'quality gate',
    description: 'Conjunto de critérios automatizados que um PR ou release deve satisfazer antes de avançar. Inclui lint, tipos, cobertura, segurança.',
    category: 'quality',
    relatedTerms: ['gate', 'checkpoint'],
  },
  {
    term: 'coverage',
    description: 'Percentual de código exercitado por testes automatizados. Meta mínima: 30% (atual), 50% (Fase 0), 80% (v1.0), 90% (v2.0).',
    category: 'quality',
    relatedTerms: ['quality gate', 'test'],
  },
  {
    term: 'audit trail',
    description: 'Registro imutável de todas as ações executadas pelo sistema, encadeado com SHA-256 para garantir integridade forense.',
    category: 'security',
    relatedTerms: ['compliance', 'security'],
  },
  {
    term: 'compliance',
    description: 'Conformidade com regras de segurança, políticas e regulamentações. Verificada automaticamente por auditores e gates.',
    category: 'security',
    relatedTerms: ['audit trail', 'policy', 'security'],
  },
  {
    term: 'policy',
    description: 'Regra declarativa em YAML que define ações permitidas ou proibidas em contextos específicos. 27 patterns ativos.',
    category: 'security',
    relatedTerms: ['compliance', 'security'],
  },
  {
    term: 'sandbox',
    description: 'Ambiente isolado (vm.Script) para execução segura de código gerado por IA, prevenindo acesso não autorizado ao sistema.',
    category: 'security',
    relatedTerms: ['security', 'policy'],
  },
  {
    term: 'event bus',
    description: 'Barramento de eventos distribuído (NATS JetStream) que conecta todos os módulos de forma assíncrona e resiliente.',
    category: 'architecture',
    relatedTerms: ['orchestrator', 'messaging'],
  },
  {
    term: 'LSP',
    description: 'Language Server Protocol — 8 providers implementados para 5 linguagens, fornecendo completação, hover, definição, referências e mais.',
    category: 'architecture',
    relatedTerms: ['DAP', 'IDE'],
  },
  {
    term: 'DAP',
    description: 'Debug Adapter Protocol — protocolo de debug com breakpoints, step, stack, variáveis e REPL via WebSocket.',
    category: 'architecture',
    relatedTerms: ['LSP', 'IDE'],
  },
  {
    term: 'contract',
    description: 'Contrato explícito entre módulos, validado com Contract.pre(). Schemas registrados no Schema Registry com SLOs definidos.',
    category: 'architecture',
    relatedTerms: ['quality gate', 'integration'],
  },
  {
    term: 'red teaming',
    description: 'Teste automatizado de segurança que simula ataques para identificar vulnerabilidades no sistema e nos modelos de IA.',
    category: 'security',
    relatedTerms: ['security', 'audit trail', 'policy'],
  },
  {
    term: 'SBOM',
    description: 'Software Bill of Materials — inventário de todos os componentes e dependências, gerado em formato CycloneDX 1.5.',
    category: 'security',
    relatedTerms: ['compliance', 'security', 'supply-chain'],
  },
  {
    term: 'canary',
    description: 'Estratégia de deploy progressivo (10% → 50% → 100%) que minimiza risco liberando para um subconjunto de usuários primeiro.',
    category: 'workflow',
    relatedTerms: ['workflow', 'gate', 'release'],
  },
  {
    term: 'rollback',
    description: 'Mecanismo de reversão automática para o estado anterior quando um deploy ou mudança apresenta falhas críticas.',
    category: 'workflow',
    relatedTerms: ['canary', 'release', 'resilience'],
  },
  {
    term: 'prompt pipeline',
    description: 'Pipeline automático que classifica, enriquece, otimiza e protege todo prompt antes de chegar à IA. 6 estágios: guard → classify → enrich → optimize → plan → format.',
    category: 'architecture',
    relatedTerms: ['agent', 'security', 'context'],
  },
  {
    term: 'reality manifest',
    description: 'Fonte única da verdade documental do projeto. REALITY-MANIFEST.md contém status real de cada package, endpoint e claim.',
    category: 'general',
    relatedTerms: ['audit trail', 'documentation'],
  },
];

export class Glossary {
  private terms: Map<string, GlossaryTerm>;

  constructor(terms?: GlossaryTerm[]) {
    this.terms = new Map();
    const source = terms ?? GLOSSARY_TERMS;
    for (const t of source) {
      this.terms.set(t.term.toLowerCase(), t);
    }
  }

  lookup(term: string): GlossaryTerm | undefined {
    return this.terms.get(term.toLowerCase().trim());
  }

  search(query: string): GlossaryTerm[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Array.from(this.terms.values()).filter(t =>
      t.term.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
    );
  }

  getAll(): GlossaryTerm[] {
    return Array.from(this.terms.values());
  }

  getByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
    return Array.from(this.terms.values()).filter(t => t.category === category);
  }
}

export { GLOSSARY_TERMS };
