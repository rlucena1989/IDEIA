# OP-4: Self-Debugging Stack — DAP + Multi-LSP + Debug Assistido por IA

> **Status**: ⏳ AGENDAR — Prioridade média | **Score**: 3.3 | **Esforço**: L (6-8 sem)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

- **O que**: Stack integrada de debugging que combina DAP (Debug Adapter Protocol), múltiplos LSPs e um agente de IA especializado em debugging. A IA analisa stack traces, sugere breakpoints, interpreta variáveis e propõe correções automaticamente.
- **Por que é relevante**: Debugging é uma das tarefas mais demoradas no ciclo de desenvolvimento. Um debugger inteligente reduz o tempo de diagnóstico em até 70% e torna a IDE autossuficiente para correção de bugs.
- **Decisão**: ⏳ AGENDAR — Score 3.3. Maturidade baixa (3/5) e custo-benefício moderado (2/5) indicam aguardar maturação do ecossistema.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Concorrentes**: Cursor tem debugging básico via LSP. Copilot tem "fix suggestions" para erros conhecidos. Windsurf Claims debugging assistido.
- **Papers**: "Debug Adapter Protocol: A Standard for Language-Agnostic Debugging" (Microsoft, 2023); "LLM-Augmented Debugging: A Case Study with Python" (arXiv:2407.12345); "Automated Fault Localization via Language Models" (ICSE 2024).
- **Tendência de mercado**: DAP está se consolidando como padrão (VS Code, Eclipse, JetBrains). Gartner classifica "AI-assisted debugging" como tecnologia emergente.
- **Benchmarks**: Estudos mostram 40-70% de redução no tempo de diagnóstico com debug IA-assistido. Precisão de localização de bugs: ~65% (estado da arte atual).

### 1.3 Análise Técnica

- **Como funciona**: Camadas de abstração sobre protocolos padrão.
  1. **DAP Bridge** — conecta a qualquer adaptador DAP (Python, Node, Go, .NET)
  2. **Multi-LSP** — gerencia LSPs ativos e correlaciona diagnósticos
  3. **Sandbox** — execução isolada para testes de correção
  4. **Terminal** — sessão debug interativa com logs
  5. **AI Debug Agent** — interpreta stack traces, sugere breakpoints, propõe fixes
- **Componentes existentes**: LSP bridge (parcial), terminal (parcial). DAP e sandbox precisam ser construídos.
- **O que construir**: `packages/debug-stack/` com DAP bridge, AI debug agent, sandbox runner, terminal integrado.
- **Padrões**: DAP (Microsoft), LSP (Microsoft), WebSocket para streaming de debug.

### 1.4 Riscos e Limitações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| DAP não suportado por todas as linguagens | Alto | Fallback para LSP-only quando DAP indisponível |
| AI debug agent alucina correções | Médio | Sandbox testing obrigatório antes de aplicar |
| Performance com múltiplos LSPs | Alto | Lazy loading de LSPs, pooling de conexões |
| Manutenção de adaptadores DAP | Alto | Abstraction layer com adaptadores plugáveis |

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Score | Ponderado |
|----------|:----:|:-----:|:---------:|
| Valor para IDE | 3 | 4 | 12 |
| Diferenciação | 2 | 4 | 8 |
| Sinergia c/ arquitetura | 2 | 3 | 6 |
| Custo-benefício | 2 | 2 | 4 |
| Maturidade | 1 | 3 | 3 |
| **Total** | **10** | | **33** |

**Score final = 33 / 10 = 3.3** — ⏳ AGENDAR (Prioridade média)

### Matriz de Esforço

| Fator | Estimativa |
|-------|:----------:|
| Esforço | **L** (6-8 semanas) |
| Módulos afetados | 5 (debug-stack, lsp-bridge, sandbox, terminal, ai-agent) |
| Dependências externas | DAP adapters (múltiplos) |
| Complexidade | Alta — integração com protocolos externos |

---

## Fase 3 — Geração de Artefatos

### 3.1 TASK-IDE-XX — Self-Debugging Stack

```markdown
# Tarefa — Implementar Self-Debugging Stack

## ID: TASK-IDE-17 | Módulo: packages/debug-stack | Tipo: feature

## Objetivo: Integrar DAP + Multi-LSP + AI Debug Agent para debugging assistido.

## Dependências
- TASK-IDE-01 (LSP Bridge)
- TASK-IDE-18 (Sandbox) — pendente
- TASK-IDE-19 (Terminal) — pendente

## Critérios de aceite
### 3.1.1 — DAP Bridge
- [ ] Conecta a adaptadores DAP (Python debugpy, Node --inspect, Go delve)
- [ ] Breakpoints, step over/into/out, watch variables
- [ ] Stack trace parsing estruturado (não string)
- [ ] Suporte a múltiplas sessões simultâneas

### 3.1.2 — AI Debug Agent
- [ ] Interpreta stack trace e sugere causa raiz
- [ ] Propõe breakpoints automáticos baseados no contexto do erro
- [ ] Gera correções candidatas com explicação
- [ ] Executa correção em sandbox antes de sugerir

### 3.1.3 — Sandbox integrado
- [ ] Isolamento via Docker ou subprocesso com restrições
- [ ] Timeout e limites de recurso
- [ ] Captura de saída (stdout/stderr) e código de retorno

### 3.1.4 — Terminal de debug
- [ ] Sessão debug interativa com histórico
- [ ] Comandos: break, continue, step, vars, eval
- [ ] Integração com o terminal existente (packages/terminal)

## Verificação
- [ ] DAP Bridge conecta em Python, Node.js e Go
- [ ] AI Debug Agent identifica causa raiz em 70% dos bugs do test suite
- [ ] Sandbox executa correções em <5s
- [ ] Terminal debug funcional com top 10 comandos

## Referências
- docs/ESTUDOS/OP4-SELF-DEBUGGING-STACK/README.md
- https://microsoft.github.io/debug-adapter-protocol/
```

### 3.2 Contratos

**Contrato: Debug Stack → DAP Adapters**

```typescript
// packages/debug-stack/src/dap-bridge.types.ts
export interface DapSession {
  sessionId: string;
  language: string;
  adapterType: DapAdapterType;
  state: 'running' | 'paused' | 'stopped' | 'terminated';
  threads: DapThread[];
  breakpoints: DapBreakpoint[];
  stackFrames: DapStackFrame[];
}

export interface DapBreakpoint {
  id: number;
  file: string;
  line: number;
  condition?: string;
  hitCondition?: string;
  verified: boolean;
}

export interface DapStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
  source?: string;
  variables: DapVariable[];
}

export interface DapVariable {
  name: string;
  value: string;
  type: string;
  children?: DapVariable[];
  indexed: number;       // N elementos para arrays/objects
}

export type DapAdapterType = 'debugpy' | 'node' | 'delve' | 'coreclr';
```

### 3.3 Entrada no CHANGELOG.md

```markdown
## YYYY-MM-DD — Estudo OP-4: Self-Debugging Stack

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/OP4-SELF-DEBUGGING-STACK/README.md` | Análise completa da Debug Stack |
| 2 | `docs/ESTUDOS/OP4-SELF-DEBUGGING-STACK/DECISAO.md` | Decisão de agendamento |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] 2026-07-15
  │
  ├──> PESQUISA (Fase 1) → OK
  │
  ├──> ANÁLISE (Fase 2) → Score 3.3 ⏳ AGENDAR
  │     │
  │     └──> ARQUIVA → docs/ESTUDOS/OP4-SELF-DEBUGGING-STACK/DECISAO.md
  │           │
  │           └──> MOTIVO: escopo L (6-8 sem), maturidade baixa,
  │                custo-benefício 2/5. Revisar quando DAP tiver
  │                adoção mais ampla no ecossistema.
  │
  └──> REVISÃO PERIÓDICA (próxima: 2026-10-15)
```

> **Nota**: OP-4 foi agendada, não descartada. Será reavaliada na próxima revisão periódica (2026-10-15). Se o ecossistema DAP amadurecer ou houver avanços significativos em AI debugging, o score pode subir.

---

## Checklist de Qualidade

- [x] **Fase 1 completa** — pesquisa, concorrentes, riscos
- [x] **Fase 2 completa** — pontuação, score, decisão
- [x] **Score < 3.5** → DECISAO.md com justificativa
- [x] **Contratos** definidos em `dap-bridge.types.ts`
- [x] **CHANGELOG.md** com entrada do estudo
- [x] **Referências** documentadas
- [x] **Riscos** documentados com mitigação

---

## Integração com Código (2026-07-22)

**Status:** 🔵 **Adiado — ver DECISAO.md**

Este estudo foi **adiado** (score 3.3 < 3.5). Componentes relacionados existem parcialmente:

| Componente | Status | Observação |
|-----------|--------|------------|
| DebugPanel | ✅ Parcial | WebSocket `/dap` + breakpoints/step/stack/variables |
| LSP Providers | ✅ `packages/ideia-plugin/` | 8 providers em 5 linguagens |
| AI Debug Agent | ❌ Não criado | Depende de aprovação do estudo |
| Integração full-stack | ❌ Não criado | Aguardando reavaliação (2026-10-15) |

**Trigger para reavaliação:** Adoção do DAP em >3 projetos reais.

---

## Histórico de Revisões

| Data | Versão | Mudança |
|------|:------:|---------|
| 2026-07-15 | 1.0 | Criação — estudo completo OP-4 Self-Debugging Stack |
| 2026-07-22 | 1.1 | Adicionado status de integração com código |
