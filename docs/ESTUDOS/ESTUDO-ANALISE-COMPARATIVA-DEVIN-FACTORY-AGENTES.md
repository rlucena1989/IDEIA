# 🔬 Estudo Comparativo e Decomposição de Plataformas Autônomas de Engenharia de Software

> **Documento de Análise Crítica para Evolução da IDEIA**
> Data: 2026-07-20 | Versão: 1.0
> Autores: Sistema de Agentes IDEIA (Analyst + Architect + Researcher)
> Licença: CC-BY-4.0 — IDEIA Platform

---

## Índice

- [Fase 1: Decomposição do Texto Base — Devin](#fase-1-decomposição-do-texto-base--devin)
- [Fase 2: Mapeamento de Capacidades — IDEIA vs Devin](#fase-2-mapeamento-de-capacidades)
- [Fase 3: Pesquisa de Mercado — Plataformas Concorrentes](#fase-3-pesquisa-de-plataformas-concorrentes)
- [Fase 4: Decomposição de Funcionalidades em Estudos](#fase-4-decomposição-em-estudos)
- [Fase 5: Estudos Aprofundados Individuais](#fase-5-estudos-aprofundados)
- [Fase 6: Roteiro de Implementação Prioritizado](#fase-6-roteiro-de-implementação)

---

## Fase 1: Decomposição do Texto Base — Devin

### 1.1 Funcionalidades Extraídas

Cada afirmação do texto original foi decomposta e classificada:

| ID | Funcionalidade | Descrição | Categoria | Maturidade Devin |
|:--:|---------------|-----------|:----------:|:----------------:|
| D01 | **Máquina própria (VM)** | Ambiente isolado com shell, sistema de arquivos, navegador | Infraestrutura | 🟢 Produção |
| D02 | **Trabalho assíncrono** | Dispara tarefas, retorna quando termina (aviso) | UX/Orquestração | 🟢 Produção |
| D03 | **Paralelismo** | Várias tarefas/sessões simultâneas | Orquestração | 🟢 Produção |
| D04 | **Ciclo completo** | Branch → implementa → testa → PR → CI → corrige → review | Pipeline | 🟢 Produção |
| D05 | **Shell persistente** | Terminal real com ambiente completo | Execução | 🟢 Produção |
| D06 | **Busca de código** | Ripgrep-style search em todo repositório | IDE | 🟢 Produção |
| D07 | **Navegador integrado (Computer Use)** | Clica, digita, testa telas, captura screenshots/vídeos | Testing/QA | 🟢 Produção |
| D08 | **Playwright scripting** | SSO/OAuth via scripts automatizados | Testing | 🟢 Produção |
| D09 | **Git/GitHub nativo** | Cria/atualiza PRs, lê reviews, acompanha CI | Git/SCM | 🟢 Produção |
| D10 | **Testing Agent** | Validação E2E autônoma em background + gravação | Testing | 🟢 Produção |
| D11 | **Sidekick (subagente)** | Agente paralelo para tarefas mecânicas | Multiagente | 🟢 Produção |
| D12 | **Sessões filhas / paralelização** | Decomposição de trabalho grande em sessões simultâneas | Orquestração | 🟢 Produção |
| D13 | **Blueprint + Snapshot** | YAML de ambiente → snapshot cacheado | Infraestrutura | 🟢 Produção |
| D14 | **Secrets gerenciados** | Credenciais seguras por sessão/repo/permanente | Segurança | 🟢 Produção |
| D15 | **Knowledge & Playbooks** | Notas de conhecimento + procedimentos testados | Memória | 🟢 Produção |
| D16 | **MCP (Model Context Protocol)** | Conexão com ferramentas/serviços externos | Integração | 🟢 Produção |
| D17 | **Integrações de fluxo** | Slack, GitHub, webapp com transmissão ao vivo | UX | 🟢 Produção |
| D18 | **Agnóstico de linguagem/stack** | Qualquer linguagem/framework instalável | Flexibilidade | 🟢 Produção |
| D19 | **Qualidade controlada** | PR revisável, lint, typecheck, escopo | Qualidade | 🟢 Produção |
| D20 | **Onboarding em código legado** | Exploração e explicação de bases grandes | Análise | 🟢 Produção |
| D21 | **Rastreabilidade** | URL de sessão, histórico, gravações de vídeo | Auditoria | 🟢 Produção |
| D22 | **Revisão humana como tech lead** | Modelo: humano revisa PRs, não merge automático | Governança | 🟢 Produção |
| D23 | **Devin Fusion (multi-modelo)** | Dois agentes em paralelo com contextos cacheados | Arquitetura IA | 🟢 Produção |
| D24 | **Agentic MapReduce** | Selectors → shards → map (paralelo) → reduce | Processamento | 🟢 Produção |
| D25 | **DeepWiki** | Documentação automática de código-fonte | Documentação | 🟢 Produção |
| D26 | **Ask Devin** | Q&A sobre codebase em linguagem natural | Análise | 🟢 Produção |
| D27 | **Memory layering** | 4 camadas: working memory, step summaries, scratchpad, knowledge | Memória | 🟢 Produção |
| D28 | **Planner-Executor split** | Planner (caro, raro) + Executor (barato, frequente) | Arquitetura IA | 🟢 Produção |
| D29 | **Fork model (CLI)** | /fork, /steps, /revert, /continue | UX | 🟢 Produção |
| D30 | **SWE-1.7 RL training** | Modelo proprietário treinado com RL sobre RL | Modelo | 🟢 Produção |
| D31 | **MCP as provider** | Devin expõe MCP server para outros agentes o dirigirem | Integração | 🟢 Produção |
| D32 | **MCP as consumer** | Devin consome 40+ MCPs do marketplace | Integração | 🟢 Produção |
| D33 | **Testing skills** | Extração de steps repetitivos em scripts reutilizáveis | Testing | 🟢 Produção |
| D34 | **Golden Snapshots** | Template enterprise-wide de ambiente | Infraestrutura | 🟢 Produção |
| D35 | **Self-compaction** | Modelo aprende a sumarizar estado e retomar de sumários | Modelo | 🟢 Produção |

---

## Fase 2: Mapeamento de Capacidades

### 2.1 Matriz IDEIA vs Devin

| ID | Funcionalidade | Devin | IDEIA (atual) | Gap | Prioridade |
|:--:|:---------------|:-----:|:-------------:|:---:|:----------:|
| D01 | VM isolada | ✅ VM Linux efêmera | 🟡 VM.Script sandbox + chroot-like | Médio | 🟠 |
| D02 | Trabalho assíncrono | ✅ Nativo | 🟡 CLI com `--background` existe mas não notifica | Alto | 🔴 |
| D03 | Paralelismo | ✅ Sessions filhas + subagentes | ❌ Apenas single-thread (LangGraph não implementado) | Crítico | 🔴 |
| D04 | Ciclo completo | ✅ Branch→PR→CI→Review | 🟡 delivery-orchestrator existe mas não executa deploy real | Alto | 🔴 |
| D05 | Shell persistente | ✅ Terminal interativo | ✅ node-pty + xterm.js | Mínimo | 🟢 |
| D06 | Busca de código | ✅ Ripgrep integrado | ✅ ripgrep (rg.exe) incluído no theia-app | Mínimo | 🟢 |
| D07 | Navegador integrado | ✅ Computer Use | ❌ Apenas web scraping via fetch | Crítico | 🔴 |
| D08 | Playwright scripting | ✅ Testes E2E | ❌ Sem E2E framework integrado | Alto | 🔴 |
| D09 | Git/GitHub nativo | ✅ CRUD PR, review, CI loop | 🟡 51 comandos VS Code mas sem automação de PR | Alto | 🔴 |
| D10 | Testing Agent | ✅ Background + gravação | ❌ verification-layer existe mas sem agente dedicado | Alto | 🔴 |
| D11 | Sidekick | ✅ Agente paralelo barato | ❌ Sem multiagente real | Crítico | 🔴 |
| D12 | Sessões filhas | ✅ Decomposição automática | ❌ Apenas todowrite manual | Crítico | 🔴 |
| D13 | Blueprint + Snapshot | ✅ YAML→Build→Snapshot | 🟡 `docker-compose.yml` existe mas sem sistema de snapshot | Alto | 🔴 |
| D14 | Secrets gerenciados | ✅ AES-256, TLS 1.3+, 3 níveis | 🟡 Validate tool detecta secrets mas sem storage seguro | Alto | 🔴 |
| D15 | Knowledge & Playbooks | ✅ Curadoria explícita | 🟡 `.ai/memory/` com JSON persistente | Médio | 🟠 |
| D16 | MCP integration | ✅ Consumidor + Provedor | 🟡 Pacote MCP existe mas sem marketplace | Médio | 🟠 |
| D17 | Integrações Slack/GH | ✅ Nativo | ❌ Sem integrações externas | Alto | 🔴 |
| D18 | Agnóstico de stack | ✅ Qualquer linguagem | ✅ 13 adapters de linguagem | Mínimo | 🟢 |
| D19 | Qualidade controlada | ✅ PR revisável | 🟡 4 quality gates documentados mas não todos implementados | Médio | 🟠 |
| D20 | Legado onboarding | ✅ DeepWiki + Ask Devin | ❌ Sem análise automática de código legado | Alto | 🔴 |
| D21 | Rastreabilidade | ✅ Sessão URL + vídeo | 🟡 SHA-256 audit trail + relatórios | Médio | 🟠 |
| D22 | Revisão humana | ✅ Tech lead review | ✅ Approval flow 3 níveis | Mínimo | 🟢 |
| D23 | Fusion multi-modelo | ✅ 2 modelos cacheados | 🟡 3 LLM providers com fallback mas sem sidekick | Médio | 🟠 |
| D24 | Agentic MapReduce | ✅ Select→Shard→Map→Reduce | ❌ Não existe | Crítico | 🔴 |
| D25 | DeepWiki | ✅ Auto documentação | ❌ `docs-generator` existe mas sem auto-indexação de código | Alto | 🔴 |
| D26 | Ask Devin (codebase Q&A) | ✅ NL sobre código | ❌ `knowledge-index` existe mas sem Q&A | Alto | 🔴 |
| D27 | Memory layering | ✅ 4 camadas explícitas | 🟡 memory-store com JSON file temporal | Médio | 🟠 |
| D28 | Planner-Executor split | ✅ 2 modelos diferentes | ❌ agent-runtime unificado (sem split) | Alto | 🔴 |
| D29 | Fork model CLI | ✅ /fork /revert /continue | ❌ CLI linear sem checkpoint/rollback | Alto | 🔴 |
| D30 | SWE-1.7 RL | ✅ Modelo proprietário | ❌ Usa LLMs públicos sem fine-tuning | Médio | 🟠 |
| D31 | MCP provider | ✅ Devin expõe MCP | ❌ Apenas consome MCP | Médio | 🟠 |
| D32 | MCP marketplace | ✅ 40+ pre-configurados | ❌ Não existe | Alto | 🔴 |
| D33 | Testing skills | ✅ Scripts reutilizáveis | ❌ Sem reuso de procedimentos de teste | Alto | 🔴 |
| D34 | Golden Snapshots | ✅ Enterprise template | ❌ Não existe | Médio | 🟠 |
| D35 | Self-compaction | ✅ Model-level | ❌ Não existe | Longo prazo | 🔵 |

### 2.2 Vantagens Exclusivas da IDEIA (Devin NÃO tem)

| ID | Capacidade | Descrição | Importância |
|:--:|:-----------|:----------|:----------:|
| I01 | **Prompt Pipeline** | Guard→Classify→Enrich→Optimize→Plan→Format — 0 interação humana | 🟢 Alta (eficiência tokens) |
| I02 | **Oráculo da Verdade** | Reality Manifest + Verificação automática doc↔código | 🟢 Alta (integridade) |
| I03 | **6 agentes especializados** | Analyst, Architect, Programmer, Reviewer, Tester, DevOps | 🟢 Alta |
| I04 | **Theia Platform** | IDE extensível nativamente (não fork VS Code) | 🟡 Média |
| I05 | **13 adapters de linguagem** | Dart, Elixir, Go, Haskell, Java, Kotlin, PHP, Python, Ruby, Scala, Swift, Zig, NestJS | 🟢 Alta |
| I06 | **Inversify DI + Contratos Zod** | Injeção de dependência + validação em runtime | 🟡 Média |
| I07 | **SHA-256 audit trail** | Cadeia de hash imutável para auditoria | 🟡 Média |
| I08 | **4 Quality Gates** | Commit→PR→Release→Sprint com 7 dimensões | 🟢 Alta |
| I09 | **Política de Autonomia (N0-N4)** | Níveis de autonomia configuráveis por ação | 🟢 Alta (diferenciação) |
| I10 | **7 dimensões de qualidade** | Código, Segurança, Performance, UX, Integração, Resiliência, Dados | 🟢 Alta |
| I11 | **Auto-auditoria contínua** | auto-audit-loop + agent-auditor + verify-study-compliance | 🟢 Alta |
| I12 | **Open source** | MIT License — sem vendor lock-in | 🟢 Alta (diferenciação) |
| I13 | **CLI auditável** | `--json`, `--verbose`, audit trail obrigatório | 🟡 Média |
| I14 | **Gap Analysis Permanente** | 70 gaps catalogados, 70 resolvidos | 🟢 Alta |
| I15 | **DAP + LSP nativos** | 8 LSP providers, DebugPanel funcional | 🟡 Média |

---

## Fase 3: Pesquisa de Plataformas Concorrentes

### 3.1 Matriz Comparativa das Principais Plataformas

| Característica | **Devin** | **Factory AI** | **Claude Code** | **GitHub Copilot** | **Cursor** | **OpenHands** | **OpenAI Codex** | **IDEIA** |
|:--------------|:---------:|:--------------:|:---------------:|:------------------:|:----------:|:-------------:|:----------------:|:---------:|
| **Open Source** | ❌ | ❌ | ❌ (leaked) | ❌ | ❌ | ✅ MIT | ✅ CLI | ✅ MIT |
| **Modelo próprio** | ✅ SWE-1.7 | ❌ BYO | ✅ Claude | ✅ Multi | ✅ Composer | ❌ BYO | ✅ Codex | ❌ BYO |
| **VM/sandbox** | ✅ | ✅ | ❌ local | ✅ cloud | ❌ local | ✅ Docker | ✅ cloud | 🟡 partial |
| **Computer Use** | ✅ Desktop | ❌ | ✅ Desktop | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multiagente** | ✅ Fusion | ✅ Droids | ✅ Dynamic WFs | ✅ Agent Mode | ✅ Subagents | ✅ SDK | ❌ | 🟡 Planned |
| **SWE-bench** | 80%+ | — | 87% | — | — | Top OSS | — | ❌ No score |
| **MCP** | ✅ Both | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 Partial |
| **Knowledge** | ✅ Playbooks | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 JSON |
| **IDE Surface** | Cloud IDE | Desktop+CLI | CLI only | VS Code | Fork VSC | CLI+Web | CLI+Cursor | Theia+CLI |
| **Enterprise** | ✅ VPC | ✅ On-prem | ❌ | ✅ GHEC | ✅ SOC2 | Self-host | ✅ | ❌ |
| **Pricing** | $20-500/mo | $20-200/mo | $17-100/mo | $10-39/mo | $20-200/mo | Free | $20-200/mo | **Free** |
| **E2E Testing** | ✅ Video | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR Automation** | ✅ Full | ✅ | 🟡 | ✅ | 🟡 | ✅ | 🟡 | 🟡 Partial |
| **CI Integration** | ✅ Native | ✅ | ❌ | ✅ Native | ❌ | ❌ | ❌ | 🟡 Planned |
| **Auth integrada** | ❌ | ❌ | ❌ | ✅ GH | ❌ | ❌ | ❌ | ❌ |

### 3.2 Análise Crítica por Plataforma

#### 3.2.1 Devin (Cognition AI)
**Valiação: $26B | ARR: $492M | Modelo: Proprietário SWE-1.6/1.7**
- **Forças:** Ciclo completo (plan→code→test→PR), Computer Use real, multiagente Fusion, Agentic MapReduce, DeepWiki/Ask Devin
- **Fraquezas:** Vendor lock-in, sem BYOK, sem Windows sandbox, integrações fragmentadas (pós-aquisição Windsurf), modelo de precificação opaco (ACUs → tokens em 2026)
- **Diferenciais únicos:** SWE-1.7 RL-training pipeline, self-compaction, Golden Snapshots enterprise
- **Crítica:** Apesar da avaliação de $26B, Devin é surpreendentemente limitado em extensibilidade. O "compound AI system" é um black box. A aquisição do Windsurf (Codeium) sugere que a plataforma ainda está longe de ser coesa.

#### 3.2.2 Factory AI
**Valiação: $1.5B | Modelo: Multi-model (BYO)**
- **Forças:** Multi-surface (Desktop+CLI+SDK), Droid agent system, adjustable autonomy, #1 on Terminal Bench, enterprise-first (Nvidia, Adobe, Morgan Stanley)
- **Fraquezas:** Sem Computer Use, sem E2E testing, sem SWE-bench score, sem testing agent
- **Diferenciais únicos:** SDK embeddable em CI/CD, "Zero Data Retention", Droid Computers (cloud sandboxes)
- **Crítica:** Factory é o competidor mais pragmático. O design multi-surface (Desktop+CLI+SDK) é superior ao single-surface do Devin. A abordagem "BYO model" dá flexibilidade que Devin não oferece.

#### 3.2.3 Claude Code (Anthropic)
**Valiação: $80B (Anthropic) | SWE-bench: 87% (highest)**
- **Forças:** Maior score SWE-bench, computer use (desktop), extended thinking, Dynamic Workflows (parallel subagents), agent SDK, segurança por design
- **Fraquezas:** Terminal-only (sem IDE), sem MCP, Anthropic ecosystem lock-in, leaked source code (44 feature flags)
- **Diferenciais únicos:** Extended thinking (internal reasoning before tools), KAIROS scheduling, Agent Swarms (feature flag)
- **Crítica:** Claude Code é tecnicamente superior em qualidade de código (87% SWE-bench) e architecture de segurança. A descoberta de 44 feature flags no source leak revela ambições massivas (Agent Swarms, KAIROS). Sua maior fraqueza é ser terminal-only.

#### 3.2.4 GitHub Copilot Agent Mode
**Base: 150M+ developers | Preço: $10/mo**
- **Forças:** Maior base de usuários, integração nativa com GitHub Issues, CI/CD, PRs, 20M+ usuários, 90% Fortune 100
- **Fraquezas:** Modelo mais fraco que Devin/Claude, sem Computer Use, sem ambiente persistente (apenas efêmero)
- **Diferenciais únicos:** Moat da plataforma GitHub, menor barreira de entrada
- **Crítica:** Copilot tem a maior vantagem distribuição. A questão é se a qualidade acompanha. O Coding Agent (assíncrono) e Agent Mode (síncrono) são duas ofertas distintas que criam confusão.

#### 3.2.5 Cursor AI
**Valiação: $10B+ | ARR: $1B+**
- **Forças:** Melhor UX de IDE nativa para IA, propósito-built Composer model, subagentes com contextos independentes, 8 agentes paralelos, BugBot
- **Fraquezas:** Vendor lock-in (VS Code fork), sem Computer Use, sem environment snapshot, sem ciclo completo de PR
- **Diferenciais únicos:** Primeiro IDE "AI-first" (não AI-added), Composer model RL treinado
- **Crítica:** Cursor é o mais popular entre desenvolvedores individuais. O design Agent-first é superior a IDEs que adicionaram IA como feature. A limitação é ser apenas uma IDE — sem CI/CD, sem E2E, sem deployment.

#### 3.2.6 OpenHands (OpenDevin)
**GitHub: 55K+ estrelas | Licença: MIT**
- **Forças:** Mais completo open-source, SDK com REST API, sandbox Docker/K8s, multi-LLM routing, segurança integrada (Invariant Labs)
- **Fraquezas:** Menor qualidade que comerciais, sem Computer Use, sem interface Desktop
- **Diferenciais únicos:** Único open-source com publicação acadêmica (MLSys 2026), comunidade massiva
- **Crítica:** OpenHands é a alternativa open-source mais viável ao Devin. O SDK (MLSys 2026) é uma contribuição arquitetural significativa. A qualidade ainda não alcança a Claude Code, mas o modelo aberto permite customização que os comerciais não oferecem.

#### 3.2.7 OpenAI Codex CLI
**5M usuários/semana | npm: 14.5M downloads/mês**
- **Forças:** Open-source CLI, sandbox cloud seguro, 1M tokens contexto, Plan-Do-Observe loop, Rust (performance), integração ChatGPT
- **Fraquezas:** CLI-only, sem Computer Use, sem multiagente, sem CI integration
- **Diferenciais únicos:** Adoção mais rápida da categoria (5M users em 14 meses), melhor sandbox security
- **Crítica:** Codex CLI representa a "commoditização" do agente autônomo de código — gratuito, open-source, e integrado ao ChatGPT. O rewrite em Rust mostra preocupação com performance/segurança.

### 3.3 Insights Cross-Plataforma

| Insight | Implicação para IDEIA |
|:--------|:----------------------|
| **Multi-surface é o futuro** (Factory, Devin, IDEIA) | IDEIA já tem CLI+Theia+Desktop — fortalecer |
| **Computer Use está se tornando padrão** (Devin, Claude) | **Gap crítico** — IDEIA precisa implementar |
| **BYO model é preferência enterprise** (Factory, OpenHands) | IDEIA já tem 3 providers — adicionar Anthropic, Gemini |
| **MCP é o protocolo de integração dominante** (Devin, Copilot, Cursor) | IDEIA já tem MCP pacote — expandir para marketplace |
| **Testes E2E com gravação é diferencial** (Devin) | **Gap alto** — Playwright + gravação de vídeo |
| **Knowledge/Playbooks aumenta retenção** (Devin, Factory) | IDEIA tem memory-store — evoluir para playbooks |
| **SWE-bench é requisito para credibilidade** | IDEIA precisa publicar score |
| **Parallel agent execution é requisito** (todos exceto Codex) | **Gap crítico** — priorizar LangGraph |
| **PR automation é feature mais valorizada** (Devin, Factory, Copilot) | **Gap alto** — delivery-orchestrator precisa completar |
| **Snapshot/Blueprint reduz tempo de setup** (Devin, Factory) | **Gap médio** — docker-compose já existe, evoluir |

---

## Fase 4: Decomposição em Estudos

### 4.1 Estrutura de Decomposição

Cada funcionalidade mapeada nas Fases 1-3 será decomposta em:

```
Fase N: [Título do Estudo]
├── Task N.1: [Tarefa]
│   ├── Passo N.1.1: [Ação concreta]
│   ├── Passo N.1.2: [Ação concreta]
│   └── ...
├── Task N.2: [Tarefa]
└── ...
```

### 4.2 Árvore Completa de Estudos

```
ESTUDO-ANALISE-COMPARATIVA-DEVIN-FACTORY-AGENTES.md
│
├── ESTUDO-A1: Computer Use — Navegador e Desktop Autônomo
│   ├── Task A1.1: Pesquisa de tecnologias (Playwright, Puppeteer, Selenium)
│   ├── Task A1.2: Arquitetura de Computer Use para IDEIA
│   ├── Task A1.3: Integração com Testing Agent
│   ├── Task A1.4: Gravação de vídeo como prova de teste
│   └── Task A1.5: Autenticação e login automático (SSO, OAuth, TOTP)
│
├── ESTUDO-A2: Multiagente e Paralelismo
│   ├── Task A2.1: Análise de frameworks de orquestração (LangGraph, CrewAI, AutoGen, Semantic Kernel)
│   ├── Task A2.2: Devin Fusion — arquitetura de dois modelos cacheados
│   ├── Task A2.3: Factory Droids — sistema de agentes multi-surface
│   ├── Task A2.4: Claude Dynamic Workflows — subagentes paralelos com verificação
│   ├── Task A2.5: Agentic MapReduce — processamento paralelo de codebase
│   ├── Task A2.6: Sidekick/subagente de baixo custo
│   └── Task A2.7: Sessões filhas e decomposição automática de tarefas
│
├── ESTUDO-A3: Ambiente Reprodutível — VM, Sandbox e Snapshots
│   ├── Task A3.1: Análise de tecnologias de sandbox (Docker, Firecracker, gVisor, K8s)
│   ├── Task A3.2: Blueprint + Snapshot — YAML declarativo de ambiente
│   ├── Task A3.3: Golden Snapshots enterprise
│   ├── Task A3.4: Secrets management integrado
│   ├── Task A3.5: Cache de dependências entre sessões
│   └── Task A3.6: Suporte Windows + Linux para sandbox
│
├── ESTUDO-A4: Ciclo Completo de Entrega (PR Automation)
│   ├── Task A4.1: Análise de ferramentas de automação de PR (GitHub CLI, Octokit, GitLab API)
│   ├── Task A4.2: Branch → Implement → Test → PR → CI → Fix → Review loop
│   ├── Task A4.3: CI/CD integration (GitHub Actions, GitLab CI)
│   ├── Task A4.4: Commit signing (GPG) automático
│   ├── Task A4.5: Revisão de PR automatizada (BugBot, CodeRabbit)
│   └── Task A4.6: Merge automático com safety gates
│
├── ESTUDO-A5: Testing Agent Autônomo
│   ├── Task A5.1: Análise de E2E testing frameworks (Playwright, Cypress, WebDriverIO)
│   ├── Task A5.2: Arquitetura de testing agent em background
│   ├── Task A5.3: Gravação de vídeo e screenshots como evidência
│   ├── Task A5.4: Test plan generation automática
│   ├── Task A5.5: Reusable testing skills (Playbooks)
│   └── Task A5.6: Parallel testing (10-20 Devins)
│
├── ESTUDO-A6: Conhecimento e Memória Persistentes
│   ├── Task A6.1: Análise de sistemas de conhecimento (Mem0, RAG, knowledge graphs)
│   ├── Task A6.2: Knowledge base curadoria explícita vs implícita
│   ├── Task A6.3: Playbooks — procedimentos testados como templates
│   ├── Task A6.4: Memory layering (4 camadas do Devin)
│   ├── Task A6.5: Self-compaction e sumarização de contexto
│   └── Task A6.6: Fork model — checkpoint, revert, continue
│
├── ESTUDO-A7: MCP — Model Context Protocol
│   ├── Task A7.1: Análise do protocolo MCP (especificação, transports, security model)
│   ├── Task A7.2: Devin como MCP consumer (40+ pre-configured)
│   ├── Task A7.3: Devin como MCP provider (session, knowledge, playbook APIs)
│   ├── Task A7.4: MCP marketplace para IDEIA
│   ├── Task A7.5: OAuth + permission system para MCP
│   └── Task A7.6: A2A (Agent-to-Agent) protocol complementar
│
├── ESTUDO-A8: DeepWiki — Documentação Automática de Código
│   ├── Task A8.1: Análise de ferramentas de documentação automática (TypeDoc, JSDoc, Docusaurus)
│   ├── Task A8.2: Geração de diagramas de arquitetura
│   ├── Task A8.3: Ask Devin — Q&A em linguagem natural sobre código
│   ├── Task A8.4: Breaking change detection
│   ├── Task A8.5: Codebase map (repo-map do Aider)
│   └── Task A8.6: Integração com o Oráculo da Verdade
│
├── ESTUDO-A9: Planejador-Executor Split
│   ├── Task A9.1: Análise da arquitetura Devin (planner caro/raro, executor barato/frequente)
│   ├── Task A9.2: SWE-agent ACI design philosophy
│   ├── Task A9.3: Plano estruturado em JSON → executor step-by-step
│   ├── Task A9.4: Re-planejamento dinâmico
│   └── Task A9.5: Context window management (self-compaction)
│
├── ESTUDO-A10: Modelos e Fine-tuning
│   ├── Task A10.1: Análise de RL fine-tuning para código (SWE-1.7, Kimi K2.7)
│   ├── Task A10.2: Adaptive model router (qual modelo para qual tarefa)
│   ├── Task A10.3: Multi-provider fallback chain
│   ├── Task A10.4: Modelos locais vs cloud
│   └── Task A10.5: SWE-bench evaluation pipeline
│
├── ESTUDO-A11: Automação de CI/CD e Deploy
│   ├── Task A11.1: Workflows GitHub Actions (16 do ai-devkit-v2)
│   ├── Task A11.2: Quality gates integrados com CI
│   ├── Task A11.3: Deploy automático (GitOps, ArgoCD, Flux)
│   ├── Task A11.4: Release pipeline com canary
│   └── Task A11.5: Rollback automation
│
├── ESTUDO-A12: Integrações Externas e Fluxo de Trabalho
│   ├── Task A12.1: Integração Slack (+ comandos !ultra, !fast)
│   ├── Task A12.2: Integração Jira, Linear, Notion
│   ├── Task A12.3: Alertas e notificações em tempo real
│   ├── Task A12.4: Webapp dashboard de sessões
│   └── Task A12.5: Live streaming de execução do agente
│
├── ESTUDO-A13: Segurança e Governança
│   ├── Task A13.1: Análise OWASP LLM Top 10 vs Devin/Fabrica/Claude
│   ├── Task A13.2: BYOK (Bring Your Own Key)
│   ├── Task A13.3: VPC deployment / on-premise
│   ├── Task A13.4: SOC 2, HIPAA, GDPR compliance
│   ├── Task A13.5: Audit logging imutável
│   └── Task A13.6: Secrets management (AES-256, TLS 1.3+, KMS)
│
├── ESTUDO-A14: Arquitetura Multi-Surface
│   ├── Task A14.1: Análise das surfaces: CLI, Desktop, Web, IDE, SDK, CI/CD
│   ├── Task A14.2: Factory modelo — desktop+CLI+SDK simultaneous
│   ├── Task A14.3: Claude modelo — terminal-first + agent SDK
│   ├── Task A14.4: Devin modelo — cloud IDE + CLI
│   ├── Task A14.5: Unificação de experiência cross-surface
│   └── Task A14.6: Consistent agent state across surfaces
│
└── ESTUDO-A15: Governança de Autonomia
    ├── Task A15.1: Níveis de autonomia (N0-N4 já existe — expandir)
    ├── Task A15.2: Adjustable autonomy (Factory model)
    ├── Task A15.3: Policy engine com context-aware rules
    ├── Task A15.4: Human-in-the-loop com fallback
    ├── Task A15.5: Session isolation enterprise
    └── Task A15.6: Zero-retention deployment
```

---

## Fase 5: Estudos Aprofundados

### Estudo A1 — Computer Use: Navegador e Desktop Autônomo

#### Contexto
Devin e Claude Code implementaram "Computer Use" — capacidade de controlar um navegador real e desktop para testar aplicações, preencher formulários, fazer login e gravar evidências em vídeo. Esta é a funcionalidade de maior impacto para diferenciação da IDEIA.

#### Tecnologias Existentes

| Tecnologia | Tipo | Limitações | Custo |
|:-----------|:----:|:-----------|:----:|
| Playwright (Microsoft) | Framework E2E | Sem visão computacional nativa | Gratuito |
| Puppeteer (Google) | Framework E2E | Chrome-only | Gratuito |
| Selenium | Framework E2E | Lento, legado | Gratuito |
| CDP (Chrome DevTools Protocol) | Protocolo | Baixo nível | Gratuito |
| Browserbase / Browserless | Cloud browsers | Gerenciamento de sessão pago | $20-500/mo |
| Computer Use (Anthropic) | API | Claude-only, beta | Por API |
| Operator (OpenAI) | API | GPT-only | Por API |

#### Arquitetura Proposta para IDEIA

```
┌──────────────────────────────────────────────────────────┐
│                 IDEIA Computer Use                        │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │  Playwright  │  │  Screenshot │  │  Video Recorder   │ │
│  │  Engine       │  │  Analyzer  │  │  (FFmpeg/WebM)    │ │
│  └──────┬───────┘  └──────┬──────┘  └────────┬─────────┘ │
│         │                 │                   │           │
│  ┌──────┴─────────────────┴───────────────────┴────────┐ │
│  │              Agent Interface (MCP tools)             │ │
│  │  navigate | click | fill | screenshot | record       │ │
│  └────────────────────────┬─────────────────────────────┘ │
│                           │                               │
│  ┌────────────────────────┴─────────────────────────────┐ │
│  │              Session Manager (headless/full)          │ │
│  │  Cookie persistence · Auth flows · TOTP · MFA         │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Decisões-Chave

1. **Playwright como engine base** — é o padrão da indústria (Devin usa CDP + Playwright scripts)
2. **Container headless Chrome** em sandbox Docker para isolamento
3. **FFmpeg/WebCodecs API** para gravação de vídeo das sessões de teste
4. **Cookie persistence** com encryptação AES-256 (como Devin)
5. **TOTP/MFA support** via `otpauth://` URI + QR code scanning

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `terminal-sandbox` | Adicionar suporte a Chrome headless em container | 16h |
| `verification-layer` | Adicionar Computer Use como suite de verificação | 24h |
| `mcp` | Adicionar tools de Computer Use (navigate, click, screenshot, record) | 16h |
| `event-bus` | Adicionar eventos de Computer Use (browser.action, test.screenshot, test.video) | 4h |
| `cli` | Adicionar comando `ideia test:e2e --record` | 8h |
| `ideia-plugin` | Adicionar widget de Computer Use (screenshot preview, video playback) | 40h |
| **Novo pacote** | `@ideia/computer-use` — engine de automação de navegador | 80h |

---

### Estudo A2 — Multiagente e Paralelismo

#### Contexto
Devin Fusion (2 modelos em paralelo), Claude Dynamic Workflows (subagentes paralelos com verificação), Factory Droids (agentes multi-surface), GitHub Copilot (background coding agent). Multiagente é a tendência dominante.

#### Arquiteturas Existentes

| Abordagem | Plataforma | Descrição |
|:----------|:-----------|:----------|
| **Fusion** | Devin | 2 agentes cacheados (planner caro + executor barato), 35% redução de custo |
| **Dynamic Workflows** | Claude | Subagentes paralelos com verificação, dezenas a centenas |
| **Droid System** | Factory | Agentes discretos invocáveis de qualquer superfície |
| **Agent Mode** | Copilot | Tools dentro do editor + cloud agent para Issues |
| **Subagents** | Cursor | Até 8 agentes paralelos com git worktree |
| **Agent SDK** | OpenHands | Python + REST API, lifecycle control, multi-LLM |

#### Arquitetura Proposta para IDEIA

```
┌──────────────────────────────────────────────────────────────┐
│              IDEIA Multi-Agent Orchestrator                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Orchestrator (LangGraph planned)         │   │
│  │  Task Decomposition · Agent Selection · State Machine │   │
│  └──────────┬──────────┬──────────┬─────────────────────┘   │
│             │          │          │                         │
│  ┌──────────┴──────┐ ┌─┴──────┐ ┌─┴─────────────────────┐ │
│  │  Main Agent     │ │Sidekick│ │  Child Sessions        │ │
│  │  (Frontier LLM) │ │(Cheap) │ │  (Isolated VMs)        │ │
│  │  Planning/Review│ │Explore │ │  Map/Reduce pattern     │ │
│  └─────────────────┘ │ Write  │ └────────────────────────┘ │
│                      │ Test   │                            │
│                      └────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `agent-runtime` | Reestruturar para suportar orchestrator + agents | 40h |
| **Novo: `agent-orchestrator`** | Task decomposition, agent routing, state machine | 80h |
| `event-bus` | Adicionar eventos multiagente (agent.spawn, agent.complete, agent.fusion) | 8h |
| `delivery-orchestrator` | Integrar PR automation com multiagente | 24h |
| `cli` | Adicionar commands: `ideia task:decompose`, `ideia agent:fork` | 16h |

---

### Estudo A3 — Ambiente Reprodutível (Blueprint + Snapshot)

#### Contexto
Devin usa Blueprint YAML (initialize/maintenance/knowledge) → Build → Snapshot (VM image cacheadas). É o sistema declarativo de ambiente mais maduro.

#### Tecnologias Existentes

| Tecnologia | Uso em Agentes | 
|:-----------|:---------------|
| Docker/Dockerfile | OpenHands, SWE-agent, auto-code-rover |
| Devin Blueprint | Devin (proprietário) |
| Nix/NixOS | Deterministic builds |
| Vagrant | VM provisioning |
| Firecracker (AWS) | MicroVM serverless |
| gVisor (Google) | Container sandbox |
| CDE (Cloud Development Environment) | Gitpod, GitHub Codespaces, Coder |

#### Arquitetura Proposta

```
Blueprint (YAML) ──→ Build ──→ Snapshot ──→ Session
                                 ↑
                            Docker cache
```

**Blueprint IDEIA (YAML):**
```yaml
version: 1
name: my-project

initialize:
  - apt-get install -y nodejs python3 rustc
  - npm install -g typescript

maintenance:
  - npm ci
  - npm run build

knowledge:
  test: npm run test
  lint: npm run lint
  typecheck: npm run typecheck

clone:
  repository: https://github.com/user/repo
  branch: main

secrets:
  - NPM_TOKEN
  - GITHUB_TOKEN
```

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| **Novo: `@ideia/sandbox-vm`** | Gerenciamento de VMs/snapshots | 80h |
| `terminal-sandbox` | Evoluir para `docker-sandbox` com blueprint parser | 40h |
| `execution-layer` | Integrar snapshot lifecycle | 16h |
| **Novo: `@ideia/blueprint`** | Parser YAML + executor de blueprint | 40h |
| `cli` | `ideia env:init`, `ideia env:snapshot`, `ideia env:list` | 16h |

---

### Estudo A4 — Ciclo Completo de Entrega (PR Automation)

#### Contexto
O ciclo completo (branch → code → test → PR → CI → fix → review → merge) é a feature mais valorizada por usuários Devin. IDEIA tem delivery-orchestrator mas sem deploy real.

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `delivery-orchestrator` | Implementar deploy real (GitOps, ArgoCD) | 40h |
| `delivery-orchestrator` | Implementar PR automation (GitHub API, template) | 24h |
| `delivery-orchestrator` | Implementar CI monitoring + auto-fix | 24h |
| `workflow-engine` | Quality gates reais integrados com CI | 16h |
| **Novo: `@ideia/pr-manager`** | Gerenciamento de PR lifecycle | 40h |
| `verification-layer` | Pre-PR verification suite | 16h |

---

### Estudo A5 — Testing Agent Autônomo

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| **Novo: `@ideia/testing-agent`** | Agente de testes autônomo em background | 80h |
| `verification-layer` | Integrar testing agent como suite | 16h |
| **Novo: `@ideia/test-recorder`** | Gravação de vídeo/screenshot de testes | 40h |
| `spec-generator` | Gerar test plans automaticamente | 24h |

---

### Estudo A6 — Conhecimento e Memória Persistentes

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `memory-store` | Adicionar memory layering (4 camadas) | 32h |
| `memory-store` | Adicionar self-compaction (sumarização de contexto) | 24h |
| **Novo: `@ideia/playbooks`** | Playbooks de procedimentos testados | 40h |
| `reality-sync` | Integrar conhecimento com Reality Manifest | 16h |

---

### Estudo A7 — MCP (Model Context Protocol)

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `mcp` | Implementar MCP consumer completo (todos os transports) | 24h |
| `mcp` | Implementar MCP provider (expor serviços IDEIA) | 32h |
| **Novo: `@ideia/mcp-marketplace`** | Marketplace de MCPs (40+ pre-configurados) | 80h |
| `mcp` | Adicionar permission system para MCP tools | 16h |
| `mcp` | Adicionar OAuth support para remote MCPs | 16h |

---

### Estudo A8 — DeepWiki e Documentação Automática

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `docs-generator` | Implementar DeepWiki (auto-documentação de código) | 48h |
| `docs-generator` | Gerar diagramas de arquitetura automáticos | 24h |
| `docs-generator` | Adicionar codebase Q&A (Ask Devin-like) | 40h |
| `reality-sync` | Sincronizar DeepWiki com Reality Manifest | 16h |

---

### Estudo A9 — Planejador-Executor Split

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `agent-runtime` | Implementar planner-executor split | 40h |
| `agent-runtime` | JSON-structured plan como artefato central | 16h |
| `agent-runtime` | Re-plan dinâmico com feedback de execução | 24h |
| `llm-provider` | Adaptive model router (modelo certo para cada sub-tarefa) | 32h |

---

### Estudo A10 — Modelos e Fine-tuning

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `llm-provider` | Adicionar Anthropic Claude provider | 16h |
| `llm-provider` | Adicionar Google Gemini provider | 16h |
| `llm-provider` | Implementar adaptive model router | 32h |
| **Novo: `@ideia/swe-bench`** | Pipeline de avaliação SWE-bench | 80h |

---

### Estudo A11 — Automação de CI/CD e Deploy

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `delivery-orchestrator` | GitOps deployment (ArgoCD/Flux) | 40h |
| `delivery-orchestrator` | Canary release pipeline | 24h |
| `delivery-orchestrator` | Rollback automation | 16h |
| `workflow-engine` | CI integration (GitHub Actions) | 24h |
| `.github/workflows/` | Expandir de 1 para 16 workflows (como ai-devkit-v2) | 16h |

---

### Estudo A12 — Integrações Externas e Fluxo de Trabalho

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `external-connectors` | Implementar Slack integration (comandos !ultra, !fast) | 24h |
| `external-connectors` | Implementar Jira/Linear integration | 24h |
| `external-connectors` | Webhook system para eventos externos | 16h |
| **Novo: `@ideia/dashboard`** | Webapp dashboard de sessões | 40h |

---

### Estudo A13 — Segurança e Governança

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `prompt-security` | OWASP LLM Top 10 implementação completa | 32h |
| `policy-engine` | Context-aware policy rules | 24h |
| `security-middleware` | Rate limiting, request validation, audit enrichment | 16h |
| **Novo: `@ideia/vpc-deploy`** | Enterprise VPC deployment | 40h |
| `policy-engine` | BYOK support | 16h |
| `audit-trail` | Zero-retention mode enterprise | 16h |

---

### Estudo A14 — Arquitetura Multi-Surface

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `cli` | Agente state consistente cross-surface | 32h |
| `ideia-plugin` | Mesma experiência da CLI no Theia | 24h |
| `electron` | Desktop app full-featured | 40h |
| **Novo: `@ideia/sdk`** | SDK para embedding em CI/CD e ferramentas | 80h |

---

### Estudo A15 — Governança de Autonomia

#### Ajustes Necessários na IDEIA

| Pacote | Ajuste | Esforço |
|:-------|:-------|:-------:|
| `policy-engine` | Context-aware autonomy (N0-N4 expandido) | 24h |
| `policy-engine` | Adjustable autonomy por projeto/usuário | 16h |
| `agent-runtime` | Human-in-the-loop com fallback | 24h |
| `audit-trail` | Enterprise session isolation | 16h |

---

## Fase 6: Roteiro de Implementação Prioritizado

### 6.1 Priorização por Impacto e Esforço

```
Alto Impacto
    │
    │  A2 (Multiagente)     A1 (Computer Use)     A4 (PR Automation)
    │  ⚡Esforço: 128h      ⚡188h               ⚡160h
    │  🔴 Crítico           🔴 Crítico           🔴 Crítico
    │
    │  A5 (Testing Agent)   A7 (MCP Marketplace) A9 (Planner-Executor)
    │  ⚡160h               ⚡168h               ⚡112h
    │  🔴 Crítico           🔴 Crítico           🔴 Crítico
    │
    │  A11 (CI/CD Deploy)   A10 (SWE-bench)      A8 (DeepWiki)
    │  ⚡120h               ⚡144h               ⚡128h
    │  🟠 Alto              🟠 Alto             🟠 Alto
    │
    │  A3 (Snapshot/Env)    A6 (Memória)         A12 (Integrações)
    │  ⚡192h               ⚡112h               ⚡104h
    │  🟠 Alto              🟡 Médio             🟡 Médio
    │
    │  A13 (Segurança)      A14 (Multi-Surface)   A15 (Autonomia)
    │  ⚡144h               ⚡176h               ⚡80h
    │  🟡 Médio             🟡 Médio             🟢 Baixo
    │
    └──────────────────────────────────────────────────── Esforço
    Baixo Esforço                                    Alto Esforço
```

### 6.2 Roadmap em Fases

#### Fase 1 — Fundação Multiagente (4 semanas / 240h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P0 | A2 | Orchestrator, Sidekick, sessões filhas, Fusion | 128h |
| P0 | A9 | Planner-Executor split, plano JSON, re-plan | 112h |

#### Fase 2 — Ciclo de Entrega (4 semanas / 320h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P0 | A4 | PR automation, CI monitoring, auto-fix | 160h |
| P0 | A11 | GitOps, canary, rollback, 16 workflows | 120h |
| P1 | A10 | SWE-bench pipeline, adaptive router | 144h |

#### Fase 3 — Computer Use e Testes (4 semanas / 348h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P0 | A1 | Playwright engine, video recording, cookie persistence | 188h |
| P0 | A5 | Testing agent, test plans, skills reutilizáveis | 160h |

#### Fase 4 — MCP e Integrações (3 semanas / 272h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P0 | A7 | MCP marketplace 40+, MCP provider, permission system | 168h |
| P1 | A12 | Slack, Jira, Linear, webhooks | 104h |

#### Fase 5 — Ambiente e Conhecimento (4 semanas / 304h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P1 | A3 | Blueprint, snapshot, Docker sandbox, secrets | 192h |
| P1 | A6 | Memory layering, self-compaction, playbooks | 112h |

#### Fase 6 — Documentação e Qualidade (3 semanas / 272h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P1 | A8 | DeepWiki, diagramas, codebase Q&A | 128h |
| P1 | A13 | OWASP LLM Top 10, VPC, BYOK, compliance | 144h |

#### Fase 7 — Superfície e SDK (4 semanas / 256h)
| Prioridade | Estudo | Tarefas-chave | Esforço |
|:----------:|:------|:--------------|:-------:|
| P2 | A14 | SDKK cross-surface, state consistency | 176h |
| P2 | A15 | Autonomy expandido, adjustable levels | 80h |

### 6.3 Esforço Total Estimado

| Fase | Semanas | Horas | P0 | P1 | P2 |
|:----:|:-------:|:-----:|:--:|:--:|:--:|
| 1 | 4 | 240h | 240h | — | — |
| 2 | 4 | 424h | 280h | 144h | — |
| 3 | 4 | 348h | 348h | — | — |
| 4 | 3 | 272h | 168h | 104h | — |
| 5 | 4 | 304h | — | 304h | — |
| 6 | 3 | 272h | — | 272h | — |
| 7 | 4 | 256h | — | — | 256h |
| **Total** | **26** | **2.116h** | **1.036h** | **824h** | **256h** |

---

## Ajustes Cross-Cutting — Recomendações para Toda a IDEIA

### 1. Arquitetura
- Extrair `cli` (god package) em `orchestrator`, `commands`, `templates`
- Unificar `IDEIA/packages/` e `ai-devkit-v2/packages/` (56 pacotes comuns)
- Remover `ideia-theia/` raiz e manter `IDEIA/packages/ideia-plugin/`
- Remover `theia-app/` raiz e manter `IDEIA/apps/ideia-app/`
- Unificar docs em `docs/` (raiz) e remover `IDEIA/docs/` e `ai-devkit-v2/docs/`

### 2. Qualidade
- Publicar score SWE-bench (requer pipeline de avaliação)
- Expandir cobertura de testes de 30% → 80%
- Implementar quality gates reais no workflow-engine

### 3. Governança
- Adicionar "Playbooks" como formato oficial de procedimentos
- Expandir "Knowledge" com curadoria explícita
- Adicionar "Session Fork Model" ao CLI

### 4. Integração
- Integrar todos os 16 workflows do ai-devkit-v2 no `.github/workflows/`
- Consolidar integrações Slack, Jira, Linear via `external-connectors`
- Implementar MCP marketplace

### 5. Modelo de Negócio
- Manter MIT license (diferencial competitivo)
- Adicionar edição Enterprise com VPC deployment, BYOK, SAML/SSO
- Adicionar telemetria opcional para melhorias (opt-in)

---

## Referências

### Documentação Devin
- [docs.devin.ai — Session Tools](https://docs.devin.ai/work-with-devin/devin-session-tools)
- [docs.devin.ai — Blueprint Reference](https://docs.devin.ai/onboard-devin/environment/blueprint-reference)
- [docs.devin.ai — Computer Use](https://docs.devin.ai/work-with-devin/computer-use)
- [docs.devin.ai — Devin MCP](https://docs.devin.ai/work-with-devin/devin-mcp)
- [docs.devin.ai — CLI Reference](https://docs.devin.ai/cli/reference/commands)
- [docs.devin.ai — Subagents](https://docs.devin.ai/cli/subagents)
- [Cognition — Devin Fusion](https://cognition.com/blog/devin-fusion)
- [Cognition — SWE-1.7](https://cognition.ai/blog/swe-1-7)
- [Cognition — Devin Annual Performance Review 2025](https://cognition.com/blog/devin-annual-performance-review-2025)
- [Cognition — Agentic MapReduce](https://devin.ai/blog/agentic-map-reduce)
- [Cognition — Devin Can Manage Devins](https://cognition.ai/blog/devin-can-now-manage-devins)

### Artigos Acadêmicos
- [SWE-bench (ICLR 2024)](https://arxiv.org/abs/2310.06770)
- [SWE-agent (NeurIPS 2024)](https://arxiv.org/abs/2405.15793)
- [AutoCodeRover (ISSTA 2024)](https://arxiv.org/abs/2404.05427)
- [Agentless (FSE 2025)](https://arxiv.org/abs/2407.01489)
- [CodeMonkeys (2025)](https://arxiv.org/abs/2501.14723)
- [OpenHands SDK (MLSys 2026)](https://arxiv.org/abs/2511.03690)

### Análises de Mercado
- [datarekha.com — Devin Architecture Anatomised](https://datarekha.com/blog/devin-architecture-anatomy/)
- [Ry Walker — Devin Research](https://rywalker.com/research/devin-cognition)
- [eesel.ai — Devin Fusion Analysis](https://www.eesel.ai/blog/devin-fusion)
- [automationatlas.io — Devin](https://automationatlas.io/tools/devin/)
- [the-agent-report.com — Devin $26B](https://the-agent-report.com/2026/06/cognition-devin-1b-26b-valuation-june-2026/)
- [eesel.ai — Factory AI](https://www.eesel.ai/blog/factory-ai)

---

## Apêndice A — Plano de Execução Detalhado com Prompts

> **⚠️ DIRETIVA FUNDAMENTAL: `IDEIA/` é a ÚNICA base de código alvo.**
> Todo desenvolvimento, correção, migração e evolução acontece exclusivamente em `F:\PROJETOS\ai-devkit-workspace\IDEIA\`.
> O diretório `ai-devkit-v2/` é **fonte de ativos a serem migrados**, mas nunca alvo de edições.
> `legacy/` é **fonte de referência histórica** para consulta.
> `ideia-theia/`, `theia-app/`, `electron-app/` da raiz serão **eliminados** após migração completa para `IDEIA/`.

### A.1 Inventário de Migração ai-devkit-v2 → IDEIA/

#### A.1.1 O que MIGRAR (copiar para IDEIA/ com adaptações)

| # | Ativo | Origem | Destino em IDEIA/ | Ação |
|:-:|:------|:-------|:------------------|:-----|
| M01 | web-ui (React+Vite) | `ai-devkit-v2/packages/web-ui/` | `IDEIA/packages/web-ui/` | Copiar, renomear `@ai-devkit/web-ui` → `@ideia/web-ui`, ajustar imports |
| M02 | e2e-tests (Playwright) | `ai-devkit-v2/packages/e2e-tests/` | `IDEIA/packages/e2e-tests/` | Copiar, renomear escopo npm |
| M03 | 16 GitHub Workflows | `ai-devkit-v2/.github/workflows/` | `IDEIA/.github/workflows/` | Copiar (não sobrescrever ci.yml existente, mesclar) |
| M04 | Contratos JSON Schema | `ai-devkit-v2/contracts/` | `IDEIA/docs/api/` ou `IDEIA/packages/contracts/` | Copiar 4 schemas (audit, session, task, workspace) |
| M05 | Prompts de agente | `ai-devkit-v2/prompts/` | `IDEIA/.ai/prompts/` | Copiar 8 prompts, adaptar referências @ai-devkit → @ideia |
| M06 | Políticas de segurança | `ai-devkit-v2/policies/` | `IDEIA/.ai/policies/` | Copiar security.policy.yaml |
| M07 | Scripts de auditoria | `ai-devkit-v2/scripts/audit/` | `IDEIA/scripts/audit/` | Copiar 12 scripts, adaptar paths |
| M08 | Scripts de benchmark | `ai-devkit-v2/scripts/benchmark/` | `IDEIA/scripts/benchmark/` | Copiar 4 scripts |
| M09 | Scripts raiz (22) | `ai-devkit-v2/scripts/*.ts` | `IDEIA/scripts/` | Copiar seletivamente (canary-publish, check-*, compliance, etc.) |
| M10 | Memória de IA | `ai-devkit-v2/memory/` | `IDEIA/.ai/memory/` | Copiar decisions.json, memory.json (fundir) |
| M11 | Docs governança (33) | `ai-devkit-v2/docs/governance/` | `IDEIA/docs/governance/` | Copiar docs não existentes, fundir com existentes |
| M12 | Docs estudos | `ai-devkit-v2/docs/ESTUDOS/` | `IDEIA/docs/ESTUDOS/` | Copiar 14 estudos com subdiretórios |
| M13 | Planos de estudo (71) | `ai-devkit-v2/plans/estudos/` | `IDEIA/docs/ESTUDOS/` | Copiar documentos numerados |
| M14 | Docs temáticos (7 áreas) | `ai-devkit-v2/docs/01-fundamentos/` a `07-consolidacao/` | `IDEIA/docs/` | Copiar estrutura temática |
| M15 | Testes integração/perf | `ai-devkit-v2/tests/` | `IDEIA/tests/` | Copiar |
| M16 | CLAUDE.md, GEMINI.md | `ai-devkit-v2/CLAUDE.md`, `GEMINI.md` | `IDEIA/` | Copiar (config para IAs específicas) |
| M17 | 93 scripts acceleration | `ai-devkit-v2/scripts/acceleration/` | `IDEIA/packages/acceleration/` | Copiar como novo pacote |
| M18 | API approval | `ai-devkit-v2/apps/api/` | **NÃO COPIAR** | Theia backend substitui |

#### A.1.2 O que ELIMINAR (após migração)

| # | Diretório | Motivo |
|:-:|:----------|:-------|
| E01 | `ideia-theia/` (raiz) | Migrado para `IDEIA/packages/ideia-plugin/` |
| E02 | `theia-app/` (raiz) | Migrado para `IDEIA/apps/ideia-app/` |
| E03 | `electron-app/` (raiz) | Migrado para `IDEIA/electron/` |
| E04 | `mockup/` (raiz) | Migrado para `IDEIA/mockup/` |
| E05 | `lib/` (raiz) | Resquício sem função — deletar |
| E06 | `src-gen/` (raiz) | Duplicata de `IDEIA/src-gen/` — deletar |
| E07 | `ai-devkit-v2/` | Todo o diretório — após migração completa |
| E08 | `legacy/` | Manter como arquivo histórico (não deletar) |

### A.2 Fases de Execução com Prompts Detalhados

> Cada prompt abaixo é auto-contido. Um modelo fraco pode executá-lo sequencialmente sem conhecimento prévio. Siga A ORDEM. Não pule passos.

---

#### FASE-EX-00: Setup do Ambiente de Migração

**Objetivo:** Preparar o ambiente para receber as migrações.

**Duração:** 1h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE CÓDIGO.

TAREFA: Preparar o diretório IDEIA/ para receber ativos do ai-devkit-v2.

PASSO 1: Verifique se os seguintes diretórios existem em F:\PROJETOS\ai-devkit-workspace\IDEIA\:
- .github/workflows/ (se não existir, crie)
- scripts/audit/ (se não existir, crie)
- scripts/benchmark/ (se não existir, crie)
- tests/integration/ (se não existir, crie)
- tests/performance/ (se não existir, crie)
- .ai/prompts/ (se não existir, crie)
- .ai/policies/ (se não existir, crie)
- .ai/memory/ (se não existir, crie)
- docs/api/ (se não existir, crie)

PASSO 2: Leia o arquivo F:\PROJETOS\ai-devkit-workspace\IDEIA\package.json e verifique se os workspaces incluem "packages/*" e "apps/*".

PASSO 3: Verifique se o tsconfig.json em IDEIA/ inclui todos os packages como project references. Liste quais faltam.

PASSO 4: Reporte o resultado em formato:

## Relatório de Setup
### Diretórios criados: [lista]
### Workspaces configurados: [sim/não]
### Project references faltantes: [lista ou "nenhuma"]
```

---

#### FASE-EX-01: Migração de Workflows GitHub (17 workflows)

**Objetivo:** Trazer os 17 workflows do ai-devkit-v2 para IDEIA/.

**Duração:** 2h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE GITHUB ACTIONS.

CONTEXTO: O diretório F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\.github\workflows\ contém 17 workflows de CI/CD.
O diretório F:\PROJETOS\ai-devkit-workspace\IDEIA\.github\workflows\ já contém 1 workflow (ci.yml).
A IDEIA está em F:\PROJETOS\ai-devkit-workspace\IDEIA\ e é o projeto alvo.

PASSO 1: Liste todos os arquivos em ai-devkit-v2\.github\workflows\
PASSO 2: Para cada workflow, leia o conteúdo e verifique se faz referência a:
  - Paths que começam com "ai-devkit-v2/" → substituir por "IDEIA/"
  - Paths que começam com "packages/" → manter como está
  - Escopo @ai-devkit/* → substituir por @ideia/*
  - Diretório de trabalho (working-directory) que aponte para ai-devkit-v2
PASSO 3: Copie cada workflow para IDEIA/.github/workflows/, aplicando as substituições.
PASSO 4: NÃO sobrescreva o ci.yml existente — funda os jobs se necessário.

IMPORTANTE: Preserve a estrutura YAML original. Apenas ajuste paths e escopos.

Reporte: [workflow] → [copiado/ignorado] + [alterações feitas]
```

---

#### FASE-EX-02: Migração de Schemas JSON (4 schemas)

**Objetivo:** Copiar schemas de contrato do ai-devkit-v2.

**Duração:** 30min

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE SCHEMAS.

PASSO 1: Leia os 4 arquivos em F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\contracts\
PASSO 2: Copie cada um para F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\api\
PASSO 3: Verifique se o schema faz referência a "$id" ou "$ref" com URL contendo "ai-devkit" — substitua por "ideia"
PASSO 4: Adicione uma entrada em F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\api\README.md listando:
  - audit.schema.json — Schema de trilha de auditoria
  - session.schema.json — Schema de sessão de agente
  - task.schema.json — Schema de tarefa
  - workspace.schema.json — Schema de workspace

Reporte: [arquivo] → [copiado] + [alterações]
```

---

#### FASE-EX-03: Migração de Prompts (8 arquivos)

**Objetivo:** Copiar e adaptar os 8 prompts de agente.

**Duração:** 1h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE PROMPTS.

PASSO 1: Leia cada um dos 8 arquivos em F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\prompts\
PASSO 2: Para cada arquivo:
  2.1: Substitua "ai-devkit" por "IDEIA" (maiúsculas conforme contexto)
  2.2: Substitua "@ai-devkit" por "@ideia"
  2.3: Substitua "AI-Devkit" por "IDEIA"
  2.4: Ajuste paths de docs/ se mencionados
PASSO 3: Salve em F:\PROJETOS\ai-devkit-workspace\IDEIA\.ai\prompts\

Mantenha a estrutura de diretórios. Se houver subdiretórios em prompts/, recrie em IDEIA/.ai/prompts/.

Reporte: [arquivo original] → [arquivo destino] + [alterações feitas]
```

---

#### FASE-EX-04: Migração de Políticas e Memória

**Objetivo:** Copiar security.policy.yaml e memória de IA.

**Duração:** 30min

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO.

PASSO 1: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\policies\security.policy.yaml para F:\PROJETOS\ai-devkit-workspace\IDEIA\.ai\policies\
PASSO 2: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\memory\decisions.json para F:\PROJETOS\ai-devkit-workspace\IDEIA\.ai\memory\
PASSO 3: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\memory\memory.json para F:\PROJETOS\ai-devkit-workspace\IDEIA\.ai\memory\
PASSO 4: Se já existirem arquivos com o mesmo nome em IDEIA/.ai/memory/, faça o merge:
  4.1: Leia ambos os JSONs
  4.2: Combine arrays únicos (sem duplicar entradas)
  4.3: Salve como arquivo único

Reporte: [arquivo] → [copiado/merged] + [tamanho final]
```

---

#### FASE-EX-05: Migração de Scripts de Auditoria (12 + 4 + 22)

**Objetivo:** Copiar scripts de auditoria, benchmark e raiz.

**Duração:** 2h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE SCRIPTS.

CONTEXTO: Três grupos de scripts para copiar de ai-devkit-v2/ para IDEIA/:

GRUPO A — Auditoria (12 scripts em ai-devkit-v2/scripts/audit/)
GRUPO B — Benchmark (4 scripts em ai-devkit-v2/scripts/benchmark/)
GRUPO C — Raiz (22 scripts .ts em ai-devkit-v2/scripts/*.ts)

PASSO 1: Para cada script no GRUPO A:
  1.1: Leia o arquivo
  1.2: Substitua "@ai-devkit" por "@ideia"
  1.3: Substitua "ai-devkit-v2/" por "IDEIA/" em paths
  1.4: Copie para F:\PROJETOS\ai-devkit-workspace\IDEIA\scripts\audit\

PASSO 2: Para cada script no GRUPO B: mesmo procedimento, copie para IDEIA/scripts/benchmark/

PASSO 3: Para cada script no GRUPO C:
  3.1: Leia o arquivo
  3.2: Substitua referências de escopo e paths
  3.3: Copie para F:\PROJETOS\ai-devkit-workspace\IDEIA\scripts\
  3.4: NÃO copie se for redundante com script existente em IDEIA/

PASSO 4: Atualize o package.json de IDEIA/ adicionando scripts npm correspondentes:
  4.1: "lint:fix": "eslint \"packages/*/src/**/*.ts\" --fix"
  4.2: "test:cov": "jest --coverage"
  4.3: "test:e2e": "jest --config jest.e2e.config.js"
  4.4: Adicione outros conforme os scripts migrados

Reporte: [grupo] → [N copiados] + [N ignorados] + [motivo]
```

---

#### FASE-EX-06: Migração de Documentação de Governança

**Objetivo:** Copiar e fundir 33 documentos de governança.

**Duração:** 3h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE DOCUMENTAÇÃO.

CONTEXTO: 
- Origem: F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\docs\governance\ (33 arquivos)
- Destino: F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\governance\ (já tem 3 arquivos)
- Docs existentes em IDEIA: document-registry.md, REALITY-MANIFEST.md, RELATORIO-VALIDACAO-FINAL.md

PASSO 1: Liste os 33 arquivos de origem.
PASSO 2: Para cada arquivo:
  2.1: Se NÃO existir no destino → copie diretamente
  2.2: Se existir no destino → leia ambos, verifique se são diferentes
    2.2.1: Se idênticos → ignore
    2.2.2: Se diferentes → faça merge manual (preserve conteúdo de ambos, marque seções conflitantes)
  2.3: Substitua "ai-devkit" por "IDEIA" (contextual)
  2.4: Substitua "@ai-devkit" por "@ideia"

PASSO 3: Atualize o document-registry.md de IDEIA/docs/governance/ adicionando entradas para os novos documentos. Use o formato:
  - [nome-do-arquivo](./nome-do-arquivo) — Descrição curta

PASSO 4: Atualize também o .ai/governance/document-registry.md (se existir) com as mesmas entradas.

Reporte: [N copiados] + [N merged] + [N ignorados] + [N atualizados no registry]
```

---

#### FASE-EX-07: Migração de Estudos e Planos

**Objetivo:** Copiar estudos do ai-devkit-v2 para a documentação da IDEIA.

**Duração:** 4h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE DOCUMENTAÇÃO TÉCNICA.

CONTEXTO:
- ai-devkit-v2/docs/ESTUDOS/ contém 14 documentos com subdiretórios G1-G7 e OP1-OP7
- ai-devkit-v2/plans/estudos/ contém 71 documentos numerados (00-INDICE.md a 60-TESTES-CARGA-IDE.md + meta)
- ai-devkit-v2/docs/01-fundamentos/ a 07-consolidacao/ contém documentação temática
- Destino: F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\

PASSO 1: Verifique se IDEIA/docs/ESTUDOS/ existe. Se não, crie.
PASSO 2: Copie TODO o conteúdo de ai-devkit-v2/docs/ESTUDOS/ para IDEIA/docs/ESTUDOS/
PASSO 3: Crie IDEIA/docs/PLANOS/ e copie ai-devkit-v2/plans/estudos/ para lá
PASSO 4: Crie IDEIA/docs/ e copie as pastas 01-fundamentos a 07-consolidacao (se existirem)
PASSO 5: Para cada documento copiado, substitua "ai-devkit" por "IDEIA"

PASSO 6: Atualize IDEIA/docs/ESTUDOS/IDEIA-MASTER.md (se existir) adicionando referências aos novos estudos.
Se não existir, crie um índice:

# Índice de Estudos — IDEIA
## Estudos Migrados do ai-devkit-v2
### Gaps (G1-G7)
- G1: [nome] — [descrição]
...

### Oportunidades (OP1-OP7)
...

### Planos Numerados
- 00-INDICE.md — Índice geral
...

Reporte: [origem] → [destino] + [N arquivos copiados]
```

---

#### FASE-EX-08: Migração do web-ui (React+Vite)

**Objetivo:** Trazer o frontend React do ai-devkit-v2 para a IDEIA.

**Duração:** 8h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE FRONTEND.

TAREFA: Migrar o pacote web-ui de ai-devkit-v2 para IDEIA como um pacote opcional (não substitui Theia).

PASSO 1: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\packages\web-ui\ para F:\PROJETOS\ai-devkit-workspace\IDEIA\packages\web-ui\

PASSO 2: Edite IDEIA/packages/web-ui/package.json:
  2.1: Altere "name" de "@ai-devkit/web-ui" para "@ideia/web-ui"
  2.2: Altere "description" para "IDEIA Web UI - Frontend React para a plataforma IDEIA"
  2.3: Mantenha as mesmas dependências

PASSO 3: Edite TODOS os arquivos .ts, .tsx em IDEIA/packages/web-ui/src/:
  3.1: Substitua "@ai-devkit" por "@ideia" em todos os imports
  3.2: Substitua "ai-devkit" por "IDEIA" em textos (títulos, descrições, constantes)

PASSO 4: Verifique se IDEIA/tsconfig.json já referencia "packages/web-ui". Se não, ADICIONE:
  { "path": "packages/web-ui" }

PASSO 5: Verifique se IDEIA/package.json já inclui web-ui nos workspaces. O workspace "packages/*" já cobre.

PASSO 6: Execute o build para verificar se compila:
  cd F:\PROJETOS\ai-devkit-workspace\IDEIA\packages\web-ui
  npx tsc --noEmit

Se houver erros:
  6.1: Leia cada erro
  6.2: Corrija imports quebrados
  6.3: Reexecute até passar

Reporte: [sucesso/erro] + [N arquivos alterados] + [N erros corrigidos]
```

---

#### FASE-EX-09: Migração de e2e-tests (Playwright)

**Objetivo:** Trazer testes E2E para a IDEIA.

**Duração:** 2h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE TESTES.

TAREFA: Migrar o pacote e2e-tests de ai-devkit-v2 para IDEIA.

PASSO 1: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\packages\e2e-tests\ para F:\PROJETOS\ai-devkit-workspace\IDEIA\packages\e2e-tests\

PASSO 2: Edite IDEIA/packages/e2e-tests/package.json:
  2.1: Altere "name" de "@ai-devkit/e2e-tests" para "@ideia/e2e-tests"
  2.2: Altere "description" para "IDEIA E2E Tests — fluxo completo integrado"

PASSO 3: Edite TODOS os arquivos .ts no pacote:
  3.1: Substitua "@ai-devkit" por "@ideia" em todos os imports
  3.2: Substitua referências a "ai-devkit-v2" por "IDEIA"

PASSO 4: Leia o playwright.config.ts e verifique se as URLs e paths estão corretos para IDEIA/
  4.1: Ajuste baseURL se necessário
  4.2: Ajuste testDir se necessário

PASSO 5: Adicione em IDEIA/package.json o script:
  "test:e2e": "cd packages/e2e-tests && npx playwright test"

Reporte: [sucesso] + [N arquivos alterados]
```

---

#### FASE-EX-10: Migração de Acceleration Engine (93 scripts)

**Objetivo:** Copiar a engine de aceleração como novo pacote.

**Duração:** 4h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE CÓDIGO.

CONTEXTO: O diretório ai-devkit-v2/scripts/acceleration/ contém 93 scripts TypeScript
que formam uma "engine de aceleração" com planner, optimizer, executor, classifier, etc.
Este conteúdo deve ser migrado como um novo pacote @ideia/acceleration.

PASSO 1: Crie o diretório F:\PROJETOS\ai-devkit-workspace\IDEIA\packages\acceleration\

PASSO 2: Crie IDEIA/packages/acceleration/package.json:

{
  "name": "@ideia/acceleration",
  "version": "1.0.0-alpha.0",
  "description": "IDEIA Acceleration Engine — planner, optimizer, executor, classifier",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.4.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}

PASSO 3: Crie IDEIA/packages/acceleration/tsconfig.json:
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}

PASSO 4: Copie TODOS os 93 scripts .ts de ai-devkit-v2/scripts/acceleration/ para IDEIA/packages/acceleration/src/
  Exclua os arquivos .test.ts (cuidado para manter, serão usados como testes)

PASSO 5: Crie IDEIA/packages/acceleration/src/index.ts que exporte os principais módulos:
  export * from './engine';
  export * from './planner';
  export * from './executor';
  export * from './optimizer';
  // ... adicione conforme necessário

PASSO 6: Edite TODOS os arquivos .ts copiados:
  6.1: Substitua "@ai-devkit" por "@ideia" em imports
  6.2: Ajuste paths relativos se quebrados

PASSO 7: Adicione em IDEIA/tsconfig.json:
  { "path": "packages/acceleration" }

PASSO 8: Execute:
  cd F:\PROJETOS\ai-devkit-workspace\IDEIA
  npx tsc --noEmit

Corrija erros até passar.

Reporte: [sucesso/erro] + [N scripts copiados] + [N erros corrigidos]
```

---

#### FASE-EX-11: Migração de Testes (integration + performance)

**Objetivo:** Copiar testes do ai-devkit-v2.

**Duração:** 1h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO DE TESTES.

PASSO 1: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\tests\integration\ para F:\PROJETOS\ai-devkit-workspace\IDEIA\tests\integration\
PASSO 2: Copie F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\tests\performance\ para F:\PROJETOS\ai-devkit-workspace\IDEIA\tests\performance\
PASSO 3: Edite cada arquivo .ts copiado substituindo "@ai-devkit" por "@ideia"
PASSO 4: Edite cada arquivo .js (load-test.js, stress-test.js) substituindo "ai-devkit" por "IDEIA"

Reporte: [N arquivos copiados]
```

---

#### FASE-EX-12: Migração de Configs de IA (CLAUDE.md, GEMINI.md)

**Objetivo:** Copiar instruções para IAs específicas.

**Duração:** 30min

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE MIGRAÇÃO.

PASSO 1: Leia F:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\CLAUDE.md
PASSO 2: Edite o conteúdo:
  2.1: Substitua "ai-devkit-project" por "IDEIA"
  2.2: Substitua "nestjs" por "Theia Platform"
  2.3: Substitua "nextjs" por "Theia + React"
  2.4: Substitua referências a "ai-devkit" por "IDEIA"
PASSO 3: Salve em F:\PROJETOS\ai-devkit-workspace\IDEIA\CLAUDE.md
PASSO 4: Repita o mesmo para GEMINI.md
PASSO 5: Verifique se IDEIA/AGENTS.md já existe — ele já contém as regras principais. CLAUDE.md e GEMINI.md são complementos específicos para cada ferramenta.

Reporte: [CLAUDE.md → IDEIA/CLAUDE.md] + [GEMINI.md → IDEIA/GEMINI.md]
```

---

#### FASE-EX-13: Limpeza Pós-Migração

**Objetivo:** Remover diretórios redundantes após migração completa.

**Duração:** 1h

**Prompt para execução:**

```
VOCÊ É UM ASSISTENTE DE LIMPEZA DE CÓDIGO.

ATENÇÃO: Execute este prompt SOMENTE após todas as FASE-EX-00 a FASE-EX-12 estarem completas.

PASSO 1: Verifique se os seguintes diretórios em F:\PROJETOS\ai-devkit-workspace\ podem ser removidos:
  - ideia-theia/ → Verifique se IDEIA/packages/ideia-plugin/ existe e está funcional
  - theia-app/ → Verifique se IDEIA/apps/ideia-app/ existe e está funcional
  - electron-app/ → Verifique se IDEIA/electron/ existe e está funcional
  - mockup/ → Verifique se IDEIA/mockup/ existe
  - lib/ → Verifique se IDEIA/lib/ existe
  - src-gen/ → Verifique se IDEIA/src-gen/ existe

PASSO 2: Para cada diretório a remover:
  2.1: Leia o conteúdo do diretório
  2.2: Verifique se NENHUM arquivo é referenciado por outros diretórios (grep por paths)
  2.3: Se seguro, mova para uma pasta temporária: F:\PROJETOS\ai-devkit-workspace\_to_delete\
  (NÃO delete definitivamente — mova para _to_delete por segurança)

PASSO 3: NÃO remova ai-devkit-v2/ nem legacy/ — eles permanecem como fonte/referência até nova ordem.

PASSO 4: Crie um arquivo F:\PROJETOS\ai-devkit-workspace\MIGRATION-LOG.md documentando:
  - Data da migração
  - Diretórios removidos
  - Diretórios preservados
  - Status de cada FASE-EX

Reporte: [N diretórios movidos para _to_delete] + [N preservados]
```

---

### A.3 Script Principal de Orquestração

Para automação completa das fases acima, crie um orquestrador em `IDEIA/scripts/migrate-ai-devkit-to-ideia.js`:

```javascript
/**
 * Orquestrador de Migração ai-devkit-v2 → IDEIA
 * 
 * Uso: node scripts/migrate-ai-devkit-to-ideia.js [--dry-run] [--fase EX-01,EX-02,...]
 * 
 * --dry-run: apenas mostra o que seria feito
 * --fase: executa apenas fases específicas (padrão: todas)
 */
const phases = [
  { id: 'EX-00', name: 'Setup Ambiente', file: './scripts/migration/fase-00-setup.js' },
  { id: 'EX-01', name: 'Workflows GitHub', file: './scripts/migration/fase-01-workflows.js' },
  { id: 'EX-02', name: 'Schemas JSON', file: './scripts/migration/fase-02-schemas.js' },
  { id: 'EX-03', name: 'Prompts', file: './scripts/migration/fase-03-prompts.js' },
  { id: 'EX-04', name: 'Políticas e Memória', file: './scripts/migration/fase-04-policies.js' },
  { id: 'EX-05', name: 'Scripts', file: './scripts/migration/fase-05-scripts.js' },
  { id: 'EX-06', name: 'Docs Governança', file: './scripts/migration/fase-06-governance.js' },
  { id: 'EX-07', name: 'Estudos e Planos', file: './scripts/migration/fase-07-studies.js' },
  { id: 'EX-08', name: 'Web UI', file: './scripts/migration/fase-08-webui.js' },
  { id: 'EX-09', name: 'E2E Tests', file: './scripts/migration/fase-09-e2e.js' },
  { id: 'EX-10', name: 'Acceleration Engine', file: './scripts/migration/fase-10-acceleration.js' },
  { id: 'EX-11', name: 'Tests Integration/Perf', file: './scripts/migration/fase-11-tests.js' },
  { id: 'EX-12', name: 'Configs IA', file: './scripts/migration/fase-12-ai-configs.js' },
  { id: 'EX-13', name: 'Limpeza', file: './scripts/migration/fase-13-cleanup.js' },
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const selectedPhases = args.find(a => a.startsWith('--fase='))?.split('=')[1]?.split(',') || [];
  
  const toRun = selectedPhases.length > 0 
    ? phases.filter(p => selectedPhases.includes(p.id))
    : phases;

  for (const phase of toRun) {
    console.log(`\n=== FASE ${phase.id}: ${phase.name} ===`);
    if (dryRun) {
      console.log(`  [DRY-RUN] Executaria: node ${phase.file}`);
    } else {
      try {
        require(phase.file);
        console.log(`  ✅ Completa`);
      } catch (err) {
        console.error(`  ❌ Erro: ${err.message}`);
      }
    }
  }
}

main();
```

---

### A.4 Verificação Pós-Migração

Após todas as fases, execute:

```bash
cd F:\PROJETOS\ai-devkit-workspace\IDEIA

# 1. Tipo-check em todo o projeto
npx tsc --noEmit

# 2. Testes
npx jest --passWithNoTests

# 3. Build dos pacotes
npx tsc -b

# 4. Verificação de integridade
node scripts/verify-migration.js

# 5. Reality check
cd F:\PROJETOS\ai-devkit-workspace
powershell -File scripts/reality-check.ps1 -Full
```

---

## Apêndice B — Instruções para Modelos Fracos

### B.1 Estratégia de Decomposição

Cada tarefa neste documento foi decomposta para que modelos com janela de contexto limitada (8K-32K tokens) possam executar:

1. **Uma fase por execução**: nunca execute 2 fases no mesmo prompt
2. **Um prompt por execução**: cada prompt no Apêndice A é auto-contido
3. **Contexto inline**: todo prompt inclui paths absolutos e instruções completas — não depende de memória de sessão anterior
4. **Formato de saída estruturado**: todo prompt termina com "Reporte: [formato]" para garantir saída parseável
5. **Verificação explícita**: cada passo termina com "Verifique se..." — não assuma que deu certo

### B.2 Template para Criar Novos Prompts

Quando precisar criar um novo prompt para modelo fraco, use este template:

```
VOCÊ É UM [PAPEL] ASSISTENTE DE [AÇÃO].

TAREFA: [descrição clara em 1 frase]

CONTEXTO:
- Path de origem: [path completo]
- Path de destino: [path completo]
- Arquivos envolvidos: [lista]
- Substituições necessárias: [padrões de substituição]

PASSO 1: [ação concreta com path absoluto]
PASSO 2: [ação concreta com path absoluto]
...
PASSO N: [verificação]

IMPORTANTE: [1-2 regras críticas]

Reporte: [formato estruturado de saída]
```

### B.3 Lista de Substituições Obrigatórias

Sempre que migrar conteúdo de ai-devkit-v2 para IDEIA, aplique estas substituições:

| Padrão Original | Substituir por |
|:----------------|:---------------|
| `@ai-devkit/` | `@ideia/` |
| `ai-devkit-project` | `IDEIA` |
| `AI-Devkit` | `IDEIA` |
| `ai-devkit-v2/` | `IDEIA/` (em paths) |
| `"ai-devkit"` (em descrições) | `"IDEIA"` |
| `nestjs` (stack) | `Theia Platform` |
| `nextjs` (frontend) | `Theia + React` |

---

*Este documento é vivo — atualizado conforme o avanço das migrações e implementações. Cada estudo A1-A15 deve ser expandido em documento próprio. O Apêndice A contém o roteiro executável imediato.*
