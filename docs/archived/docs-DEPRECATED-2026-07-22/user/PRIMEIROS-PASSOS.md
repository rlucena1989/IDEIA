# Primeiros Passos — IDEIA

> **Seu primeiro projeto do zero ao deploy em minutos.**

---

## 1. Instalação

### Opção A — npm (recomendado)

```bash
npm install -g @ideia/cli
```

### Opção B — Docker

```bash
docker pull ideia/ideia
docker run -p 3000:3000 ideia/ideia
```

### Opção C — Clone e build

```bash
git clone <repo-url>
cd ideia
npm install
npm run build
npm run dev
```

**Pré-requisitos:**
- Node.js 20 ou superior
- npm 9 ou superior
- Git

**Opcional (mas recomendado):**
- [Ollama](https://ollama.ai) — para rodar modelos de IA localmente
- Docker — para o barramento de mensagens NATS JetStream

---

## 2. Abrindo o IDEIA pela primeira vez

Execute:

```bash
npm run dev
```

Acesse `http://localhost:3000` no navegador. Você verá o **Dashboard**:

```
┌──────────────────────────────────────────────────────────┐
│  🔍 IDEIA                                   [N1] [⚡]    │
│  ┌──────────────────────────────────────────────────────┐│
│  │                                                      ││
│  │  Bem-vindo ao IDEIA!                                 ││
│  │                                                      ││
│  │  💡 Digite sua ideia para começar.                   ││
│  │  Exemplos:                                           ││
│  │  • "Quero uma API REST de tarefas"                   ││
│  │  • "Crie um dashboard admin"                         ││
│  │  • "Quero um SaaS de assinaturas"                    ││
│  │                                                      ││
│  │  ┌──────────────────────────────────────────────┐    ││
│  │  │ Digite sua ideia aqui...               [➡️]   │    ││
│  │  └──────────────────────────────────────────────┘    ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│  📁 explorer   |   📄 editor   |   ⚙️ status bar        │
└──────────────────────────────────────────────────────────┘
```

### Elementos da Interface

| Elemento | Localização | O que faz |
|----------|-------------|-----------|
| **Chat** | Centro | Converse com a IDEIA. É aqui que você dá ideias e comandos |
| **Editor Monaco** | Direita | Editor de código com syntax highlight, múltiplas abas |
| **File Explorer** | Esquerda | Navegue pelos arquivos do projeto |
| **Dashboard** | Aba superior | Métricas do projeto em tempo real |
| **Status Bar** | Inferior | Nível de autonomia, LLM ativo, health score, branch git |

---

## 3. Seu primeiro projeto: "Quero uma API REST"

Digite no chat:

```
Quero uma API REST de tarefas com autenticação JWT e banco PostgreSQL
```

### O que acontece:

### Passo 1 — Esclarecimento

IDEIA faz perguntas para entender melhor:

```
IDEIA: Entendi! Vou fazer algumas perguntas:

  1. Que linguagem/framework prefere? (Node.js/NestJS, Python/FastAPI, Go)
  2. Precisa de autenticação social? (Google, GitHub)
  3. Precisa de documentação OpenAPI?
  4. Onde será hospedado? (Vercel, AWS, próprio servidor)

  Pode responder agora ou pular — uso defaults inteligentes.
```

**Você responde** (ou só aperta Enter para usar defaults):

```
Node.js com NestJS, só JWT mesmo, sim OpenAPI, Vercel
```

### Passo 2 — Plano

IDEIA gera um plano de arquitetura:

```
IDEIA: Aqui está o plano:

  📋 API REST de Tarefas — Plano de Implementação

  Módulo 1 — Setup: NestJS + Prisma + PostgreSQL
  Módulo 2 — Auth: JWT (registro, login, refresh)
  Módulo 3 — CRUD Tarefas: endpoints com proteção JWT
  Módulo 4 — Testes: unitários + integração
  Módulo 5 — Deploy: Vercel + Neon DB
  Módulo 6 — Documentação: OpenAPI/Swagger

  [Aprovar plano? Y/n]
```

Digite `Y` para aprovar.

### Passo 3 — Implementação

Os agentes começam a trabalhar. Você vê o progresso:

```
🤖 Agente DB: Criando schema Prisma...
   ✅ Schema criado: User, Task

🤖 Agente Auth: Implementando JWT...
   ✅ Auth guard + login/register endpoints

🤖 Agente API: Criando CRUD de tarefas...
   ✅ Endpoints: GET, POST, PUT, DELETE /tasks
```

**No N1 (Supervisionado):** A cada arquivo, a IDEIA mostra o diff e pede aprovação.

```
📄 src/auth/auth.controller.ts
  ┌──────────────────────────────────────────────┐
  │ + @Post('login')                             │
  │ + async login(@Body() dto: LoginDto) {       │
  │ +   return this.authService.login(dto);      │
  │ + }                                          │
  └──────────────────────────────────────────────┘
  [Aprovar? Y/n/diff/editar]
```

Você pode:
- **Y** — aprovar e seguir
- **n** — rejeitar (a IDEIA pergunta o motivo e ajusta)
- **diff** — ver o diff completo
- **editar** — editar manualmente antes de aprovar

### Passo 4 — Testes

Assim que a implementação termina:

```
🔄 Executando testes...

   ✅ 12/12 testes unitários passando
   ✅ 4/4 testes de integração passando
   ✅ Cobertura: 83%

  Quality Gate: ✅ Commit gate passou
```

Se algo falha, a IDEIA tenta corrigir automaticamente:

```
   ❌ 2/12 testes falharam

   🤖 Corrigindo...
   ✅ 12/12 testes passando após correção
```

### Passo 5 — Resultado Final

```
🎉 Projeto concluído!

  📦 ./minha-api-rest/
    ├── src/
    │   ├── auth/          (JWT login/register)
    │   ├── tasks/         (CRUD)
    │   └── prisma/        (schema + migrations)
    ├── test/
    ├── docker-compose.yml
    └── README.md

  📊 23 arquivos · 847 linhas
  ✅ 16/16 testes · 83% cobertura
  📄 Documentação: API.md + Swagger em /api/docs
  🚀 Deploy: vercel --prod configurado

  💡 Próximos passos sugeridos:
    • Adicionar paginação
    • Adicionar filtros por status
    • Adicionar testes E2E
```

---

## 4. Aprovando e revisando mudanças

### Tipos de aprovação

| Ação | Como fazer |
|------|-----------|
| Aprovar | Digite `Y` ou clique no ✅ |
| Rejeitar | Digite `n` — explique o motivo |
| Pedir ajuste | "Na verdade, quero MongoDB em vez de PostgreSQL" |
| Pular | Digite `pular` — a IDEIA segue com defaults |
| Pausar | "Pausa" — o progresso é salvo |

### Editando manualmente

Você pode editar qualquer arquivo no editor Monaco e depois dizer:

```
revê o que eu mudei
```

A IDEIA analisa suas alterações, verifica se está tudo consistente e continua.

---

## 5. Entendendo o chat, o plano e os agentes

### Chat

O chat é o centro de comando. Tudo passa por ele:

- **Dar ideias:** "Quero um sistema de vendas"
- **Pedir mudanças:** "Adiciona autenticação por Google"
- **Fazer perguntas:** "Por que escolheu NestJS?"
- **Acompanhar:** "Status"
- **Controlar:** "Pausa", "Nível N2"

### Plano

O plano é o roteiro que a IDEIA segue. Você pode:

- **Ver:** `plano` — mostra o plano atual
- **Modificar:** "Adiciona módulo de relatórios"
- **Reordenar:** "Faz o deploy depois dos testes"
- **Aprovar/Rejeitar:** módulo por módulo

### Agentes

Cada agente é um especialista em uma área:

| Agente | Responsabilidade |
|--------|-----------------|
| Analista | Entender requisitos, fazer perguntas |
| Arquiteto | Projetar arquitetura, escolher stack |
| Programador | Escrever código |
| Revisor | Revisar qualidade e segurança |
| Testador | Criar e executar testes |
| DevOps | Configurar deploy e infraestrutura |

Você não interage com eles diretamente — o orquestrador coordena tudo. Mas se quiser, pode:

```
quero ver o que o Arquiteto está fazendo
```

---

## 6. Próximos passos

Agora que você fez seu primeiro projeto, experimente:

1. **Mude o nível de autonomia** — vá para N2 e veja a diferença
2. **Adicione uma feature** — "Adiciona paginação na listagem de tarefas"
3. **Peça documentação** — "Documenta a API"
4. **Faça deploy** — "Deploy para produção"
5. **Crie um segundo projeto** — veja a IDEIA lembrar das suas preferências

### Comandos úteis para começar

| Comando | O que faz |
|---------|-----------|
| `status` | Mostra status do projeto |
| `plano` | Mostra o plano atual |
| `muda nível N2` | Altera nível de autonomia |
| `explica [código]` | Explica um trecho |
| `documenta [módulo]` | Gera documentação |
| `deploy staging` | Faz deploy em staging |

---

## 7. Dicas

- **Comece pequeno** — uma API REST simples é melhor que um sistema complexo
- **Use N1 no início** — você entende o fluxo antes de dar mais autonomia
- **Fale naturalmente** — "Quero um...", "Adiciona...", "Muda..." — funciona
- **Peça explicações** — "Por que escolheu essa stack?" — a IDEIA explica
- **Pause sem medo** — o progresso é salvo automaticamente

---

> **Próximo:** [CONCEITOS.md](CONCEITOS.md) — Entenda os conceitos por trás da IDEIA
