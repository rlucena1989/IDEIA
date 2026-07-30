# Glossário IDEIA

Definições dos principais termos, siglas e conceitos do ecossistema IDEIA.

---

## A

### ADR (Architecture Decision Record)
Registro formal de decisões arquiteturais, documentando contexto, opções consideradas e justificativa. Armazenado em `docs/adr/`.

### Agent Runtime
Camada de execução de agentes responsável por interpretar planos e executar passos (read, write, run, search). Implementa `FileSystemStepExecutor`.

### Autonomy Level (N0–N4)
Níveis de autonomia do sistema: N0 (Assistido — apenas sugestões), N1 (Supervisionado — aprovação por passo), N2 (Semi-autônomo — revisão de módulos), N3 (Autônomo — entrega de features), N4 (Total — ciclo de vida completo).

### Auto-Intensifier
Componente que escaneia automaticamente documentos de estudo em busca de gaps e gera scripts helper para correção assistida por IA.

---

## B

### BHP (Backpressure Heartbeat Protocol)
Mecanismo de controle de fluxo em streams SSE que combina heartbeats periódicos (15s) com backpressure (limite de 50 eventos) e timeout via AbortController (120s).

---

## C

### C1–C18 (Contract Clauses)
Dezoito cláusulas de contrato entre módulos do sistema, documentadas nos estudos de empilhamento (S10/S10v2). Definem SLOs, responsabilidades e interfaces formais.

### Cedar Policy
Motor de autorização baseado em políticas (utilizado na camada de segurança). Atualmente documentado como gap arquitetural para fases futuras.

### Chat Service
Serviço de chat unificado com suporte a múltiplos provedores de LLM (Ollama, OpenAI, DeepSeek) e fallback automático entre eles.

### Circuit Breaker
Padrão de resiliência que interrompe operações após falhas consecutivas, permitindo recuperação automática após intervalo configurado.

### Context Engine
Motor que entrega contexto estruturado do projeto para IAs, incluindo manifesto de realidade, gaps conhecidos e histórico de decisões.

### Control Tower
Dashboard centralizado para monitoramento de agentes, atividades em tempo real, uso de recursos e saúde do sistema.

---

## D

### DAP (Debug Adapter Protocol)
Protocolo de depuração implementado via WebSocket (`/dap` endpoint), com DebugPanel suportando breakpoints, step-through, pilha de chamadas, variáveis e REPL.

### DDD (Domain-Driven Design)
Abordagem de design onde o domínio do problema é modelado explicitamente no código, com entidades, value objects, agregados e eventos de domínio.

### Delivery Orchestrator
Orquestrador de entrega que coordena pipeline de verificação, quality gates e deploy automatizado.

### DSL (Domain-Specific Language)
Linguagem específica de domínio usada internamente para definição de workflows e políticas.

---

## E

### E-Stop (Emergency Stop)
Mecanismo de parada de emergência que interrompe execuções de agentes em andamento, preservando consistência do estado.

### Event Bus
Barramento de eventos baseado em Pub/Sub (atualmente in-memory; NATS JetStream planejado). Todo evento cruza o barramento — não há chamadas diretas entre módulos.

---

## G

### GAPS-PRODUCAO-IDE
Catálogo central de gaps entre o estado atual e o planejado. 60 gaps documentados, 57 resolvidos. Mantido em `docs/governance/GAPS-PRODUCAO-IDE.md`.

### Guard Pipeline
Pipeline de segurança que classifica, filtra e protege prompts antes de chegarem à IA. Etapas: Guard → Classify → Enrich → Optimize → Plan → Format.

---

## I

### IDEIA
Acrônimo recursivo: **IDEIA: Development Environment for Intelligent Agents**. Plataforma que transforma descrições em sistemas completos através de agentes autônomos.

### Initiative Engine
Motor que converte intenções classificadas em planos de execução estruturados, com resolução de dependências e priorização.

### Intent Classifier
Classificador de intenções que categoriza prompts em: feature, bugfix, refactor, question, documentation, security, performance, e outros.

---

## K

### Knowledge Graph
Grafo de conhecimento que relaciona entidades do projeto (módulos, interfaces, dependências, decisões) para navegação semântica.

### Knowledge Index
Índice pesquisável de alto desempenho para todo o conhecimento do projeto. Acessado via `ai-devkit context search <term>`.

---

## L

### Learning Engine
Motor de aprendizado adaptativo que analisa feedback de execuções anteriores para melhorar sugestões futuras, incluindo padrões cross-projeto.

### LSP (Language Server Protocol)
Protocolo de servidor de linguagem implementado com 8 providers: completion, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename. Suporte a TypeScript, JavaScript, Python, CSS, HTML.

---

## M

### MCP (Model Context Protocol)
Protocolo padronizado para interação multi-modelo, definindo interfaces de ferramentas que agentes podem expor e consumir.

### Mem0
Sistema de memória semântica com perfilamento de usuário, armazenamento de preferências e recuperação contextual via SQLite+FTS5.

### Multiagent Orchestration
Orquestração de múltiplos agentes especializados (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) que colaboram para entregar sistemas completos.

---

## N

### NATS JetStream
Sistema de mensageria distribuída planejado como backbone do barramento de eventos (Pub/Sub, Req/Rep, KV, DLQ). Atualmente gap arquitetural para Fase 1.

---

## O

### OpenVSX
Registro de extensões open-source compatível com VS Code, utilizado como marketplace de extensões no ambiente Theia.

### Output Validation
Camada de validação que escaneia saídas geradas contra 31 padrões de PII (CPF, SSN, IBAN, cartão de crédito, etc.), comandos perigosos e extensões de arquivo não permitidas.

---

## P

### Pattern Detector
Detector de padrões que identifica estruturas recorrentes no código e sugere refatorações ou aplicação de design patterns.

### Pipeline de Prompt
Pipeline automático que processa toda entrada do usuário: guard → classificação → enriquecimento → otimização → plano → formato compacto.

### Policy Engine
Motor de políticas que avalia e aplica 27 regras de segurança (Linux + Windows + PowerShell), com políticas externalizadas em YAML.

### Pre-flight Hook
Hook de validação executado antes de qualquer operação CLI. Bloqueia execuções se o contexto do projeto estiver dessincronizado.

### Profiles
Sistema de perfis de usuário que define habilidades, limites de recurso e nível de autonomia por agente.

### Prompt Pipeline
Fluxo completo de processamento do prompt do usuário até a execução pela IA, incluindo guard, classificação, enriquecimento, otimização e plano.

### PTY (Pseudo Terminal)
Terminal interativo baseado em node-pty + xterm.js, oferecendo shell completo com suporte a processos longos, cores e atalhos.

---

## R

### RAG (Retrieval-Augmented Generation)
Técnica de augmentação de geração por recuperação de contexto relevante de fontes locais (documentação, código, decisões arquiteturais).

### Reality Enforcement System
Sistema de imposição de realidade que garante que documentação reflita o código. Componentes: REALITY-MANIFEST.md, reality-check, sync-docs, audit-daemon.

### Reality Sync
Mecanismo de sincronização automática entre documentação e código, com detecção de drift e atualização bidirecional.

### Red Teaming
Testes automatizados de segurança que simulam ataques ao sistema para identificar vulnerabilidades em prompts, políticas e validações.

---

## S

### Safety Circuit
Circuito de segurança composto por sandbox (`vm.Script` isolado), validação de saída (31 padrões), detecção de padrões perigosos e verificação de extensões.

### Schema Registry
Registro centralizado de schemas que define contratos de DTOs e eventos, garantindo compatibilidade entre módulos.

### SLO (Service Level Objective)
Objetivo de nível de serviço definido para contratos entre módulos, incluindo métricas de latência, disponibilidade e throughput.

### SSE (Server-Sent Events)
Mecanismo de comunicação unidirecional servidor-cliente utilizado para streaming de respostas de agentes e heartbeats.

### Study Scanner
Componente que analisa documentos de estudo (S1-S25, E1-E5, etc.) em busca de implementações faltantes, inconsistências e oportunidades de melhoria.

---

## T

### Tech Radar
Matriz tecnológica que avalia tecnologias contra critérios de maturidade, comunidade, segurança e alinhamento com a arquitetura. Mantido em MATRIZ-TECNOLOGICA-COMPLETA.md.

### Theia Platform
Plataforma de IDE extensível sobre a qual o ambiente de desenvolvimento IDEIA é construído. Integra Monaco editor, LSP, DAP e sistema de extensões OpenVSX.

---

## U

### Use Case
Caso de uso da camada de aplicação em Clean Architecture. Contém lógica de orquestração e é testável isoladamente sem infraestrutura.

---

## V

### Verification Layer
Camada de verificação que executa quality gates: lint, typecheck, cobertura, segurança, performance, contrato e resiliência antes de cada release.

### Virtual Scrolling
Técnica de renderização que otimiza listas grandes reutilizando nós DOM, implementada no React frontend para logs, eventos e resultados de busca.

---

## W

### WebAuthn
Padrão de autenticação sem senha baseado em chaves criptográficas (passkeys), utilizado no sistema de autenticação da IDEIA.

### Workflow Engine
Motor de workflows que orquestra sequências de passos com condições, paralelismo, rollback e notificações.

---

## X

### Xterm.js
Emulador de terminal no browser utilizado em conjunto com node-pty para fornecer terminal interativo na interface web e IDE.
