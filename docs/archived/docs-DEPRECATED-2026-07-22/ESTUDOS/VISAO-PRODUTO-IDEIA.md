# IDEIA — Visão de Produto

> **"Dê a ideia, nós entregamos a solução."**
> Versão: 1.0 — Julho 2026

---

## Sumário

1. [Conceito IDEIA](#1-conceito-ideia)
2. [Jornada do Usuário](#2-jornada-do-usuário)
3. [Níveis de Autonomia](#3-níveis-de-autonomia)
4. [Diferenciais Competitivos](#4-diferenciais-competitivos)
5. [Mercado e Posicionamento](#5-mercado-e-posicionamento)
6. [Modelo de Negócio](#6-modelo-de-negócio)

---

## 1. Conceito IDEIA

### O Nome

**IDEIA** é o entroncamento de duas palavras:

| Camada | Significado | Por quê |
|--------|-------------|---------|
| **IDE** | Ambiente de Desenvolvimento Integrado | A base onde o código nasce, vive e é entregue |
| **Ideia** | O ponto de partida de tudo | O insight, o desejo, a visão do usuário |

O nome é um manifesto em si mesmo: **o usuário traz a IDEIA — a IDEIA entrega o resto.**

### Promessa de Valor

```
"Você não precisa mais saber programar, arquitetar, deployar, testar ou documentar.
Você só precisa ter uma ideia clara. A IDEIA faz o resto."
```

### O Diferencial no Mercado

O mercado atual de IDEs com IA está dividido em dois campos:

| Abordagem | Exemplos | Problema |
|-----------|----------|----------|
| **Auto-completar turbinado** | Cursor, Copilot, Windsurf | Aceleram a digitação, não eliminam o trabalho. Você ainda precisa saber o que fazer, como fazer e quando fazer |
| **Agente autônomo remoto** | Devin, Factory | Prometem autonomia mas rodam na nuvem, expõem código, cobram por uso e não aprendem entre projetos |

**IDEIA ocupa o espaço vazio no meio:** um agente de desenvolvimento local, que entende a ideia, planeja a solução, implementa com agentes especializados, testa, faz deploy e aprende — tudo offline, tudo seu, tudo aberto.

### A Filosofia

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         IDEIA não é uma ferramenta de produtividade.        │
│         IDEIA é um parceiro de engenharia.                  │
│                                                             │
│         Você traz a visão.                                  │
│         Nós trazemos a execução.                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Jornada do Usuário

### Visão Geral

A jornada do usuário na IDEIA segue 7 momentos, do insight vago ao aprendizado contínuo:

```
INSIGHT → ESCLARECIMENTO → PLANEJAMENTO → IMPLEMENTAÇÃO → VALIDAÇÃO → ENTREGA → APRENDIZADO

  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
  │  ☁️   │   │  💬   │   │  🧠   │   │  🤖   │   │  ✅   │   │  🚀   │   │  📚   │
  │ Vaga  │   │ Perg. │   │ Arq.  │   │ Impl. │   │ Teste │   │ Depl. │   │ Aprend│
  │ Ideia │   │ Escl. │   │ Stack │   │ Agnts │   │ Corre │   │ Docum │   │ Melh. │
  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘
```

### Momento 0 — Usuário tem uma ideia vaga

O usuário chega com uma intenção. Pode ser uma frase, um desejo, um problema:

- *"Quero um SaaS de assinaturas"*
- *"Preciso de um sistema de vendas para minha loja"*
- *"Cria um CRUD de pacientes com agendamento"*
- *"Faz uma landing page para meu novo projeto"*

**Neste momento, nada existe — nem stack, nem requisitos, nem arquitetura. Só a centelha.**

### Momento 1 — IDEIA pergunta, esclarece, documenta requisitos

IDEIA não chuta. IDEIA pergunta. Em vez de sair gerando código aleatório, o sistema inicia um **diálogo estruturado de esclarecimento**:

```
IDEIA: "Você disse 'SaaS de assinaturas'. Vou fazer algumas perguntas
        para entender melhor o que precisa:

  1. Qual é o modelo de negócio? (recorrente mensal/anual/uso)
  2. Quem são os usuários? (admin/assinante/ambos)
  3. Precisa de gateway de pagamento? (Stripe, Mercado Pago, Asaas)
  4. Precisa de plano gratuito / trial?
  5. Precisa de notificações? (e-mail, WhatsApp, push)
  6. Qual stack você prefere? (Next.js, NestJS, FastAPI, Go...)
  7. Onde será hospedado? (Vercel, AWS, próprio servidor)
  8. Precisa de autenticação social? (Google, GitHub, Apple)

  Se quiser, pode responder agora ou pular — uso defaults inteligentes."

[Usuário responde algumas, pula outras]

IDEIA: "Perfeito. Com base nas respostas, gerei o seguinte documento
        de requisitos:

  📄 requisitos-saas-assinaturas.md
  
  Resumo: SaaS multi-tenancy, planos mensais/anuals, Stripe,
  Next.js + NestJS + PostgreSQL, deploy Vercel, Auth Google.

  Confirma que está de acordo? Posso ajustar."
```

**Documentos gerados neste momento:**
- Documento de requisitos funcionais e não-funcionais
- Mapa de histórias de usuário (user stories)
- Glossário do domínio
- Critérios de aceite iniciais

### Momento 2 — IDEIA planeja arquitetura, stack, módulos

Com os requisitos esclarecidos, IDEIA projeta a arquitetura completa:

```
IDEIA: "Com base nos requisitos, aqui está a arquitetura proposta:

  🏗️  ARQUITETURA — SaaS de Assinaturas v1.0

  Frontend (Next.js 14 + Tailwind + shadcn/ui)
  │
  ├── /pages      → Landing, Login, Dashboard, Planos
  ├── /app        → Assinatura (CRUD), Checkout, Perfil
  └── /api        → Webhooks Stripe, Auth callbacks
  │
  Backend (NestJS + Prisma + PostgreSQL)
  │
  ├── /modules/auth       → JWT + Google OAuth
  ├── /modules/plans      → CRUD de planos
  ├── /modules/checkout   → Integração Stripe
  ├── /modules/subscriptions → Ciclo de vida
  └── /modules/notifications → Email (Resend)
  │
  Infra (Vercel + Neon + Stripe)
  │
  ├── Landing: Vercel (SSR)
  ├── API: Vercel (serverless)
  ├── DB: Neon (PostgreSQL serverless)
  └── Payments: Stripe

  Estimativa: ~40 arquivos, ~2 semanas de trabalho solo
  Riscos identificados:
    ⚠ Integração Stripe webhooks precisa de URL pública
    ⚠ Migrations Prisma no deploy serverless

  Confirma a arquitetura? Quer ajustar algo?"
```

**Documentos gerados neste momento:**
- Documento de Arquitetura (ADR-001 a ADR-N)
- Diagrama de componentes e fluxos
- Plano de implementação (módulos ordenados por dependência)
- Mapa de riscos técnicos
- Stack final decidida e justificada

### Momento 3 — IDEIA implementa com agentes especializados

A implementação é orquestrada por agentes especializados, cada um focado em uma camada:

```
┌──────────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR PRINCIPAL                         │
│  (macro plano, checkpoints, qualidade, coordenação entre agentes) │
└──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────────┘
       │      │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼      ▼
   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
   │Agente│ │Agente│ │Agente│ │Agente│ │Agente│ │Agente│ │ Agente   │
   │  DB  │ │ Auth │ │  API │ │ Front│ │Check-│ │Email │ │ Testes   │
   │      │ │      │ │      │ │  end │ │  out  │ │      │ │          │
   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘
```

**Cada agente:**
1. Recebe a parte do plano que lhe compete
2. Implementa o código (com padrões, quality gates, testes)
3. Submete para revisão do orquestrador
4. Ajusta conforme feedback
5. Avança para o próximo checkpoint

**O orquestrador garante:**
- Consistência entre módulos (contratos de API, tipos compartilhados)
- Qualidade mínima (lint, typecheck, testes passando)
- Coerência com a arquitetura definida
- Checkpoints de aprovação humana nos marcos definidos

### Momento 4 — IDEIA testa, verifica, corrige

Após a implementação, IDEIA executa um ciclo completo de validação:

```
🔄 CICLO DE VALIDAÇÃO

  1. Lint + Typecheck → falhou → corrige → repete
  2. Testes unitários → falhou → corrige → repete
  3. Testes de integração → falhou → corrige → repete
  4. Testes E2E (Playwright) → falhou → corrige → repete
  5. Verificação de segurança → falhou → corrige → repete
  6. Verificação de performance → alerta → otimiza se necessário
  7. Relatório de cobertura → aceitável ✅

📊 RELATÓRIO

  ✔  23/23 testes unitários passando
  ✔  8/8 testes de integração passando
  ✔  5/5 fluxos E2E validados
  ✔  0 vulnerabilidades críticas
  ✔  Cobertura: 87% (meta: 80%)
  ⚠  2 warnings de performance (páginas sem lazy loading)
       → Corrigido automaticamente
```

**IDEIA não entrega código quebrado.** Se algo falha, ela tenta corrigir antes de pedir ajuda. Se não consegue, escalona para o usuário com diagnóstico claro.

### Momento 5 — IDEIA faz deploy, monitora, documenta

Com o código validado, IDEIA entrega o projeto completo:

```
🚀 ENTREGA FINAL

  ✅ Código gerado: ~40 arquivos (2.847 linhas)
  ✅ Testes: 36/36 passando
  ✅ Deploy: Vercel (produção) + Neon (DB) + Stripe (configurado)
  ✅ Documentação: README.md, API.md, ARCHITECTURE.md, DEPLOY.md
  ✅ Variáveis de ambiente: .env.example + .env.production
  ✅ CI/CD: GitHub Actions configurado (lint → test → build → deploy)
  ✅ Monitoramento: Sentry + uptime check configurados
  ✅ Domínio: app-exemplo.vercel.app (Staging)

  📦 O projeto está em ./saas-assinaturas/

  💡 PRÓXIMOS PASSOS SUGERIDOS:
    • Adicionar cupons de desconto
    • Relatório de churn mensal
    • Integração com WhatsApp para notificações
```

**Documentos gerados automaticamente:**
- `README.md` — visão geral, como rodar, stack, links
- `API.md` — endpoints, exemplos, autenticação
- `ARCHITECTURE.md` — decisões arquiteturais (ADRs)
- `DEPLOY.md` — passo a passo do deploy
- `CHANGELOG.md` — versão inicial
- `CONTRIBUTING.md` — guia de contribuição (para projetos open source)

### Momento 6 — IDEIA aprende e melhora para o próximo projeto

A cada projeto, IDEIA acumula conhecimento:

```
📚 MEMÓRIA CROSS-PROJETO

  Projetos anteriores: 3

  🧠 PADRÕES IDENTIFICADOS
    • Prefere Next.js + Tailwind para frontend (2 de 3 projetos)
    • Usa Stripe como gateway padrão (2 de 2 pagamentos)
    • NestJS com Prisma (3 de 3 projetos backend)

  ⚡ RECOMENDAÇÕES
    • "Seu próximo projeto parece combinar com FastAPI — quer tentar?"
    • "Da última vez você escolheu Neon. Quer repetir ou tentar Supabase?"

  🚫 LIÇÕES APRENDIDAS
    • "No projeto anterior, a falta de testes E2E causou retrabalho.
      Já estou incluindo Playwright por padrão."
    • "Você rejeitou Tailwind no último projeto e depois voltou atrás.
      Quer pular essa etapa?"
```

### Em todos os momentos

O usuário mantém controle total:

```
CONTROLE DO USUÁRIO — ONIPRESENTE

  📋 Aprovação em checkpoints:
     □ Requisitos ✔️ Aprovado
     □ Arquitetura   ⏳ Pendente
     □ Implementação   ⏳ Aguardando
     □ Deploy         ⏳ Aguardando

  🔧 Ajustes a qualquer momento:
    [Usuário] "Na verdade, esqueci de dizer: precisamos de
               multi-idioma (pt-BR e en)."
    [IDEIA]   "Entendi. Vou ajustar o plano e os requisitos
               para incluir i18n. Isso adiciona ~2 dias ao total."

  ⏸️ Pausa/Retomada:
    [Usuário] "Pausa o projeto, volto amanhã."
    [IDEIA]   "Salvo. Você está no checkpoint 3 de 7.
               Amanhã continuamos da implementação do módulo de
               pagamentos."
```

---

## 3. Níveis de Autonomia

### Visão Geral

IDEIA opera em 5 níveis de autonomia, do totalmente assistido ao totalmente autônomo. O usuário escolhe o nível no início do projeto e pode alterar a qualquer momento.

```
                     AUTONOMIA
                 ───────────────

  N0        N1          N2          N3            N4
  ───       ───         ───         ───           ───
ASSISTIDO SUPERVISION SEMI-AUTÔN  AUTÔNOMO     AUTÔNOMO
                       NOMO        C/SUPERVIS.   TOTAL

  Humano   IA executa  IA executa  IA executa   IA executa
  faz tudo  cada passo   ciclos      tudo        tudo
  IA só     humano      humano      humano       humano
  sugere    aprova      aprova      revisa       só define
                       módulos     resultado     a ideia
```

### Nível 0 — Assistido (IA sugere, humano faz)

| Aspecto | Comportamento |
|---------|---------------|
| Implementação | IA sugere código, humano escreve |
| Comandos | IA sugere comandos, humano digita |
| Decisões | IA recomenda, humano decide sempre |
| Testes | IA mostra o que testar, humano executa |
| Deploy | IA dá instruções, humano executa |
| Aprovação | Toda ação requer ação humana |

**Para quem:** Aprendizado, exploração, usuário quer manter controle total.

### Nível 1 — Supervisionado (IA executa, humano aprova cada passo)

| Aspecto | Comportamento |
|---------|---------------|
| Implementação | IA escreve, mostra diff, humano aprova cada arquivo |
| Comandos | IA executa com --dry-run, humano confirma |
| Decisões | IA propõe, humano aprova cada decisão |
| Testes | IA executa, mostra resultado, humano valida |
| Deploy | IA prepara, humano executa deploy |
| Checkpoints | A cada 3-5 ações, pausa para aprovação |

**Para quem:** Usuário quer produtividade mas não confia 100% na IA.

### Nível 2 — Semi-autônomo (IA executa ciclos, humano aprova módulos)

| Aspecto | Comportamento |
|---------|---------------|
| Implementação | IA implementa módulos completos, mostra resumo |
| Comandos | IA executa, registra log, só pergunta se crítico |
| Decisões | IA decide dentro do escopo definido |
| Testes | IA executa e corrige falhas automaticamente |
| Deploy | IA prepara, humano só aprova "vai" |
| Checkpoints | A cada módulo completo (não a cada arquivo) |

**Para quem:** Usuário experiente que quer acelerar sem perder controle estratégico.

### Nível 3 — Autônomo com supervisão (IA executa tudo, humano revisa resultado)

| Aspecto | Comportamento |
|---------|---------------|
| Implementação | IA implementa tudo, gera relatório final |
| Comandos | IA executa sem perguntar, registra tudo |
| Decisões | IA decide, documenta, justifica |
| Testes | IA testa, corrige, otimiza — ciclo fechado |
| Deploy | IA faz deploy em staging, humano promove para produção |
| Checkpoints | Só no final: revisão do projeto completo |

**Para quem:** Projetos bem definidos, usuário confia na IA mas quer revisão final.

### Nível 4 — Autônomo total (IA executa e entrega, humano só define a ideia)

| Aspecto | Comportamento |
|---------|---------------|
| Entrada | "Quero um SaaS de assinaturas" |
| Saída | Projeto pronto, testado, deployado, documentado |
| Decisões | IA decide tudo dentro do escopo acordado |
| Testes | Ciclo completo auto-corretivo |
| Deploy | Produção automática com rollback configurado |
| Checkpoints | Relatório final de entrega |

**Para quem:** Usuário confia plenamente na IA e quer máxima velocidade. Ideal para protótipos, MVPs, projetos pessoais.

### Comparação dos Níveis

| Atividade | N0 | N1 | N2 | N3 | N4 |
|-----------|:--:|:--:|:--:|:--:|:--:|
| Escrever código | Humano | IA → aprova | IA → módulo | IA → lote | IA |
| Executar comandos | Humano | Dry-run → aprova | IA (auto) | IA (auto) | IA |
| Decidir stack | IA sugere | IA propõe | IA decide | IA decide | IA decide |
| Testar | Humano | IA → vê resultado | IA → corrige | IA (ciclo) | IA (ciclo) |
| Deploy | Instruções | IA prepara | IA → aprova | IA → staging | IA → prod |
| Corrigir erros | Humano | IA mostra | IA tenta | IA (ciclo) | IA (ciclo) |
| Documentar | IA sugere | IA gera | IA gera | IA gera | IA gera |
| Aprender | Manual | Manual | Automático | Automático | Automático |

### Segurança nos Níveis

```
N0 ─── Máximo controle, mínimo risco
N1 ─── Controle granular, risco baixo
N2 ─── Controle estratégico, risco médio
N3 ─── Confiança alta, risco gerenciado
N4 ─── Confiança total, rollback automático
```

Em qualquer nível, o usuário pode:
- **Pausar** a execução a qualquer momento
- **Rebaixar** o nível de autonomia instantaneamente
- **Reverter** alterações via snapshots automáticos
- **Auditar** cada decisão com trilha completa

---

## 4. Diferenciais Competitivos

### 1. Offline-first (SLMs locais)

```
Cursor/Copilot/Devin          IDEIA
─────────────────────         ───────────────
☁️ Requer nuvem            💻  Funciona 100% offline
☁️ Dados vão para          🔒  Tudo fica na sua máquina
   servidor externo
☁️ Latência de rede        ⚡  Resposta local (ms)
☁️ Custa por token         🆓  Modelo local = grátis
☁️ Depende de internet     🌐  Internet só para deploy
```

IDEIA suporta Ollama (Llama, Mistral, Phi, Qwen, DeepSeek) como provedor primário, com fallback para modelos cloud quando necessário.

### 2. Memória cross-projeto

Enquanto as outras ferramentas tratam cada projeto como uma ilha, IDEIA acumula conhecimento:

```
Cursor/Copilot             IDEIA
───────────────            ─────────────────────────────
❌ Cada projeto           ✅ Memória unificada:
   começa do zero            • Padrões de código preferidos
                             • Stacks recusadas/aprovadas
                             • Decisões recorrentes
                             • Preferências do usuário
                             • Erros comuns e correções
                             • Estilo de código
```

### 3. Agentes especializados

IDEIA não usa um único agente genérico — usa um ecossistema de agentes especializados:

```
AGENTES ESPECIALIZADOS IDEIA vs CONCORRÊNCIA

  Devin / Factory          IDEIA
  ────────────────         ──────────────────────────
  Um agente para           N agentes especializados:
  tudo                        • Arquiteto (design)
                              • DB Modeler (schemas)
                              • API Builder (endpoints)
                              • Frontend Dev (UI/UX)
                              • Test Engineer (QA)
                              • DevOps (deploy/infra)
                              • Security (auditoria)
                              • Doc Writer (docs)
  
  Cada agente aprende      Agentes se comunicam
  sozinho                  e compartilham contexto
```

### 4. Auditoria completa

Toda ação é registrada em uma trilha imutável:

```
📋 TRILHA DE AUDITORIA

  2026-07-17 14:23:01 — 🤖 Agente DB: Criado schema prisma
  2026-07-17 14:23:45 — 🤖 Agente Auth: Implementado JWT guard
  2026-07-17 14:24:12 — 👤 USUÁRIO: Aprovado módulo Auth
  2026-07-17 14:25:30 — 🤖 Agente API: Criado endpoint /plans
  2026-07-17 14:26:01 — ⚠️ QUALITY GATE: typecheck falhou
  2026-07-17 14:26:15 — 🤖 Agente API: Corrigido type error
  2026-07-17 14:26:30 — ✅ QUALITY GATE: tipo passou
  2026-07-17 14:27:00 — 👤 USUÁRIO: Rejeitou módulo Checkout
  2026-07-17 14:27:30 — 🤖 Agente Checkout: Ajustando conforme
                         feedback: "precisa de PIX além de card"
```

**Toda decisão é rastreável, justificada e auditável.**

### 5. Pipeline de entrega incluído

IDEIA não para no código. Ela entrega o projeto completo:

```
ENTREGA

  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
  │  Código    │ │  Testes    │ │  Deploy    │ │  Docs      │
  │  gerado    │ │  passando  │ │  config.   │ │  geradas   │
  └────────────┘ └────────────┘ └────────────┘ └────────────┘

  CI/CD        Monitoramento    Domínio       Variáveis
  configurado  configurado      configurado   configuradas
```

### 6. Código aberto e extensível

```
🔓 IDEIA É ABERTA

  • Código 100% open source (MIT)
  • Contribuições bem-vindas
  • Sem vendor lock-in
  • Você pode:
      - Criar agentes customizados
      - Adicionar provedores de IA
      - Customizar quality gates
      - Modificar o pipeline de deploy
      - Criar templates de projeto
      - Integrar com suas ferramentas
      - Auditar cada linha do que roda
```

---

## 5. Mercado e Posicionamento

### Público-alvo

| Segmento | Perfil | Por que IDEIA |
|----------|--------|---------------|
| **Desenvolvedor solo** | Freelancer, indie hacker, criador de conteúdo técnico | Quer entregar projetos completos sem gastar meses. Precisa de autonomia para focar no negócio, não no código |
| **Startup early-stage** | Founder técnico, CTO de startup de 1-10 pessoas | Precisa de MVP rápido, iterações velozes, sem time grande. IDEIA é o "time de engenhário" que não tem |
| **PME com time enxuto** | Pequena equipe de devs (2-5) | Precisa acelerar entrega sem aumentar headcount. IDEIA aumenta a capacidade do time sem aumentar custo |
| **Hobbyist / Aprendiz** | Quem está aprendendo a programar | IDEIA explica, documenta, justifica. É uma ferramenta de aprendizado ativo |

### Concorrência

```
                          AUTONOMIA
                    ────────────────────
                    Baixa          Alta
            ┌─────────────────────────────┐
           │          │                    │
  Online   │  Copilot  │     Devin        │
           │  Cursor   │     Factory      │
           │  Windsurf │     Lovable      │
  HOSPEDAGEM │          │     Bolt          │
           │──────────┼────────────────────│
           │          │                    │
  Local    │  Continue │    IDEIA ◄──     │
           │  (plugin) │    (aqui)        │
           │          │                    │
            └─────────────────────────────┘
```

**Onde IDEIA ganha:**

| Fator | Cursor/Windsurf | Copilot | Devin | IDEIA |
|-------|:---------------:|:-------:|:-----:|:-----:|
| Autonomia real (ideia → deploy) | ❌ | ❌ | 🟡 | ✅ |
| Entrega completa (docs, CI, monitoring) | ❌ | ❌ | ✅ | ✅ |
| Funciona offline | ❌ | ❌ | ❌ | ✅ |
| Memória cross-projeto | ❌ | ❌ | ❌ | ✅ |
| Código aberto | ❌ | ❌ | ❌ | ✅ |
| Agentes especializados | ❌ | ❌ | 🟡 | ✅ |
| Auto-correção de erros | ❌ | ❌ | ✅ | ✅ |
| Controle granular de autonomia | ❌ | ❌ | ❌ | ✅ |
| Dados 100% na máquina | ❌ | ❌ | ❌ | ✅ |
| Sem custo por uso (modelos locais) | ❌ | ❌ | ❌ | ✅ |

### Posicionamento

```
IDEIA não compete com Cursor no "quem completa a função mais rápido".
IDEIA compete no "quem entrega o projeto completo primeiro".

Cursor é um lápis mais rápido.
IDEIA é quem desenha o quadro inteiro enquanto você toma café.
```

### Mensagem para cada público

| Público | Mensagem |
|---------|----------|
| Dev solo | "Pare de gastar 3 meses emside project. Diga a ideia, receba o produto." |
| Startup | "Seu MVP em dias, não em meses. Sem contratar time inteiro." |
| PME | "Cada dev do seu time agora entrega 5x mais. Sem aumentar a folha." |
| Aprendiz | "Aprenda programando de verdade. IDEIA explica cada decisão." |

---

## 6. Modelo de Negócio

### Estratégia Geral

IDEIA segue o modelo **Open Core** — o núcleo é gratuito e aberto, funcionalidades avançadas são pagas.

```
Open Source (MIT)                    Enterprise (Pago)
─────────────────                    ──────────────────
  ✅ IDEIA Core                        🔒 Auditoria avançada
  ✅ Agentes especializados            🔒 SSO / SAML / LDAP
  ✅ Chat + Editor + Terminal          🔒 Compliance (SOC2, LGPD, HIPAA)
  ✅ Pipeline de deploy                🔒 Relatórios executivos
  ✅ Memória cross-projeto             🔒 Suporte prioritário
  ✅ SLMs locais (Ollama)              🔒 Agentes customizados
  ✅ API de extensão                   🔒 Marketplace privado
  ✅ Trilha de auditoria básica        🔒 Workspace multi-time
                                       🔒 Governance corporativa
                                       🔒 On-premise / VPC
                                       🔒 SLA 99.9%
```

### Cloud vs Self-hosted

| | Self-hosted (OSS) | Cloud (gratuita) | Cloud (pro) |
|--|:-----------------:|:----------------:|:-----------:|
| **Preço** | Grátis | Grátis | $29/mês |
| **Modelos** | Locais (Ollama) | Locais + Cloud gratuito | Todos os models |
| **Armazenamento** | Local | Local + Cloud | Cloud sync |
| **Projetos** | Ilimitados | 3 simultâneos | Ilimitados |
| **Agentes** | 5 especializados | 5 especializados | 10+ especializados |
| **Deploy** | Manual | 1-click (Vercel) | Multi-cloud |
| **Suporte** | Comunidade | Comunidade | Prioritário |
| **Auditoria** | Básica | Básica | Avançada |

### Marketplace de Agentes

```
🧩 MARKETPLACE DE AGENTES

  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │   AGENTES OFICIAIS (gratuitos)                   │
  │   ┌────────────────────────────────────────┐     │
  │   │ Arquiteto · DB Modeler · API Builder   │     │
  │   │ Frontend Dev · Test Engineer · DevOps  │     │
  │   │ Security · Doc Writer · QA             │     │
  │   └────────────────────────────────────────┘     │
  │                                                  │
  │   AGENTES DA COMUNIDADE (gratuitos/pagos)        │
  │   ┌────────────────────────────────────────┐     │
  │   │ • Shopify Theme Builder    ★★★★☆      │     │
  │   │ • WordPress Plugin Dev     ★★★☆☆      │     │
  │   │ • React Native Engineer    ★★★★★      │     │
  │   │ • Terraform Infra Agent    ★★★★☆      │     │
  │   │ • Data Pipeline Builder    ★★★☆☆      │     │
  │   │ • WordPress Plugin Dev     ★★★☆☆      │     │
  │   │ • React Native Engineer    ★★★★★      │     │
  │   │ • Terraform Infra Agent    ★★★★☆      │     │
  │   │ • Data Pipeline Builder    ★★★☆☆      │     │
  │   │ • +27 more...                          │     │
  │   └────────────────────────────────────────┘     │
  │                                                  │
  │   AGENTES ENTERPRISE (pagos)                     │
  │   ┌────────────────────────────────────────┐     │
  │   │ • Compliance Auditor (SOC2)  💰        │     │
  │   │ • Security Pentest Agent     💰        │     │
  │   │ • Performance Optimizer      💰        │     │
  │   │ • Localization Agent         💰        │     │
  │   │ • Accessibility Tester       💰        │     │
  │   └────────────────────────────────────────┘     │
  │                                                  │
  │   CRIE SEU PRÓPRIO AGENTE                        │
  │   ┌────────────────────────────────────────┐     │
  │   │ Tutorial · SDK · API · Templates      │     │
  │   │ Publique no marketplace e ganhe 70%   │     │
  │   └────────────────────────────────────────┘     │
  │                                                  │
  └──────────────────────────────────────────────────┘
```

### Fluxo de receita

```
RECEITA IDEIA

  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │  30%  Cloud Pro ($29/mês)                        │
  │       → Individuais e pequenos times             │
  │                                                  │
  │  25%  Enterprise ($199+/mês)                     │
  │       → Empresas com compliance e SLA            │
  │                                                  │
  │  20%  Marketplace (comissão 30%)                 │
  │       → Agentes pagos da comunidade              │
  │                                                  │
  │  15%  Self-hosted Pro ($99/mês)                  │
  │       → Empresas que precisam de on-premise      │
  │                                                  │
  │  10%  Serviços (consultoria, treinamento)        │
  │       → Implantação corporativa                  │
  │                                                  │
  └──────────────────────────────────────────────────┘
```

### Modelo de preços

| | Free | Pro | Enterprise |
|--|:----:|:---:|:----------:|
| **Preço** | R$ 0 | $29/mês | $199/mês |
| **Projetos simultâneos** | 1 | 10 | Ilimitados |
| **Agentes** | 5 oficiais | 10 oficiais | Todos |
| **Modelos** | Locais + Free tier | Todos | Todos + models privados |
| **Agentes customizados** | ❌ | 3 | Ilimitados |
| **Deploys** | Manual | 1-click | Multi-cloud |
| **Membros do time** | 1 | 5 | Ilimitados |
| **Auditoria** | 30 dias | 90 dias | Ilimitada |
| **SSO** | ❌ | ❌ | ✅ |
| **SLA** | ❌ | 99.5% | 99.9% |
| **Suporte** | Discord | Discord + Email | Prioritário 24/7 |
| **On-premise** | ❌ | ❌ | ✅ |

---

## A Grande Visão

> **IDEIA não foi criada para escrever código mais rápido.**
>
> **IDEIA foi criada para que qualquer pessoa com uma ideia — um founder, um criador, um empreendedor, um sonhador — possa transformar essa ideia em software funcionando, sem precisar de um time, sem precisar de investimento, sem precisar de 6 meses de desenvolvimento.**
>
> **O futuro da programação não é digitar mais rápido.**
> **O futuro da programação é pensar, descrever, decidir — e deixar a máquina executar.**
>
> **IDEIA é esse futuro.**

---

> *"Dê a ideia, nós entregamos a solução."*
