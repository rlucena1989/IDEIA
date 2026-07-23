# Documento Mestre Consolidado — IDEIA: Análise, Otimizações e Plano de Execução

> **Data:** 2026-07-18
> **Base:** 9 estudos totalizando ~150KB de análise
> **Propósito:** Único documento que consolida TODAS as descobertas, gaps, mitigações e ações otimizadas em ordem de execução.
> **Estado:** Análise completa — pronta para execução.

---

## 1. Síntese dos 9 Estudos

| # | Estudo | Descoberta Principal | Ação Resultante |
|---|--------|---------------------|-----------------|
| 1 | **Estratégia Geral** | 3 frontends, 3 backends, fragmentação | Unificar em 1 backend (CLI ide :3001) |
| 2 | **Gap Mockup vs web-ui** | 14 ações faltando, 3 painéis não existem | Copiar mockup → React → Theia widgets |
| 3 | **Reuso Theia** | 20+ serviços Theia catalogados | Usar Theia nativo, não reimplementar |
| 4 | **Código Real** | ~1.250 linhas de implementação | Código pronto para copiar |
| 5 | **Viabilidade 95%→100%** | Mockup replicável EXATAMENTE | Sem barreiras técnicas |
| 6 | **Title Bar 100%** | `CustomTitleWidget` existe | Title bar idêntica |
| 7 | **Theia AI 18 pacotes** | 18 `@theia/ai-*` no npm | 859 linhas manuais elimináveis |
| 8 | **Integração Tripla** | 18 contratos, 15 MCP Tools, N0-N4 | Arquitetura de 3 camadas |
| 9 | **Análise Profunda** | 98K linhas CLI, 45/59 sem testes | 5 SPOFs, 10 otimizações |

---

## 2. Matriz de Ações Otimizadas (Impacto × Esforço)

### 2.1 🔴 Ações de Altíssimo Impacto e Baixo Esforço (FAZER AGORA)

| # | Ação | Impacto | Esforço | Estudo | Depende de |
|---|------|---------|---------|--------|------------|
| A01 | Instalar 11 pacotes `@theia/ai-*` | Elimina 859 linhas manuais | 1h | #7 | Nada |
| A02 | Configurar LanguageModelService (Ollama + OpenAI) | Chat nativo do Theia | 2h | #7 | A01 |
| A03 | Conectar DAP bridge ao WebSocket `/dap` | Debug funcional (489 linhas paradas) | 4h | #4 | Nada |
| A04 | Criar `IdeiaCustomTitleWidget` | Title bar 100% mockup | 2h | #6 | Nada |
| A05 | Registrar tema IDEIA (24 cores) | Identidade visual completa | 1h | #4 | Nada |
| A06 | Criar MCP Tools server (15 ferramentas) | IA chama serviços IDEIA | 4h | #8 | A02 |

### 2.2 🟠 Ações de Alto Impacto e Médio Esforço (PRÓXIMA SPRINT)

| # | Ação | Impacto | Esforço | Estudo | Depende de |
|---|------|---------|---------|--------|------------|
| A07 | Copiar DashboardPanel do mockup | Painel funcional com dados reais | 1 dia | #2 | A09 |
| A08 | Copiar StudiesPanel do mockup | Painel de estudos funcional | 1 dia | #2 | A10 |
| A09 | Criar `GET /api/diagnostics` | Dashboard com dados reais | 4h | #4 | Nada |
| A10 | Criar `GET /api/studies` | Studies com dados reais | 4h | #4 | Nada |
| A11 | Criar `GET/POST /api/approvals` | Approvals com state machine | 1 dia | #4 | Nada |
| A12 | Criar `GET /api/suggestions` | Suggestions com dados | 4h | #4 | A06 |
| A13 | Copiar ApprovalsPanel do mockup | Painel de aprovações funcional | 1 dia | #2 | A11 |
| A14 | Copiar SuggestionsPanel do mockup | Painel de sugestões funcional | 1 dia | #2 | A12 |
| A15 | Extrair CLI (98K) em submódulos | -60% tempo de compilação | 2 semanas | #9 | Nada |

### 2.3 🟡 Ações de Médio Impacto e Baixo Esforço (BACKLOG)

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| A16 | Ativar NatsEventBus como padrão | Eventos persistentes | 1 dia |
| A17 | Adicionar testes para packages sem cobertura | +80% confiança | Contínuo |
| A18 | Paralelizar build CI (3 threads) | -30% tempo de CI | Configuração |
| A19 | Documentar 35 endpoints como OpenAPI | Contratos claros | 2h |
| A20 | Integrar ChangeSet do Theia | Edições com undo | 1 dia |
| A21 | Implementar ChatAgent do Theia | Chat nativo | 1 dia |
| A22 | Integrar `autonomy-policy.ts` no AgentRuntime | Níveis N0-N4 | 2h |

---

## 3. Melhores Abordagens e Mitigações

### 3.1 Abordagens Melhores que as Atuais

| Atual | Problema | Melhor Abordagem | Benefício |
|-------|----------|-----------------|-----------|
| `@ai-devkit/llm-provider` manual | 318 linhas para manter | `@theia/ai-ollama` + `@theia/ai-openai` | 0 linhas, nativo, mantido pelo Theia |
| Chat SSE manual | 356 linhas, parse frágil | `@theia/ai-chat` + `@theia/ai-chat-ui` | 0 linhas, ChangeSet incluso |
| Tool calls manuais | 150 linhas, sem padronização | `@theia/ai-mcp` (Model Context Protocol) | Padrão aberto, interoperável |
| Output validator manual | 101 linhas, regras fixas | `@theia/ai-scanoss` | Scanning de segurança nativo |
| CLI monolítico (98K) | Compilação lenta, difícil manutenção | Extrair em 8+ módulos por domínio | Build incremental, paralelizável |
| Testes manuais | 45/59 packages sem testes | IA gera testes automaticamente | Cobertura escala sem esforço manual |

### 3.2 Mitigações para Riscos Identificados

| Risco | Probabilidade | Mitigação | Responsável |
|-------|--------------|-----------|-------------|
| `@ai-devkit/contracts` quebrar 20 packages | Baixa | Testes de schema + CI gate | CI/CD |
| LLM provider offline | Alta | Fallback automático (Ollama → OpenAI → DeepSeek) | Theia AI |
| CLI 98K linhas impossível de manter | Alta | Extração em módulos (A15) | Arquitetura |
| 45/59 packages sem testes | Alta | Auto-geração de testes via IA | IA |
| Theia AI API mudar | Média | Aderir a versões LTS do Theia | Dependência |
| Mockup divergir da implementação | Média | `reality-check.ps1` no CI | Automação |
| Performance de build | Média | `tsc -b` incremental + cache | CI/CD |

---

## 4. Plano de Execução Otimizado (Ordem Recomendada)

### Sprint 0 — Fundação (3 dias)

```
D1: A01 + A02 — Instalar @theia/ai-* + configurar LanguageModelService
    Impacto: Chat nativo do Theia, 859 linhas eliminadas

D2: A05 + A04 — Tema IDEIA + CustomTitleWidget
    Impacto: Identidade visual completa + title bar mockup

D3: A03 — Conectar DAP bridge
    Impacto: Debug funcional (489 linhas deixam de ser mortas)
```

### Sprint 1 — Backend (4 dias)

```
D4: A09 — GET /api/diagnostics
D5: A10 — GET /api/studies  
D6: A11 — GET/POST /api/approvals
D7: A12 — GET /api/suggestions + A06 — MCP Tools
```

### Sprint 2 — Frontend (4 dias)

```
D8: A07 — DashboardPanel (copiar do mockup)
D9: A13 — ApprovalsPanel (copiar do mockup)
D10: A08 — StudiesPanel + A14 — SuggestionsPanel
D11: A21 — ChatAgent do Theia
```

### Sprint 3 — Qualidade (3 dias)

```
D12: A20 — ChangeSet do Theia
D13: A22 — Níveis N0-N4
D14: A17 — Testes + A19 — OpenAPI
```

---

## 5. Métricas de Sucesso

| Métrica | Atual | Alvo Sprint 0 | Alvo Sprint 1 | Alvo Sprint 2 | Alvo Sprint 3 |
|---------|-------|---------------|---------------|---------------|---------------|
| Packages com testes | 14/59 | 14 | 20 | 30 | 45+ |
| Linhas de código manual | ~1.141 (IA) | ~282 (-75%) | ~282 | ~0 (-100%) | ~0 |
| Endpoints REST | 35 | 36 (+1) | 40 (+5) | 40 | 40 |
| MCP Tools | 0 | 0 | 15 | 15 | 15 |
| Painéis do mockup | 0/4 | 0 | 0 | 4/4 | 4/4 |
| Fidelidade ao mockup | ~60% | ~70% | ~80% | ~95% | 100% |
| Tempo de build CI | ~3.5min | ~3.5min | ~3min | ~2.5min | ~2.5min |
| Testes passando | 209 | 220+ | 250+ | 300+ | 350+ |

---

## 6. Riscos Residuais (Após Mitigações)

| Risco | Residual | Observação |
|-------|----------|------------|
| CLI 98K linhas | 🟡 Médio | Extração em módulos é longo (2 semanas) |
| 45/59 packages sem testes | 🟡 Médio | Auto-geração via IA é confiável? |
| Theia AI API mudar | 🟢 Baixo | Versões LTS do Theia são estáveis |
| Performance | 🟢 Baixo | Build paralelo + cache resolvem |

---

## 7. Conclusão

### O Que Já Existe

```
📊 59 packages · 35 endpoints · 209 testes · mockup 100% replicável
📋 9 estudos · 150KB de análise · 22 ações priorizadas
🔧 DAP bridge (489 linhas) · CustomTitleWidget · MCP Tools design
🏗️ Theia 1.73 + 18 pacotes AI · React 18 · Vite · Electron
```

### O Que Falta (22 Ações)

```
🔴 6 ações imediatas (1-4h cada): instalar @theia/ai-*, DAP, tema, title bar, MCP
🟠 9 ações sprint (4h-2d): 4 painéis mockup, 4 endpoints, extrair CLI  
🟡 7 ações backlog (2h-1d): NATS, testes, OpenAPI, ChangeSet, ChatAgent, N0-N4
```

### Abordagens Corrigidas

```
❌ ANTES: @ai-devkit/llm-provider manual (318 linhas)
✅ DEPOIS: @theia/ai-ollama + @theia/ai-openai (0 linhas, nativo)

❌ ANTES: Chat SSE manual com parse frágil (356 linhas)
✅ DEPOIS: @theia/ai-chat + @theia/ai-chat-ui (0 linhas, ChangeSet incluso)

❌ ANTES: Tool calls manuais sem padrão (150 linhas)
✅ DEPOIS: @theia/ai-mcp — Model Context Protocol (padrão aberto)

❌ ANTES: CLI monolítico 98K (compilação lenta)
✅ DEPOIS: 8+ módulos por domínio (build incremental)
```

> **A IDEIA está pronta para execução. 22 ações mapeadas, priorizadas e otimizadas.**
> **Sprint 0 (3 dias) já entrega valor: Theia AI + tema + DAP funcional.**
