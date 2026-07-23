# Estudo de UX e Experiência do Usuário — Projeto IDEIA

> **Data:** 2026-07-18
> **Versão:** 1.0
> **Propósito:** Definir o arcabouço completo de experiência do usuário para o produto IDEIA,
> cobrindo jornada do usuário, design system, acessibilidade (WCAG), métricas de UX,
> interação com agentes AI e benchmarking competitivo.
> **Autoria:** Equipe de Produto IDEIA

---

## Sumário

1. [Jornada do Usuário IDEIA](#1-jornada-do-usuário-ideia)
   - 1.1 Insight — O momento da ideia
   - 1.2 Esclarecimento — Refinamento e validação
   - 1.3 Planejamento — Arquitetura e roadmap
   - 1.4 Implementação — Geração de código e iteração
   - 1.5 Validação — Testes e qualidade
   - 1.6 Entrega — Deploy e publicação
   - 1.7 Aprendizado — Feedback e evolução
   - 1.8 Mapa da Jornada Completo
2. [Design System e Interface](#2-design-system-e-interface)
   - 2.1 Análise do Stack Atual (shadcn/ui + Tailwind)
   - 2.2 Recomendações para Component Library
   - 2.3 Temas e Modos
   - 2.4 Responsividade e Mobile
3. [Acessibilidade (WCAG)](#3-acessibilidade-wcag)
   - 3.1 Conformidade Atual vs Necessária
   - 3.2 Perceivable
   - 3.3 Operable
   - 3.4 Understandable
   - 3.5 Robust
   - 3.6 Ferramentas de Auditoria
   - 3.7 Keyboard Navigation e Screen Reader
4. [Métricas de UX](#4-métricas-de-ux)
   - 4.1 NPS (Net Promoter Score)
   - 4.2 Time-to-First-Task (TTFT)
   - 4.3 Task Success Rate (TSR)
   - 4.4 System Usability Scale (SUS)
   - 4.5 Customer Effort Score (CES)
   - 4.6 Painel de Métricas
5. [Design System Técnico](#5-design-system-técnico)
   - 5.1 Design Tokens
   - 5.2 Componentes Base
   - 5.3 Micro-interações e Animações
   - 5.4 Loading, Skeleton e Progress
   - 5.5 Error States e Recovery
6. [Acessibilidade para Agentes AI](#6-acessibilidade-para-agentes-ai)
   - 6.1 Clareza de Intenção
   - 6.2 Transparência de Autonomia
   - 6.3 Feedback Não-verbal
   - 6.4 Padrões de Comunicação
7. [Benchmarking](#7-benchmarking)
   - 7.1 Cursor
   - 7.2 Windsurf
   - 7.3 GitHub Copilot
   - 7.4 Devin
   - 7.5 Matriz Comparativa
   - 7.6 Oportunidades de Diferenciação

---

## 1. Jornada do Usuário IDEIA

A jornada IDEIA é composta por **7 momentos** que formam um ciclo contínuo de transformação de conceitos em sistemas funcionais. Cada momento possui expectativas específicas do usuário, pontos de atrito identificados, métricas de sucesso e mecanismos de feedback.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO IDEIA (7 MOMENTOS)                      │
│                                                                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │  1.      │───▶│  2.      │───▶│  3.      │───▶│  4.      │  │
│   │ INSIGHT  │    │ESCLAREC. │    │PLANEJAM. │    │IMPLEM.   │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│         ▲                                                    │  │
│         │                                                    ▼  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │  7.      │    │  6.      │    │  5.      │◀───│          │  │
│   │ APRENDER │◀───│ ENTREGA  │◀───│ VALIDAÇÃO│    │          │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                   │
│   <<< Ciclo iterativo — cada volta reduz incerteza >>>           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Insight — O momento da ideia

**Descrição:** O usuário traz uma necessidade, problema ou oportunidade. Pode ser vaga ("quero um app de tarefas") ou específica ("preciso de uma API REST com autenticação JWT e PostgreSQL").

**Expectativas:**
- Ser ouvido sem julgamento
- Poder expressar a ideia em linguagem natural
- Ver a IDEIA "entender" o conceito central
- Obter um primeiro feedback que valide o potencial

**Atrito identificado:**
- Ambiguidade natural da linguagem humana
- Usuário pode não saber o que é tecnicamente viável
- Medo de "commit inicial" (investimento emocional na ideia)

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Insight-to-Clarity Rate | % de insights que progridem para esclarecimento | > 85% |
| Time-to-First-Response | Tempo até IDEIA demonstrar compreensão | < 3s |
| Abandonment Rate | % de sessões encerradas no momento 1 | < 10% |

**Feedback loops:**
- **Imediato:** IDEIA parafraseia a ideia em 1-2 frases para confirmar compreensão
- **Visual:** Summary card com entidades, ações, e tecnologias detectadas
- **Iterativo:** Sugestão de 3 perguntas para refinar o conceito

```typescript
// Exemplo de interface do momento Insight
interface InsightMoment {
  userInput: string;
  detectedEntities: Entity[];
  detectedActions: Action[];
  detectedTechStack: Technology[];
  confidence: number; // 0-1
  clarificationQuestions: string[];
  summaryCard: {
    title: string;
    description: string;
    estimatedComplexity: 'low' | 'medium' | 'high';
    suggestedNextSteps: string[];
  };
}
```

### 1.2 Esclarecimento — Refinamento e validação

**Descrição:** Diálogo estruturado onde a IDEIA faz perguntas para refinar requisitos, restrições e preferências.

**Expectativas:**
- Perguntas relevantes e não repetitivas
- Entendimento de trade-offs técnicos
- Poder responder "não sei" sem travar o processo
- Visualização de opções com prós/contra

**Atrito identificado:**
- Cansaço de perguntas (question fatigue)
- Usuário não conhece todas as opções técnicas
- Dificuldade de expressar requisitos não-funcionais

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Questions-to-Spec | N° de perguntas até spec completa | < 10 |
| User Certainty Score | Confiança do usuário na spec resultante (1-5) | > 4.0 |
| Clarification Time | Tempo total no momento 2 | < 15min |

**Estratégia de perguntas adaptativas:**
```
Nível 1 (Raso): O que você quer construir?
Nível 2 (Médio): Quem vai usar? Qual plataforma?
Nível 3 (Profundo): Escalabilidade esperada? Orçamento?
Nível 4 (Expert): Preferências de arquitetura? Restrições de compliance?
```

### 1.3 Planejamento — Arquitetura e roadmap

**Descrição:** IDEIA gera automaticamente a arquitetura do sistema, plano de implementação, escolhas técnicas e estimativas.

**Expectativas:**
- Arquitetura visual (diagramas gerados)
- Justificativa para cada escolha técnica
- Roadmap em fases com dependências
- Estimativas de tempo e esforço

**Atrito identificado:**
- Overwhelm com complexidade do plano
- Desconfiança sobre escolhas arquiteturais
- Dificuldade de navegar plano longo

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Plan Approval Rate | % de planos aceitos sem modificação | > 70% |
| Plan-to-Implement Time | Tempo entre aprovação e início da implementação | < 2min |
| Architecture Understanding | Usuário entende a arquitetura proposta (survey) | > 4.0/5.0 |

**Visualização do plano:**
```
┌────────────────────────────────────────────────────────────────────┐
│ PLANO: "App de Tarefas Colaborativo"                               │
│                                                                    │
│  Fase 1 ─── Fase 2 ─── Fase 3 ─── Fase 4 ─── Fase 5              │
│  (MVP)     (Time)    (Mobile)  (Offline)  (AI)                   │
│  ┌───┐     ┌───┐     ┌───┐     ┌───┐     ┌───┐                  │
│  │Auth│────▶│Team│────▶│API │────▶│Sync│────▶│Recs│              │
│  │CRUD│     │RBAC│     │REST│     │Crdt│     │ML  │              │
│  └───┘     └───┘     └───┘     └───┘     └───┘                  │
│                                                                    │
│  Tech Stack: React + Node.js + PostgreSQL + NATS                  │
│  Estimativa: 4-6 semanas (tempo real) / 2h (IDEIA)               │
└────────────────────────────────────────────────────────────────────┘
```

### 1.4 Implementação — Geração de código e iteração

**Descrição:** Agentes da IDEIA geram código automaticamente, enquanto o usuário revisa, aprova e solicita alterações.

**Expectativas:**
- Código funcional e bem estruturado
- Poder interromper, redirecionar, perguntar
- Ver progresso em tempo real
- Entender o que está sendo gerado e por quê

**Atrito identificado:**
- Ansiedade sobre qualidade do código gerado
- Dificuldade de revisar grandes blocos de código
- Desejo de "colocar a mão na massa" vs. delegar

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Code Acceptance Rate | % de blocos aceitos sem alteração | > 80% |
| Review Time per Block | Tempo médio de revisão | < 30s |
| Interruption Recovery | Tempo para retomar após interrupção | < 5s |
| Generation Speed | Linhas de código por minuto | > 50 LPM |

**Níveis de envolvimento do usuário:**
```
 N0 (Observar) ── N1 (Revisar) ── N2 (Co-pilot) ── N3 (Mão na massa)
   │                  │               │                   │
   └── Apenas vê     └── Aprova      └── Edita junto     └── Escreve
       o resultado       blocos          com IDEIA           com IDEIA
       final                               dando             revisando
                                           sugestões
```

### 1.5 Validação — Testes e qualidade

**Descrição:** IDEIA executa testes automáticos, análise estática, verificação de segurança e validação funcional.

**Expectativas:**
- Validação contínua e não ao final
- Relatórios claros de problemas
- Sugestões de correção automáticas
- Confiança na qualidade do entregável

**Atrito identificado:**
- Falsos positivos em testes
- Complexidade de interpretar relatórios
- Demora na validação

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Test Pass Rate | % de testes passando na primeira execução | > 90% |
| Validation Time | Tempo total de validação | < 5min |
| Bug Escape Rate | Bugs encontrados pós-entrega / funcionalidade | < 0.5 |

### 1.6 Entrega — Deploy e publicação

**Descrição:** IDEIA empacota, faz deploy e disponibiliza o sistema em produção.

**Expectativas:**
- Deploy com um clique
- Ambiente de staging automático
- Rollback simplificado
- Monitoramento configurado

**Atrito identificado:**
- Medo de "quebrar produção"
- Complexidade de configuração de infraestrutura
- Surpresas no ambiente de produção

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Deploy Success Rate | % de deploys bem-sucedidos | > 99% |
| Time-to-Production | Do insight ao deploy | < 2h |
| Rollback Time | Tempo para reverter | < 30s |

### 1.7 Aprendizado — Feedback e evolução

**Descrição:** Coleta de métricas de uso, feedback do usuário e análise para melhoria contínua.

**Expectativas:**
- Entender como o sistema está sendo usado
- Sugestões proativas de melhoria
- Iteração rápida baseada em dados

**Atrito identificado:**
- Dificuldade de interpretar métricas
- Sugestões genéricas demais

**Métricas de sucesso:**
| Métrica | Definição | Meta |
|---------|-----------|------|
| Iteration Cycle Time | Tempo entre identificar melhoria e implementar | < 1h |
| Feature Adoption Rate | % de usuários usando novas features | > 60% |
| Learning Loop Closure | % de feedback que gera ação | > 70% |

### 1.8 Mapa da Jornada Completo

```
MOMENTO      | DURAÇÃO   | USUÁRIO FAZ          | IDEIA FAZ              | FRICTION          | MÉTRICA CHAVE
-------------|-----------|----------------------|------------------------|-------------------|----------------
1. Insight   | 2-5 min   | Descreve ideia       | Entende e resume      | Ambiguidade       | Confiança > 0.8
2. Esclarec. | 10-15 min | Responde perguntas   | Refina requisitos     | Question fatigue  | Tempo < 15min
3. Planejam. | 1-3 min   | Revisa plano         | Gera arquitetura      | Overwhelm         | Approve > 70%
4. Implem.   | 30-120min | Revisa/itera         | Gera código           | Code anxiety      | Accept > 80%
5. Validação | 3-5 min   | Verifica resultados  | Testa e analisa       | False positives   | Pass > 90%
6. Entrega   | 1-2 min   | Aprova deploy        | Deploy e monitora     | Medo de quebrar   | Success > 99%
7. Aprender  | Contínuo  | Usa e dá feedback    | Analisa e sugere      | Genericidade      | Loop > 70%
```

---

## 2. Design System e Interface

### 2.1 Análise do Stack Atual (shadcn/ui + Tailwind)

O projeto atual utiliza **shadcn/ui** sobre **Radix UI** com estilização **Tailwind CSS**. Esta combinação oferece:

**Pontos fortes:**
- Componentes acessíveis por padrão (Radix UI lida com ARIA)
- Customização via Tailwind (utility-first)
- Bundle pequeno (apenas componentes usados são copiados)
- Tema escuro nativo (classe `dark:` via Tailwind)
- Headless UI (controle total sobre estilos)

**Limitações para IDEIA:**
- Falta de componentes complexos (data grid, monaco editor wrapper, chat interface)
- shadcn/ui é unopinionated sobre layout e navegação
- Animações requerem bibliotecas adicionais (framer-motion)
- Não inclui sistema de notificações/toast robusto
- Ausência de componentes para AI interaction (streaming text, confidence indicators)

### 2.2 Recomendações para Component Library

**Estratégia: Base existente + extensões selecionadas**

```
Stack de UI para IDEIA:

┌─────────────────────────────────────────────────────┐
│                   IDEIA UI Layer                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Custom Components (IDEIA-specific)           │  │
│  │  - ChatStream (texto streaming com markdown)   │  │
│  │  - AgentCard (status, confiança, ação atual)   │  │
│  │  - PlanViewer (roadmap visual interativo)       │  │
│  │  - CodeDiff (revisão visual de mudanças)       │  │
│  │  - InsightInput (input inteligente multi-linha) │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Extended Components (bibliotecas externas)    │  │
│  │  - @radix-ui/* (acessibilidade base)           │  │
│  │  - @tanstack/react-table (data grid)           │  │
│  │  - @tanstack/react-virtual (listas grandes)    │  │
│  │  - react-markdown + remark-gfm (rendering MD)  │  │
│  │  - xterm (terminal embarcado)                  │  │
│  │  - monaco-editor (editor de código)            │  │
│  │  - reactflow (diagramas de arquitetura)        │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  shadcn/ui (componentes base)                  │  │
│  │  - Button, Input, Dialog, Dropdown             │  │
│  │  - Card, Tabs, Accordion, Sheet                │  │
│  │  - Tooltip, Popover, Command (cmdk)            │  │
│  │  - Toast, Sonner (notificações)                │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Tailwind CSS + tailwind-variants              │  │
│  │  (design tokens, dark mode, responsive)         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2.3 Temas e Modos

**Design Tokens:**

```typescript
// tokens/colors.ts — Paleta Semântica IDEIA
export const ideiaTokens = {
  color: {
    // Primary — ação principal, confirmação
    primary: {
      DEFAULT: 'hsl(221, 83%, 53%)',    // Azul IDEIA
      foreground: 'hsl(210, 40%, 98%)',
      muted: 'hsl(221, 83%, 85%)',
      subtle: 'hsl(221, 83%, 95%)',
    },
    // Accent — destaque, agente ativo
    accent: {
      DEFAULT: 'hsl(270, 70%, 50%)',     // Roxo — agente AI
      foreground: 'hsl(210, 40%, 98%)',
    },
    // Semantic
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 84%, 60%)',
    info: 'hsl(199, 89%, 48%)',
    // AI Status
    agent: {
      thinking: 'hsl(270, 70%, 60%)',
      generating: 'hsl(180, 80%, 40%)',
      error: 'hsl(0, 84%, 60%)',
      idle: 'hsl(220, 10%, 60%)',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  font: {
    sans: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
}
```

**Modo Claro/Escuro:**

```css
/* Tema Claro (padrão) */
:root {
  --bg-primary: hsl(0, 0%, 100%);
  --bg-secondary: hsl(220, 14%, 96%);
  --bg-tertiary: hsl(220, 14%, 92%);
  --text-primary: hsl(220, 10%, 10%);
  --text-secondary: hsl(220, 10%, 40%);
  --text-muted: hsl(220, 10%, 60%);
  --border: hsl(220, 13%, 88%);
}

/* Tema Escuro */
.dark {
  --bg-primary: hsl(220, 15%, 8%);
  --bg-secondary: hsl(220, 15%, 12%);
  --bg-tertiary: hsl(220, 15%, 16%);
  --text-primary: hsl(220, 10%, 90%);
  --text-secondary: hsl(220, 10%, 65%);
  --text-muted: hsl(220, 10%, 45%);
  --border: hsl(220, 13%, 20%);
}

/* Tema Alto Contraste (WCAG AAA) */
.high-contrast {
  --text-primary: hsl(0, 0%, 0%);
  --text-secondary: hsl(0, 0%, 15%);
  --bg-primary: hsl(0, 0%, 100%);
  --border: hsl(0, 0%, 0%);
  --primary: hsl(240, 100%, 25%);
}
.dark.high-contrast {
  --text-primary: hsl(0, 0%, 100%);
  --text-secondary: hsl(0, 0%, 85%);
  --bg-primary: hsl(0, 0%, 0%);
  --border: hsl(0, 0%, 100%);
  --primary: hsl(180, 100%, 50%);
}
```

### 2.4 Responsividade e Mobile

IDEIA é primariamente uma ferramenta desktop, mas deve funcionar em tablets e telas menores.

**Breakpoints definidos:**

| Breakpoint | Largura | Dispositivo | Comportamento |
|------------|---------|-------------|---------------|
| `sm` | 640px | Mobile grande | Layout empilhado |
| `md` | 768px | Tablet | Sidebar recolhível |
| `lg` | 1024px | Desktop | Layout completo |
| `xl` | 1280px | Desktop wide | Painéis extras |
| `2xl` | 1536px | Desktop ultra-wide | Grid flexível |

**Estratégia responsive:**
- Monaco Editor tem suporte a touch nativo
- Painéis reorganizáveis (dock layout)
- Minimap e breadcrumbs adaptativos
- Gestos: swipe para navegar entre painéis, pinch para zoom do editor

---

## 3. Acessibilidade (WCAG)

### 3.1 Conformidade Atual vs Necessária

**Estado atual (ai-devkit base):**

| Princípio | Nível atual | Nível alvo (MVP) | Nível alvo (v1.0) |
|-----------|-------------|-------------------|--------------------|
| Perceivable | A parcial | AA | AAA |
| Operable | A parcial | AA | AAA |
| Understandable | A parcial | AA | AAA |
| Robust | Não testado | AA | AAA |

**Requisitos por componente:**

| Componente | WCAG Critério | Nível |
|------------|---------------|-------|
| Editor Monaco | 2.1.1 Keyboard, 2.4.3 Focus Order | AA |
| Chat/Streaming | 2.2.2 Pause/Stop, 4.1.2 Name/Role/Value | AA |
| Diálogos/Modais | 2.4.3 Focus Order, 1.3.2 Meaningful Sequence | AA |
| Notificações | 4.1.3 Status Messages (ARIA live) | AA |
| Data Grid | 1.3.1 Info and Relationships | AA |
| Terminal (xterm) | 2.1.1 Keyboard, 1.4.1 Use of Color | AA |
| Diagramas (ReactFlow) | 1.1.1 Non-text Content | AA |
| Planos/Roadmaps | 1.3.2 Meaningful Sequence | AA |

### 3.2 Perceivable

**Informação e componentes apresentados de forma perceptível aos sentidos.**

**Diretrizes:**
- **1.1.1 Non-text Content:** Todo ícone, gráfico e diagrama deve ter `alt` text ou descrição textual associada
- **1.4.1 Use of Color:** Status de agente não depende apenas de cor (usar ícone + texto + cor)
- **1.4.3 Contrast (Minimum):** Relação de contraste ≥ 4.5:1 (texto normal), ≥ 3:1 (texto grande)
- **1.4.4 Resize text:** Zoom até 200% sem perda de funcionalidade
- **1.4.12 Text Spacing:** Suporte a espaçamento customizado sem quebra

```typescript
// Exemplo: AgentStatus com múltiplos canais de informação
function AgentStatus({ status }: { status: AgentStatus }) {
  const config = {
    thinking: { icon: Brain, label: 'Pensando...', color: 'text-agent-thinking' },
    generating: { icon: Code, label: 'Gerando código...', color: 'text-agent-generating' },
    error: { icon: AlertCircle, label: 'Erro encontrado', color: 'text-agent-error' },
    idle: { icon: Circle, label: 'Aguardando', color: 'text-agent-idle' },
  }[status];

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      <config.icon className={config.color} aria-hidden="true" />
      <span className="sr-only">Agente:</span>
      <span>{config.label}</span>
    </div>
  );
}
```

### 3.3 Operable

**Componentes de interface operáveis por diferentes métodos de entrada.**

**Diretrizes:**
- **2.1.1 Keyboard:** Toda ação disponível via mouse deve ser disponível via teclado
- **2.1.2 No Keyboard Trap:** Foco não pode ficar preso em um componente
- **2.4.3 Focus Order:** Ordem de foco lógica e previsível
- **2.4.7 Focus Visible:** Indicador de foco visível em todos os elementos interativos
- **2.5.1 Pointer Gestures:** Gestos complexos devem ter alternativa com ação simples

**Keyboard Navigation Map:**

```
┌─────────────────────────────────────────────────────────────┐
│  ATALHOS GLOBAIS IDEIA                                       │
├────────────┬──────────────────────────┬─────────────────────┤
│  Atalho    │ Ação                     │ Contexto            │
├────────────┼──────────────────────────┼─────────────────────┤
│  Ctrl+K    │ Comando rápido (palette) │ Global              │
│  Ctrl+Enter│ Enviar mensagem          │ Chat/Insight        │
│  Ctrl+I    │ Iniciar nova ideia       │ Global              │
│  Ctrl+;    │ Foco no chat             │ Global              │
│  Ctrl+.    │ Foco no editor           │ Global              │
│  Ctrl+Shift+A│ Abrir painel agentes   │ Global              │
│  Ctrl+B    │ Toggle sidebar           │ Global              │
│  Ctrl+J    │ Toggle terminal          │ Global              │
│  Esc       │ Fechar modal/cancelar    │ Contextual          │
│  Tab/Shift+Tab│ Navegar focus         │ Global              │
│  Alt+1-9   │ Navegar tabs            │ Painel ativo        │
│  F1        │ Ajuda contextual         │ Global              │
│  Ctrl+Z/Y  │ Undo/Redo               │ Editor              │
│  Ctrl+S    │ Salvar / confirmar       │ Contextual          │
│  Ctrl+`    │ Toggle modo agente       │ Global              │
├────────────┼──────────────────────────┼─────────────────────┤
│  ATALHOS DE AGENTE                                           │
├────────────┼──────────────────────────┼─────────────────────┤
│  Ctrl+Shift+G│ "Gere isso"            │ Seleção no editor   │
│  Ctrl+Shift+R│ "Revise isso"          │ Seleção no editor   │
│  Ctrl+Shift+T│ "Teste isso"           │ Seleção no editor   │
│  Ctrl+Shift+D│ "Debug isso"           │ Seleção no editor   │
└────────────┴──────────────────────────┴─────────────────────┘
```

### 3.4 Understandable

**Informação e operação da interface compreensíveis.**

**Diretrizes:**
- **3.1.1 Language of Page:** `lang="pt-BR"` no documento, com alternância para outros idiomas
- **3.2.1 On Focus:** Mudança de foco não dispara ações automáticas
- **3.2.2 On Input:** Mudança em campo não dispara mudança de contexto sem aviso
- **3.3.1 Error Identification:** Erros descritos claramente em texto
- **3.3.2 Labels or Instructions:** Labels em todos os inputs
- **3.3.3 Error Suggestion:** Sugestões de correção para erros

```typescript
// Exemplo: Error state acessível
function InputField({ label, error, ...props }: InputFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "rounded-md border px-3 py-2 transition-colors",
          error ? "border-error ring-error/20" : "border-border"
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 3.5 Robust

**Conteúdo interpretável por diferentes user agents (browsers, screen readers, assistive tech).**

**Diretrizes:**
- **4.1.1 Parsing:** HTML semântico válido
- **4.1.2 Name, Role, Value:** Todos os componentes customizados expõem nome, papel e valor via ARIA
- **4.1.3 Status Messages:** Mensagens de status usam `role="status"`, `aria-live="polite"` ou `aria-live="assertive"`

**Estrutura ARIA para Chat de Agente:**

```html
<div role="log" aria-label="Conversa com agente IDEIA" aria-live="polite">
  <!-- Mensagens do agente -->
  <article role="article" aria-label="Mensagem do agente">
    <header>
      <span role="img" aria-label="Ícone do agente">🤖</span>
      <span>Assistente IDEIA</span>
      <time datetime="2026-07-18T10:30:00">10:30</time>
    </header>
    <div class="message-content">
      <!-- Conteúdo da mensagem com markdown renderizado -->
    </div>
    <footer>
      <button aria-label="Copiar resposta">Copiar</button>
      <button aria-label="Gostei da resposta">👍</button>
      <button aria-label="Não gostei da resposta">👎</button>
    </footer>
  </article>
</div>

<!-- Indicador de digitação -->
<div role="status" aria-label="Agente está pensando">
  <span class="typing-indicator">
    <span>.</span><span>.</span><span>.</span>
  </span>
  <span class="sr-only">Agente está processando sua solicitação</span>
</div>
```

### 3.6 Ferramentas de Auditoria

| Ferramenta | Propósito | Integração | Frequência |
|------------|-----------|------------|------------|
| axe-core (@axe-core/react) | Auditoria programática em testes | Testes unitários + CI | A cada PR |
| Lighthouse CI | Auditoria completa no build | GitHub Actions | A cada PR |
| WAVE (browser extension) | Auditoria manual visual | Manual (dev/test) | Semanal |
| Accessibility Insights | Testes manuais guiados | Manual (QA) | Por release |
| NVDA / VoiceOver | Testes com screen reader real | Manual (QA) | Por release |
| Pa11y CI | Automação de auditoria aXe | CI/CD pipeline | A cada PR |
| Storybook a11y addon | Auditoria visual de componentes | Desenvolvimento | Contínuo |

**Pipeline de acessibilidade:**

```
Commit → aXe (componentes afetados) → PR → Lighthouse CI + Pa11y → Release → Auditoria completa
                                                   │
                                                   ▼
                                          Gatilho se score < 90
```

### 3.7 Keyboard Navigation e Screen Reader

**Focus Management Estratégico:**

```typescript
// Hook para gerenciamento de foco em modais
function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const previousFocus = document.activeElement as HTMLElement;

    // Foca no primeiro elemento do modal
    const firstFocusable = container.querySelector(focusableSelector) as HTMLElement;
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Fechar modal e restaurar foco
        previousFocus?.focus();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = container.querySelectorAll(focusableSelector);
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus(); // Restaura foco ao sair
    };
  }, [containerRef, isActive]);
}
```

**Screen Reader Announcements:**

```typescript
// Sistema de anúncios para leitores de tela
function useAnnouncer() {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((text: string, importance: 'polite' | 'assertive' = 'polite') => {
    setMessage(text);
    setPriority(importance);
    // Reset para permitir repetição
    setTimeout(() => setMessage(''), 100);
  }, []);

  return {
    announce,
    announcerElement: (
      <div
        role="status"
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    ),
  };
}

// Uso:
// announce("Código gerado com sucesso — 3 arquivos criados")
// announce("Erro ao conectar com o servidor", "assertive")
```

---

## 4. Métricas de UX

### 4.1 NPS (Net Promoter Score)

**Meta IDEIA: 75+** (considerado "World Class" no benchmark de software)

**Metodologia:**
- Pesquisa enviada após 7 dias de uso
- Pergunta: *"Em uma escala de 0 a 10, o quanto você recomendaria a IDEIA para um amigo ou colega?"*
- Segmentação: Promotores (9-10), Neutros (7-8), Detratores (0-6)
- NPS = % Promotores - % Detratores

**NPS por momento da jornada (pesquisa contextual):**

| Momento | Trigger | Meta | Benchmark |
|---------|---------|------|-----------|
| Primeiro insight | Após 1º uso | 60 | N/A |
| Após 1º deploy | 24h após 1ª entrega | 70 | Cursor: 45 |
| Uso regular | 30 dias | 75 | Copilot: 50 |
| Power user | 90 dias | 80 | Devin: 35 |

**Estratégia para NPS alto:**
- Onboarding progressivo (não dump de features)
- Time-to-value < 5 minutos
- Feedback loop rápido (ouvidoria ativa)
- Surpresa e deleite (micro-animações, conquistas)

### 4.2 Time-to-First-Task (TTFT)

**Meta IDEIA: < 2 minutos**

**Definição:** Tempo entre o primeiro acesso do usuário e a conclusão bem-sucedida da primeira tarefa significativa (ex: gerar um "Hello World" funcional).

**Pipeline de otimização:**

```
Fase                    | Tempo atual (estimado) | Meta IDEIA
------------------------|------------------------|------------
Download/Instalação     | 30-60s                | < 15s (via web)
Abertura e login        | 5-10s                 | < 3s
Onboarding              | 60-120s               | < 20s
Primeiro comando        | 10-30s                | < 5s
Geração do código       | 30-60s                | < 30s
Execução e verificação  | 30-60s                | < 20s
Feedback de sucesso     | 5-10s                 | < 2s
─────────────────────────────────────────────────────
TOTAL                   | 2.7-5.8 min           | < 1.5 min
```

### 4.3 Task Success Rate (TSR)

**Meta IDEIA: > 95%**

**Medição:** Proporção de tarefas que o usuário completa com sucesso, sem assistência externa.

**Tarefas medidas:**

| Tarefa | Complexidade | Meta TSR | Atual (benchmark) |
|--------|-------------|----------|--------------------|
| "Criar uma API REST" | Baixa | 98% | 92% (Cusor) |
| "Adicionar autenticação" | Média | 95% | 85% (Copilot) |
| "Refatorar para Clean Arch" | Alta | 90% | 70% (Devin) |
| "Debug de memory leak" | Alta | 85% | 60% (manual) |
| "Deploy em produção" | Média | 95% | 80% (generic) |

### 4.4 System Usability Scale (SUS)

**Meta IDEIA: > 80** (Classificação A / "Excellent")

**Perguntas SUS (traduzidas e adaptadas para IDEIA):**

1. Eu usaria a IDEIA com frequência
2. Achei a IDEIA desnecessariamente complexa (invertida)
3. Achei a IDEIA fácil de usar
4. Precisaria de suporte técnico para usar a IDEIA (invertida)
5. As funções da IDEIA estão bem integradas
6. Há muita inconsistência na IDEIA (invertida)
7. A maioria das pessoas aprenderia a usar a IDEIA rapidamente
8. Achei a IDEIA muito complicada de usar (invertida)
9. Senti-me confiante usando a IDEIA
10. Precisaria aprender muitas coisas antes de usar a IDEIA (invertida)

### 4.5 Customer Effort Score (CES)

**Meta IDEIA: < 2** (escala 1-5, onde 1 é "esforço mínimo")

**Momentos de medição CES:**

| Interação | Pergunta | Meta |
|-----------|----------|------|
| Expressar uma ideia | "Qual foi o esforço para descrever sua ideia?" | < 2.0 |
| Revisar código gerado | "Qual foi o esforço para revisar o código?" | < 2.5 |
| Corrigir um erro | "Qual foi o esforço para corrigir o erro?" | < 1.5 |
| Fazer deploy | "Qual foi o esforço para publicar?" | < 1.5 |
| Customizar comportamento | "Qual foi o esforço para ajustar a IDEIA?" | < 2.5 |

### 4.6 Painel de Métricas

```typescript
// Dashboard de Métricas de UX — Backend agrega, frontend exibe
interface UXMetricsDashboard {
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly';

  nps: {
    score: number;
    promoters: number;
    detractors: number;
    responses: number;
    trend: 'up' | 'down' | 'stable';
  };

  ttft: {
    average: number; // segundos
    p50: number;
    p95: number;
    p99: number;
    sampleSize: number;
  };

  tsr: {
    overall: number;
    byTaskType: Record<TaskType, number>;
    byComplexity: Record<Complexity, number>;
  };

  sus: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    responses: number;
  };

  ces: {
    overall: number;
    byInteraction: Record<InteractionPoint, number>;
  };

  funnel: {
    insight: number;     // usuários que chegam ao momento 1
    clarity: number;     // que progridem ao momento 2
    plan: number;        // que progridem ao momento 3
    implement: number;   // que progridem ao momento 4
    validate: number;    // que progridem ao momento 5
    deliver: number;     // que progridem ao momento 6
    learn: number;       // que entram no ciclo de aprendizado
  };
}
```

---

## 5. Design System Técnico

### 5.1 Design Tokens

```typescript
// tokens/spacing.ts
export const spacing = {
  // Layout
  sidebar: '280px',
  sidebarCollapsed: '56px',
  minContent: '480px',
  maxContent: '1440px',
  // Panel
  panelHeader: '48px',
  panelFooter: '40px',
  // Components
  inputHeight: '36px',
  buttonHeight: '36px',
  iconSize: '20px',
} as const;

// tokens/typography.ts
export const typography = {
  heading: {
    h1: { size: '2rem', weight: 700, lineHeight: 1.2 },
    h2: { size: '1.5rem', weight: 600, lineHeight: 1.3 },
    h3: { size: '1.25rem', weight: 600, lineHeight: 1.4 },
    h4: { size: '1rem', weight: 600, lineHeight: 1.4 },
  },
  body: {
    base: { size: '0.875rem', weight: 400, lineHeight: 1.5 },
    small: { size: '0.75rem', weight: 400, lineHeight: 1.5 },
    code: { size: '0.8125rem', weight: 400, lineHeight: 1.6 },
  },
} as const;

// tokens/elevation.ts
export const elevation = {
  flat: 'none',
  raised: '0 1px 3px rgba(0,0,0,0.08)',
  overlay: '0 4px 12px rgba(0,0,0,0.12)',
  modal: '0 8px 32px rgba(0,0,0,0.16)',
  tooltip: '0 2px 8px rgba(0,0,0,0.2)',
} as const;
```

### 5.2 Componentes Base

**Catálogo de componentes shadcn/ui + extensões:**

| Componente | Base | Customizações IDEIA | Status |
|------------|------|---------------------|--------|
| Button | shadcn/ui | Variantes: agent, streaming, cancel | ✅ |
| Input | shadcn/ui | Multi-line inteligente (InsightInput) | ✅ |
| Dialog | shadcn/ui | Wizard multi-etapa, AgentDialog | ✅ |
| DropdownMenu | shadcn/ui | Command palette integrado | ✅ |
| Tabs | shadcn/ui | Painéis dock, tab dragging | ✅ |
| Card | shadcn/ui | AgentCard, PlanCard, ResultCard | ✅ |
| Toast | sonner | Streaming progress, action callbacks | ✅ |
| Sheet | shadcn/ui | Sidebar configurações, agent panel | ✅ |
| Tooltip | shadcn/ui | Rich tooltip (content, actions) | 🔧 |
| Command | cmdk | Global command palette, agent commands | 🔧 |
| DataTable | TanStack Table | Virtual scrolling, inline edit | ❌ |
| Monaco Editor | @monaco-editor/react | Multi-cursor, AI inline suggestions | ✅ |
| Chat | Custom | Streaming markdown, code blocks | 🔧 |
| Terminal | xterm | Multi-session, resize | 🔧 |
| Diagram | ReactFlow | Architecture viz, interactive | ❌ |
| PlanTimeline | Custom | Roadmap visual, fase navigation | ❌ |

### 5.3 Micro-interações e Animações

**Princípios de Animação IDEIA:**
1. **Rápidas e funcionais** — duração 150-400ms, sem atrasar o usuário
2. **Contextuais** — indicam estado, transição ou feedback
3. **Suaves** — easing natural (cubic-bezier), sem efeitos chamativos
4. **Reduzidas** — respeitar `prefers-reduced-motion`

```typescript
// Sistema de animação
export const animations = {
  // Entrada/Saída
  fadeIn: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1, transition: { duration: 200 } },
    exit: { opacity: 0, transition: { duration: 150 } },
  },
  slideInRight: {
    enter: { x: 20, opacity: 0 },
    enterActive: { x: 0, opacity: 1, transition: { duration: 250, ease: [0.16, 1, 0.3, 1] } },
  },
  scaleIn: {
    enter: { scale: 0.95, opacity: 0 },
    enterActive: { scale: 1, opacity: 1, transition: { duration: 200 } },
  },

  // Estados
  pulseAgent: {
    animate: { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] },
    transition: { duration: 2000, repeat: Infinity },
  },
  shimmer: {
    // Para skeletons
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
    animate: { x: ['-100%', '100%'] },
    transition: { duration: 1.5, repeat: Infinity },
  },
  typingDot: {
    animate: { y: [0, -4, 0] },
    transition: { duration: 0.6, repeat: Infinity, staggerChildren: 0.15 },
  },
};

// Hook para animações responsivas
function useAnimation() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return {
    enabled: !prefersReducedMotion,
    getTransition: (normal: Transition, reduced?: Transition) =>
      prefersReducedMotion ? (reduced ?? { duration: 0 }) : normal,
  };
}
```

**Micro-interações específicas:**

```
Componente                | Animação                    | Gatilho
--------------------------|-----------------------------|-------------------
AgentStatus dot           | Pulse suave                 | Agente pensando
Code generation           | Stream progress bar         | Gerando linha a linha
Insight submit            | Card expande com fade       | Ideia processada
Error toast               | Slide-in + shake leve       | Erro detectado
File creation             | File icon aparece com scale | Arquivo criado
Plan navigation           | Slide horizontal            | Mudança de fase
Deploy success            | Confetti sutil              | Deploy concluído
Dark mode toggle          | Transição suave de cores    | Toggle ativado
```

### 5.4 Loading, Skeleton e Progress

**Estados de loading por componente:**

```typescript
// Componente de Skeleton
function Skeleton({ variant = 'text', width, height }: SkeletonProps) {
  const baseClasses = 'relative overflow-hidden rounded bg-muted';
  const shimmerClasses = 'absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent';

  const variants = {
    text: { className: 'h-4 w-full', count: 3 },
    avatar: { className: 'h-10 w-10 rounded-full' },
    card: { className: 'h-32 w-full rounded-lg' },
    code: { className: 'h-4 w-full font-mono', count: 8 },
    image: { className: 'h-48 w-full rounded-lg' },
    button: { className: 'h-9 w-24 rounded-md' },
  };

  const config = variants[variant];
  const items = config.count ?? 1;

  return (
    <div role="status" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(baseClasses, config.className)}
          style={{ width, height, animationDelay: `${i * 100}ms` }}
        >
          <div className={cn(shimmerClasses, 'animate-shimmer')} />
        </div>
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

// Progress Indicator para geração de código
function GenerationProgress({ phase, progress }: {
  phase: 'analyzing' | 'planning' | 'writing' | 'testing';
  progress: number; // 0-1
}) {
  const phases = [
    { key: 'analyzing', label: 'Analisando requisitos', icon: Search },
    { key: 'planning', label: 'Planejando implementação', icon: FileText },
    { key: 'writing', label: 'Escrevendo código', icon: Code },
    { key: 'testing', label: 'Validando resultados', icon: CheckCircle2 },
  ];

  const currentIndex = phases.findIndex(p => p.key === phase);

  return (
    <div role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
      {phases.map((p, i) => (
        <div key={p.key} className={cn(
          'flex items-center gap-2',
          i < currentIndex && 'text-success',
          i === currentIndex && 'text-primary',
          i > currentIndex && 'text-muted'
        )}>
          <p.icon className="h-4 w-4" />
          <span>{p.label}</span>
          {i === currentIndex && <span className="text-xs">{Math.round(progress * 100)}%</span>}
        </div>
      ))}
    </div>
  );
}
```

### 5.5 Error States e Recovery

**Padrão de tratamento de erros:**

```typescript
// Hierarquia de estados de erro
type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorState {
  severity: ErrorSeverity;
  title: string;
  message: string;
  code?: string;
  action?: {
    label: string;
    handler: () => void | Promise<void>;
  };
  recoverable: boolean;
  autoRetry?: boolean;
  retryDelay?: number; // ms
}

// Componente de Error Boundary com recovery
class AgentErrorBoundary extends React.Component<
  { children: React.ReactNode; onRecovery?: () => void },
  { error: ErrorState | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error): { error: ErrorState } {
    return {
      error: {
        severity: 'error',
        title: 'Erro no Agente',
        message: error.message,
        recoverable: true,
        action: {
          label: 'Tentar novamente',
          handler: () => window.location.reload(),
        },
      },
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex flex-col items-center gap-4 p-8">
          <AlertTriangle className="h-12 w-12 text-warning" />
          <h2 className="text-lg font-semibold">{this.state.error.title}</h2>
          <p className="text-sm text-muted">{this.state.error.message}</p>
          {this.state.error.action && (
            <Button onClick={this.state.error.action.handler}>
              {this.state.error.action.label}
            </Button>
          )}
          {this.state.error.severity === 'critical' && (
            <p className="text-xs text-muted">
              Se o problema persistir, contate o suporte: support@ideia.dev
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Recovery flows específicos
const recoveryFlows: Record<string, RecoveryFlow> = {
  'AGENT_TIMEOUT': {
    message: 'O agente demorou muito para responder',
    actions: [
      { label: 'Tentar novamente', type: 'retry' },
      { label: 'Simplificar solicitação', type: 'suggest' },
      { label: 'Contatar suporte', type: 'support' },
    ],
    autoRetry: true,
    retryDelay: 2000,
  },
  'CODE_COMPILATION_ERROR': {
    message: 'O código gerado tem erros de compilação',
    actions: [
      { label: 'Corrigir automaticamente', type: 'fix' },
      { label: 'Mostrar erros', type: 'show' },
      { label: 'Regenerar', type: 'regenerate' },
    ],
  },
  'DEPLOY_FAILURE': {
    message: 'O deploy falhou na etapa de build',
    actions: [
      { label: 'Ver logs', type: 'logs' },
      { label: 'Tentar novamente', type: 'retry' },
      { label: 'Rollback', type: 'rollback' },
    ],
    severity: 'critical',
  },
};
```

---

## 6. Acessibilidade para Agentes AI

### 6.1 Clareza de Intenção

Agentes AI da IDEIA devem comunicar sua intenção de forma clara e inequívoca.

**Princípios:**

1. **Saiba o que o agente está fazendo** — estado visível sempre
2. **Saiba por que o agente está fazendo** — razão explícita
3. **Saiba o que o agente fará a seguir** — expectativa do próximo passo
4. **Saiba como desfazer** — ação de rollback disponível

```typescript
// Estrutura de mensagem do agente com intenção explícita
interface AgentMessage {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  intent: {
    type: 'analyzing' | 'planning' | 'generating' | 'modifying' | 'testing' | 'deploying' | 'explaining';
    description: string; // "Analisando a estrutura do projeto existente..."
    confidence: number;  // 0-1, quão certo o agente está
    estimatedDuration?: string; // "~30 segundos"
  };
  content: string; // Markdown renderizável
  actions: AgentAction[];
  status: 'streaming' | 'complete' | 'error' | 'awaiting_input';
  canUndo: boolean;
}
```

### 6.2 Transparência de Autonomia

**Níveis de autonomia do agente e como sinalizá-los:**

| Nível | Nome | Descrição | Indicador Visual | Ações Permitidas |
|-------|------|-----------|------------------|------------------|
| 🔵 N1 | Supervisionado | Agente sugere, usuário aprova | Blue dot + "Sugerindo..." | Approve/Reject/Edit |
| 🟢 N2 | Assistido | Agente executa com supervisão | Green dot + "Executando..." | Pause/Redirect/Stop |
| 🟡 N3 | Semi-autônomo | Agente executa e reporta | Yellow dot + "Trabalhando..." | Monitor/Cancel |
| 🔴 N4 | Autônomo (limitar) | Agente executa decisões pré-aprovadas | Red dot + "Autônomo" | Emergency stop |

```typescript
function AgentAutonomyBadge({ level }: { level: AutonomyLevel }) {
  const config = {
    supervised: {
      icon: Eye,
      label: 'Supervisionado',
      className: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
      description: 'Aguardando sua aprovação',
    },
    assisted: {
      icon: HelpingHand,
      label: 'Assistido',
      className: 'text-green-500 bg-green-50 dark:bg-green-950',
      description: 'Executando com sua supervisão',
    },
    semiautonomous: {
      icon: Zap,
      label: 'Semi-autônomo',
      className: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950',
      description: 'Trabalhando de forma independente',
    },
    autonomous: {
      icon: Shield,
      label: 'Autônomo',
      className: 'text-red-500 bg-red-50 dark:bg-red-950',
      description: 'Modo totalmente autônomo ativo',
    },
  }[level];

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.className)}
      role="status"
      aria-label={`Agente em modo ${config.label}`}
    >
      <config.icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{config.label}</span>
      <span className="sr-only">{config.description}</span>
    </div>
  );
}
```

### 6.3 Feedback Não-verbal

**Sistema de notificações e status para comunicação agente-usuário:**

```typescript
// Tipos de notificação não-verbal
type NotificationType =
  | 'agent_thinking'    // Bolha pulsando, agente processando
  | 'agent_done'        // Check sutil, tarefa concluída
  | 'agent_error'       // Ícone de alerta, algo deu errado
  | 'agent_awaiting'    // Pontinhos, aguardando input
  | 'code_generated'    // Animação de código fluindo
  | 'file_created'      │ Arquivo aparece na tree
  | 'test_passed'       // Check verde animado
  | 'test_failed'       // X vermelho com contagem
  | 'deploy_progress'   // Barra de progresso contínua
  | 'deploy_success'    // Confete/meteoro sutil
  | 'deploy_failed'     // Toast negativo com ação
  | 'suggestion'        // Bulb piscando, tem sugestão
  | 'warning'           // Warning amarelo não-bloqueante
  ;

// Configuração de feedback visual
const notificationConfig: Record<NotificationType, {
  icon: LucideIcon;
  duration: number;     // ms (0 = persistente)
  sound?: string;       // arquivo de som opcional
  ariaLive: 'polite' | 'assertive';
  animation: string;    // classe de animação
}> = {
  agent_thinking: {
    icon: Brain,
    duration: 0, // até mudar de estado
    ariaLive: 'polite',
    animation: 'pulse-subtle',
  },
  agent_done: {
    icon: CheckCircle2,
    duration: 3000,
    sound: 'chime-done',
    ariaLive: 'polite',
    animation: 'scale-in',
  },
  // ... demais configurações
};
```

**Toast com ações:**

```tsx
function AgentNotification({ type, message, actions }: AgentNotificationProps) {
  const config = notificationConfig[type];
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (config.ariaLive === 'assertive') {
      announce(message, 'assertive');
    }
  }, [message]);

  return (
    <div
      role="status"
      aria-live={config.ariaLive}
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg',
        config.animation
      )}
    >
      <config.icon className="h-5 w-5 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        {actions && (
          <div className="mt-2 flex gap-2">
            {actions.map(action => (
              <Button key={action.label} variant="outline" size="sm" onClick={action.handler}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 6.4 Padrões de Comunicação

**Template de mensagem do agente:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 Assistente IDEIA  [Supervisionado]  [● Processando...]      │
│                                                                   │
│  📋 **Intenção:** Gerar schema do banco de dados                 │
│  📊 **Confiança:** 92%                                           │
│  ⏱️ **Estimativa:** ~15 segundos                                 │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Vou criar a estrutura inicial do banco baseada nos requisitos:  │
│                                                                   │
│  ```sql                                                            │
│  CREATE TABLE users (                                             │
│    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                 │
│    email VARCHAR(255) UNIQUE NOT NULL,                            │
│    created_at TIMESTAMPTZ DEFAULT NOW()                           │
│  );                                                               │
│  ```                                                              │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  ✅ Ações disponíveis:                                            │
│  [✓ Aprovar]  [✗ Rejeitar]  [✏️ Sugerir alteração]  [💬 Perguntar] │
└─────────────────────────────────────────────────────────────────┘
```

**Boas práticas de comunicação do agente:**

1. **Sempre iniciar com intenção** — não comece a gerar código sem avisar
2. **Usar linguagem clara** — evite jargão desnecessário, explique termos técnicos
3. **Oferecer alternativas** — quando relevante, apresente 2-3 opções
4. **Pedir confirmação** — em ações destrutivas, sempre peça confirmação
5. **Mostrar progresso** — tasks longas devem ter indicador de progresso
6. **Permitir interrupção** — usuário pode interromper e redirecionar a qualquer momento
7. **Fornecer contexto** — ao mostrar código, explique por que aquela abordagem
8. **Ser honesto sobre limites** — se não sabe, diga "não sei" em vez de inventar

---

## 7. Benchmarking

### 7.1 Cursor

**Pontos fortes:**
- Integração profunda com VS Code (extensões, settings, keybindings)
- Compreensão de contexto excepcional (todo o código-base)
- Comandos inline (`Cmd+K`, `Cmd+L`) muito naturais
- Multi-edit com preview de diff excelente
- Performance de sugestão: ~500ms

**Pontos fracos:**
- Uso intensivo de créditos (custo alto para equipes)
- Chat lateral ainda limitado para tarefas multi-arquivo
- Sem colaboração em tempo real
- Sem deploy integrado

**Oportunidade IDEIA:** Cursor é excelente no micro (edição), mas fraco no macro (planejamento, entrega).

### 7.2 Windsurf (Codeium)

**Pontos fortes:**
- Gratuito para uso pessoal (bom onboarding)
- Auto-complete rápido (modelo próprio)
- Multi-language suportado
- Cascade agent (fluxo multi-etapa)

**Pontos fracos:**
- Qualidade de código inferior ao Cursor
- Agente Cascade ainda com baixa confiabilidade
- Sem debug integrado
- Ecossistema limitado

**Oportunidade IDEIA:** Windsurf democratiza AI coding. IDEIA precisa ir além: da ideia ao deploy.

### 7.3 GitHub Copilot

**Pontos fortes:**
- Integração nativa com GitHub (PRs, issues, Actions)
- Modelo treinado em código público (bom para boilerplate)
- Chat no IDE (VS Code, JetBrains)
- Copilot Workspace (planejamento multi-arquivo)

**Pontos fracos:**
- Apenas sugestão de código (não faz o sistema completo)
- Sem visão de arquitetura
- Workspace ainda experimental
- Dependência total do ecossistema GitHub

**Oportunidade IDEIA:** Copilot é ótimo assistente, não um construtor. IDEIA é construtor.

### 7.4 Devin (Cognition)

**Pontos fortes:**
- Primeiro "AI software engineer" do mercado
- Autonomia: terminal, editor, browser
- Relatórios de progresso detalhados
- Suporte a debugging autônomo

**Pontos fracos:**
- Custo extremamente alto ($500/mês)
- Latência alta (tarefas levam minutos)
- Sem colaboração real-time com humanos
- Interface web apenas (não IDE)
- Qualidade inconsistente entre tarefas

**Oportunidade IDEIA:** Devin provou que agentes autônomos são viáveis. IDEIA precisa ser mais rápido, mais barato e mais colaborativo.

### 7.5 Matriz Comparativa

| Dimensão | Cursor | Windsurf | Copilot | Devin | IDEIA (meta) |
|----------|--------|----------|---------|-------|-------------|
| **Preço/mês** | $20 | $15 (gratuito limitado) | $10 | $500 | $0+ (open freemium) |
| **Auto-complete** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Chat contextual** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Multi-arquivo** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Debug** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Deploy** | ❌ | ❌ | ❌ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Colaboração** | ❌ | ❌ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **Arquitetura** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Autonomia** | ⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Latência** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **NX (cross-project)** | ❌ | ❌ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |

### 7.6 Oportunidades de Diferenciação

A partir do benchmark, identificamos **6 diferenciais competitivos** para IDEIA:

| # | Diferencial | Descrição | Impacto |
|---|-------------|-----------|---------|
| D1 | **Ideia → Deploy** | Jornada completa, não apenas edição de código | 🏆 Alto |
| D2 | **Colaboração real-time** | Humanos + agentes no mesmo workspace | 🏆 Alto |
| D3 | **Custo acessível** | Modelo freemium com opção open-source | 💰 Médio |
| D4 | **Transparência total** | Agentes explicam intenção, confiança, ações | 🔒 Alto |
| D5 | **Aprendizado cross-projeto** | IDEIA aprende com cada projeto e melhora | 🧠 Alto |
| D6 | **Multi-shell (Web + Desktop + Cloud)** | Acesso de qualquer lugar | 🌐 Médio |

**Estratégia de posicionamento:**

```
                     ALTA AUTONOMIA
                         │
                         │ Devin
                         │
           Cursor ───────┼────── Copilot
                         │
                         │ Windsurf
                         │
                   BAIXA AUTONOMIA

         FERRAMENTA              PLATAFORMA
         (edição)         │      (fim-a-fim)
                          │
                     IDEIA ────►
                          │
```

**IDEIA se posiciona como:**
- **Única plataforma** que cobre da ideação ao deploy
- **Única com colaboração real-time** humano + agente multi-nível
- **Única com aprendizado cross-projeto** (o sistema melhora com uso)
- **Primeira acessível** — modelo freemium com núcleo open-source

---

## Referências

1. Nielsen Norman Group. "The 7 Moments of UX." 2023.
2. WCAG 2.2 Recommendation. W3C. 2023.
3. Brooke, J. "SUS: A Retrospective." 2013.
4. Sauro, J. "Quantifying the User Experience." 2016.
5. Cursor.sh — Documentação e benchmarking interno.
6. Codeium Windsurf — Análise competitiva.
7. Cognition Devin — Análise de produto.
8. shadcn/ui — Documentação oficial.
9. Radix UI — Primitives de acessibilidade.
10. IDEIA Master Document — Visão de produto.

---

> **Próximos passos:** Implementar painel de métricas de UX no backend (SQLite+FTS5), configurar axe-core nos testes unitários, criar Storybook com a11y addon, e definir roadmap de componentes prioritários.
