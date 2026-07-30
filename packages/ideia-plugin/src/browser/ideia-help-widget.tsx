import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { ErrorBoundary } from './ideia-error-boundary';

interface GlossaryTerm {
  term: string;
  description: string;
  category: string;
}

const STATIC_GLOSSARY: GlossaryTerm[] = [
  { term: 'autonomy', description: 'Nível de independência da IA (N0-N4)', category: 'architecture' },
  { term: 'checkpoint', description: 'Ponto de verificação onde o progresso é salvo', category: 'workflow' },
  { term: 'gate', description: 'Barreira de qualidade automatizada', category: 'quality' },
  { term: 'scope', description: 'Limite contextual de atuação de um agente', category: 'architecture' },
  { term: 'agent', description: 'Entidade de IA especializada', category: 'agent' },
  { term: 'orchestrator', description: 'Coordenador de múltiplos agentes', category: 'architecture' },
  { term: 'workflow', description: 'Sequência de passos orquestrados', category: 'workflow' },
  { term: 'audit trail', description: 'Registro imutável de ações', category: 'security' },
  { term: 'policy', description: 'Regras declarativas de segurança', category: 'security' },
  { term: 'sandbox', description: 'Ambiente isolado para execução segura', category: 'security' },
  { term: 'event bus', description: 'Barramento de eventos (NATS)', category: 'architecture' },
  { term: 'contract', description: 'Contrato entre módulos validado com Contract.pre()', category: 'architecture' },
  { term: 'canary', description: 'Deploy progressivo 10/50/100%', category: 'workflow' },
  { term: 'rollback', description: 'Reversão automática para estado anterior', category: 'workflow' },
  { term: 'prompt pipeline', description: 'Pipeline de 6 estágios para prompts', category: 'architecture' },
];

const CONTEXT_HELP: Record<string, { title: string; content: string }> = {
  dashboard: { title: 'Dashboard', content: 'Métricas em tempo real: throughput, latência, memória, comandos executados, erros vs sucessos.' },
  chat: { title: 'Chat', content: 'Converse com a IA. Use Ctrl+Enter para enviar, botão Cancel para interromper streaming.' },
  diff: { title: 'Diff', content: 'Visualize mudanças entre versões de arquivos. Aceite ou rejeite alterações.' },
  approval: { title: 'Approval', content: 'Aprovações em 3 níveis: dev, tech-lead, security.' },
  studies: { title: 'Studies', content: '71 documentos de estudo catalogados com análise de concorrência e métricas.' },
  security: { title: 'Security', content: '7 camadas de segurança: input validation, policy, sandbox, circuit breaker, output validation, audit trail, emergency stop.' },
  search: { title: 'Search', content: 'Busca inteligente no projeto. Ctrl+Shift+F para abrir.' },
  selfopt: { title: 'Self-Optimization', content: 'Painel de auto-otimização com métricas em tempo real e ações de otimização.' },
  config: { title: 'Config', content: 'Configuração visual da IDEIA. Abas: General, Agents, Security, Performance, Appearance.' },
  cockpit: { title: 'Cockpit', content: 'Visão geral do ecossistema: agentes ativos, tasks, provedores, extensões.' },
};

@injectable()
export class IDEIA_HelpWidget extends BaseWidget {
  static ID = 'ideia:help';
  static LABEL = 'IDEIA Help';

  private root: Root | undefined;
  private searchQuery = '';
  private selectedCategory = 'all';

  constructor() {
    super();
    this.id = IDEIA_HelpWidget.ID;
    this.title.label = IDEIA_HelpWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-question';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.update();
  }

  protected override onActivateRequest(): void {
    this.node.focus();
    this.update();
  }

  protected override onResize(): void {
    this.update();
  }

  override update(): void {
    if (!this.root) {
      this.root = createRoot(this.node);
    }
    this.root.render(<ErrorBoundary><HelpPanel
      searchQuery={this.searchQuery}
      selectedCategory={this.selectedCategory}
      onSearchChange={q => { this.searchQuery = q; this.update(); }}
      onCategoryChange={c => { this.selectedCategory = c; this.update(); }}
    /></ErrorBoundary>);
  }

  override dispose(): void {
    this.root?.unmount();
    super.dispose();
  }
}

function HelpPanel({ searchQuery, selectedCategory, onSearchChange, onCategoryChange }: {
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
}): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<'glossary' | 'contexts'>('glossary');

  const filteredTerms = STATIC_GLOSSARY.filter(t => {
    const matchesSearch = !searchQuery ||
      t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '12px', fontFamily: 'var(--theia-ui-font-family)' }}>
      <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>IDEIA Help</h2>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('glossary')}
          style={tabStyle(activeTab === 'glossary')}
        >Glossary</button>
        <button
          onClick={() => setActiveTab('contexts')}
          style={tabStyle(activeTab === 'contexts')}
        >Contexts</button>
      </div>
      <input
        type="text"
        placeholder="Search help..."
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        style={{
          width: '100%', padding: '6px 8px', marginBottom: '8px',
          border: '1px solid var(--theia-input-border)',
          background: 'var(--theia-input-background)',
          color: 'var(--theia-input-foreground)',
          borderRadius: '4px', boxSizing: 'border-box',
        }}
      />
      {activeTab === 'glossary' ? (
        <GlossaryTab
          terms={filteredTerms}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      ) : (
        <ContextsTab contexts={CONTEXT_HELP} searchQuery={searchQuery} />
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '6px 12px', cursor: 'pointer',
    border: 'none', borderRadius: '4px',
    background: active ? 'var(--theia-activityBar-activeBorder)' : 'var(--theia-activityBar-background)',
    color: active ? 'var(--theia-activityBar-activeForeground)' : 'var(--theia-activityBar-foreground)',
    fontWeight: active ? 600 : 400,
  };
}

function GlossaryTab({ terms, selectedCategory, onCategoryChange }: {
  terms: GlossaryTerm[];
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
}): React.ReactElement {
  const categories = ['all', ...new Set(STATIC_GLOSSARY.map(t => t.category))];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            style={{
              padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
              border: '1px solid var(--theia-dropdown-border)',
              borderRadius: '12px',
              background: selectedCategory === cat ? 'var(--theia-activityBar-activeBorder)' : 'transparent',
              color: selectedCategory === cat ? 'var(--theia-activityBar-activeForeground)' : 'var(--theia-foreground)',
            }}
          >{cat}</button>
        ))}
      </div>
      {terms.length === 0 ? (
        <div style={{ opacity: 0.6, padding: '20px 0', textAlign: 'center' }}>No terms found.</div>
      ) : (
        terms.map(t => (
          <div key={t.term} style={{ marginBottom: '8px', padding: '8px', borderRadius: '4px', background: 'var(--theia-list-hoverBackground)' }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t.term}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{t.description}</div>
            <span style={{ fontSize: '10px', opacity: 0.5, marginTop: '2px', display: 'inline-block' }}>{t.category}</span>
          </div>
        ))
      )}
    </div>
  );
}

function ContextsTab({ contexts, searchQuery }: {
  contexts: Record<string, { title: string; content: string }>;
  searchQuery: string;
}): React.ReactElement {
  const filtered = Object.entries(contexts).filter(([key, val]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return key.toLowerCase().includes(q) || val.title.toLowerCase().includes(q) || val.content.toLowerCase().includes(q);
  });

  return (
    <div>
      {filtered.length === 0 ? (
        <div style={{ opacity: 0.6, padding: '20px 0', textAlign: 'center' }}>No contexts found.</div>
      ) : (
        filtered.map(([key, ctx]) => (
          <div key={key} style={{ marginBottom: '10px', padding: '8px', borderRadius: '4px', background: 'var(--theia-list-hoverBackground)' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{ctx.title} <span style={{ fontSize: '10px', opacity: 0.4 }}>({key})</span></div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{ctx.content}</div>
          </div>
        ))
      )}
    </div>
  );
}

