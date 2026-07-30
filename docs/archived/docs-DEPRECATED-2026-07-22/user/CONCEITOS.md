# Conceitos — IDEIA

> **Tudo que você precisa saber para entender como a IDEIA funciona.**

---

## O que é um Agente?

Um **agente** é um especialista virtual que cuida de uma parte específica do seu projeto. Pense como um membro da sua equipe de desenvolvimento — só que digital.

### Agentes Disponíveis

| Agente | Especialidade | O que faz |
|--------|---------------|-----------|
| **Analista** | Requisitos | Pergunta, esclarece, documenta o que você precisa |
| **Arquiteto** | Design | Projeta a arquitetura, escolhe a stack, define padrões |
| **Programador** | Código | Escreve o código de cada módulo |
| **Revisor** | Qualidade | Revisa o código, verifica segurança e boas práticas |
| **Testador** | Testes | Cria e executa testes unitários, integração e E2E |
| **DevOps** | Infraestrutura | Configura deploy, CI/CD, monitoramento |

### Como os agentes trabalham?

Eles não trabalham isolados. Um **orquestrador** coordena tudo:

```
Você dá a ideia
       │
       ▼
┌──────────────────┐
│   ORQUESTRADOR   │  ← Coordena, verifica qualidade, pede sua aprovação
└──────┬───────────┘
       │
       ├── 🤖 Analista → pergunta, esclarece
       ├── 🤖 Arquiteto → projeta, documenta
       ├── 🤖 Programador → implementa
       ├── 🤖 Revisor → verifica
       ├── 🤖 Testador → testa
       └── 🤖 DevOps → deploy
```

Cada agente recebe uma tarefa, executa, e passa o resultado para o próximo. Se algo falha, o agente tenta corrigir antes de pedir ajuda.

### Posso criar meus próprios agentes?

Sim! O IDEIA é extensível. Você pode criar agentes customizados e até publicá-los no **Marketplace de Agentes** para a comunidade usar (e ganhar 70% do valor).

---

## O que é um Plano?

O **plano** é a rota que a IDEIA vai seguir para realizar sua ideia. É um mapa detalhado com:

- **Módulos** — as partes do sistema (ex: autenticação, billing, dashboard)
- **Ordem** — dependências entre módulos (o que vem primeiro)
- **Estimativas** — tempo estimado por módulo
- **Riscos** — problemas potenciais identificados
- **Checkpoints** — pontos onde você precisa aprovar

### Exemplo de plano

```
📋 SaaS de Assinaturas — Plano de Implementação

  Módulo 1 — Setup: Next.js + NestJS + Prisma (30 min)
  Módulo 2 — Auth: JWT + Google OAuth (20 min)
  Módulo 3 — Planos: CRUD de planos (15 min)
  Módulo 4 — Checkout: Integração Stripe (40 min)
  Módulo 5 — Assinaturas: Ciclo de vida (25 min)
  Módulo 6 — Deploy: Vercel + Neon + Stripe (10 min)

  ⚠️ Riscos:
    • Webhooks Stripe precisam de URL pública
    • Migrations Prisma no serverless

  Total estimado: ~2h20min
```

### O que posso fazer com o plano?

- **Ver:** `plano` — mostra o plano atual
- **Aprovar:** `Y` — confirma o plano e começa
- **Modificar:** "Adiciona módulo de notificações" — insere no plano
- **Reordenar:** "Faz deploy depois dos testes" — ajusta a ordem
- **Rejeitar:** "Não gostei, refaz com FastAPI" — replaneja

---

## O que é um Checkpoint?

Um **checkpoint** é um ponto de verificação onde você pode aprovar, ajustar ou rejeitar o que foi feito. Funciona como um "commit" emocional — você decide se aquilo está bom antes de seguir.

### Quando os checkpoints acontecem?

Depende do nível de autonomia:

| Nível | Checkpoint a cada... |
|-------|---------------------|
| N0 | Cada ação |
| N1 | Cada arquivo |
| N2 | Cada módulo completo |
| N3 | Cada entrega (projeto) |
| N4 | Final (só relatório) |

### O que aparece no checkpoint?

```
📌 CHECKPOINT — Módulo Auth concluído

  📄 src/auth/auth.controller.ts
  📄 src/auth/auth.service.ts
  📄 src/auth/jwt.guard.ts
  📄 src/auth/dto/login.dto.ts

  ✅ Lint: passou
  ✅ Typecheck: passou
  ✅ Testes: 4/4 passando

  [Aprovar? Y/n/diff/ajustar]
```

### Opções no checkpoint:

- **Y** — aprova e segue para o próximo módulo
- **n** — rejeita (explique o motivo para a IDEIA ajustar)
- **diff** — ver todas as mudanças do módulo
- **ajustar** — "Adiciona refresh token" — faz mudanças antes de aprovar

---

## O que é Autonomia?

**Autonomia** é o quanto a IDEIA pode fazer sem te perguntar. São 5 níveis:

```
N0 ─────── N1 ─────── N2 ─────── N3 ─────── N4
Assistido  Supervis.  Semi-Aut.  Aut.Sup.   Total
```

### N0 — Assistido
- IDEIA **sugere**, você faz tudo
- Ideal para: aprender, explorar, controle total

### N1 — Supervisionado
- IDEIA executa, você **aprova cada passo**
- Ideal para: começar, entender o fluxo, projetos críticos

### N2 — Semi-autônomo
- IDEIA executa ciclos, você aprova **módulos completos**
- Ideal para: uso diário, projetos em andamento

### N3 — Autônomo com supervisão
- IDEIA executa tudo, você **revisa o resultado final**
- Ideal para: projetos bem definidos, confiança estabelecida

### N4 — Autônomo total
- Você dá a ideia, a IDEIA **entrega tudo**
- Ideal para: MVPs, protótipos, projetos pessoais

### Como mudar?

No chat:
```
muda nível N2
```

Ou clique no nível na Status Bar (canto inferior direito).

### Segurança

Independente do nível, você sempre pode:

- **Pausar** a execução a qualquer momento
- **Rebaixar** o nível instantaneamente
- **Reverter** alterações via snapshots automáticos
- **Auditar** cada decisão na trilha de auditoria

---

## O que é Memória?

A **memória** é o que permite a IDEIA aprender com seus projetos anteriores e aplicar esse conhecimento nos próximos. É como se a IDEIA tivesse um "caderninho" onde anota suas preferências.

### O que a IDEIA lembra?

- **Stacks preferidas** — se você sempre escolhe Next.js, ela sugere Next.js
- **Decisões recorrentes** — você recusou Tailwind? Ela não pergunta de novo
- **Padrões de código** — seu estilo, convenções, formato
- **Erros comuns** — o que deu errado antes para não repetir
- **Preferências de deploy** — Vercel, AWS, ou próprio servidor

### Exemplo

```
📚 MEMÓRIA CROSS-PROJETO

  Projetos anteriores: 3

  🧠 PADRÕES IDENTIFICADOS
    • Prefere Next.js + Tailwind (2 de 3 projetos)
    • Usa Stripe como gateway (2 de 2 pagamentos)
    • NestJS com Prisma (3 de 3 projetos backend)

  ⚡ RECOMENDAÇÃO
    "Seu próximo projeto parece combinar com FastAPI — quer tentar?"
```

### A memória é privada?

Sim. Tudo fica na sua máquina (a menos que você opte pelo sync cloud). A IDEIA não envia suas preferências para servidores externos.

---

## O que é Quality Gate?

**Quality Gate** é uma verificação automática de qualidade que a IDEIA executa antes de avançar. É como ter um revisor de código que verifica se está tudo certo antes de passar para o próximo passo.

### Os 4 Gates

```
Gate 1 — Commit
  ├── Lint + Prettier
  ├── Typecheck
  ├── Commit message (conventional commits)
  └── Testes nos arquivos alterados

Gate 2 — PR (Pull Request)
  ├── Cobertura de código
  ├── Segurança (CodeQL, Snyk)
  ├── Performance
  ├── Testes de integração
  └── Documentação

Gate 3 — Release
  ├── E2E completo
  ├── Performance full suite
  ├── Segurança full suite
  ├── Resiliência
  └── Load test

Gate 4 — Sprint (trimestral)
  ├── NPS
  ├── Bug count
  ├── Technical debt
  └── Velocidade do time
```

### O que acontece quando um gate falha?

```
⚠️ QUALITY GATE: typecheck falhou

  Erro: src/auth/auth.service.ts:42 - Type 'string | undefined'
        não é atribuível a 'string'

  🤖 Agente Programador: Corrigindo...
  ✅ QUALITY GATE: typecheck passou
```

A IDEIA tenta corrigir automaticamente. Se não consegue, pede sua ajuda com um diagnóstico claro.

---

## Resumo Visual

```
Você                       IDEIA
───                        ─────

💡 Ideia vaga        →     🤖 Analista: esclarece requisitos
                          📋 Gera: documento de requisitos

📋 Requisitos        →     🤖 Arquiteto: projeta arquitetura
                          📋 Gera: plano + ADRs

📋 Plano aprovado    →     🤖 Programador: implementa
                          🤖 Revisor: revisa
                          🤖 Testador: testa
                          🔄 Quality Gate: verifica

✅ Código pronto      →     🤖 DevOps: deploy + docs
                          📦 Entrega: código + docs + CI/CD

🎉 Sistema pronto     →     📚 Memória: aprende para o próximo
```

---

> **Próximo:** [COMANDOS.md](COMANDOS.md) — Referência de comandos do chat
