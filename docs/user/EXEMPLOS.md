# Exemplos — IDEIA

> **5 exemplos completos do mundo real, do prompt ao resultado.**

---

## Exemplo 1: "Quero um SaaS de assinaturas"

**Do prompt ao deploy. Tempo estimado: 45 min**

### Prompt

```
Quero um SaaS de assinaturas com billing mensal, planos free e pro,
pagamento com Stripe, autenticação por Google, e dashboard para o
assinante ver seus dados. Stack: Next.js + Tailwind + PostgreSQL.
```

### Esclarecimento

IDEIA faz perguntas para refinar:

```
IDEIA: Legal! Algumas perguntas:

  1. Precisa de trial grátis? (7 dias?)
  2. Precisa de notificações por email?
  3. Quem pode criar planos? (admin apenas?)
  4. Precisa de multi-idioma?
  5. Vai precisar de cupons de desconto?
```

**Resposta:** Trial de 7 dias, email de boas-vindas, admin cria planos, só português, sem cupons por enquanto.

### Plano gerado

```
📋 SaaS de Assinaturas — Plano

  Módulo 1 — Setup: Next.js 14 + Tailwind + Prisma + Neon (10 min)
  Módulo 2 — Auth: Google OAuth + JWT (8 min)
  Módulo 3 — Planos: CRUD admin de planos (5 min)
  Módulo 4 — Checkout: Stripe integration (12 min)
  Módulo 5 — Assinaturas: ciclo de vida + trial (7 min)
  Módulo 6 — Dashboard: dados do assinante (8 min)
  Módulo 7 — Deploy: Vercel + Neon + Stripe (5 min)

  Riscos:
    ⚠ Webhooks Stripe precisam de URL pública (ngrok em dev)
    ⚠ Migrations Prisma no serverless requer cuidado
```

### Execução

```
Setup: ✅ Next.js + Prisma + Tailwind configurados
Auth:  ✅ Google OAuth + JWT + login/register pages
       📌 CHECKPOINT: Módulo Auth concluído [Aprovar? Y/n] Y

Planos: ✅ CRUD admin (create/edit/delete/list)
        ✅ Proteção por role (admin-only)

Checkout: ✅ Stripe products + prices sync
          ✅ Checkout session + webhooks
          ✅ Tratamento de falhas (card declined, expired)
          📌 CHECKPOINT: Módulo Checkout [Aprovar? Y/n] Y

Assinaturas: ✅ Trial de 7 dias automático
             ✅ Upgrade/downgrade/cancel
             ✅ Email de boas-vindas (Resend)

Dashboard: ✅ Dados do assinante (plano, status, próxima cobrança)
           ✅ Histórico de pagamentos
           ✅ Link para portal do Stripe
```

### Quality Gates

```
✅ Lint: passou
✅ Typecheck: passou
✅ 23/23 testes unitários passando
✅ 8/8 testes de integração passando
✅ 4/4 fluxos E2E validados
✅ Cobertura: 82%
✅ Segurança: 0 vulnerabilidades críticas
```

### Resultado

```
🎉 SaaS de Assinaturas concluído!

  📦 ./saas-assinaturas/
    ├── app/
    │   ├── (auth)/        login, callback
    │   ├── (dashboard)/   assinante dashboard
    │   └── admin/         planos CRUD
    ├── lib/
    │   ├── stripe/        checkout, webhooks
    │   └── email/         templates Resend
    └── prisma/            schema + migrations

  ✅ Deploy: Vercel (produção) + Neon (DB) + Stripe (configurado)
  ✅ Docs: README.md, API.md, DEPLOY.md
  ✅ CI/CD: GitHub Actions configurado
  ✅ Monitoramento: Sentry configurado

  💡 PRÓXIMOS PASSOS SUGERIDOS:
    • Adicionar cupons de desconto
    • Relatório de churn mensal
    • Integração com WhatsApp
```

---

## Exemplo 2: "Adicione autenticação por Google"

**Feature incremental em projeto existente. Tempo estimado: 15 min**

### Contexto

Você tem um projeto Next.js com login por email/senha e quer adicionar "Login com Google".

### Prompt

```
Adiciona autenticação por Google OAuth no projeto
```

### Esclarecimento

```
IDEIA: Legal! Algumas perguntas:

  1. Você já tem credenciais do Google Cloud configuradas?
  2. Quer manter o login por email/senha também?
  3. Os usuários existentes precisam poder vincular conta Google?
```

**Resposta:** Não tenho credenciais ainda, quero manter email/senha, e sim, vincular contas existentes.

### Execução

```
IDEIA: Primeiro, vou gerar as instruções para configurar o Google Cloud:

  1. Acesse https://console.cloud.google.com
  2. Crie um projeto → APIs → OAuth consent screen
  3. Credentials → Create OAuth 2.0 Client ID
  4. Authorized redirect: http://localhost:3000/api/auth/callback/google

  Quer que eu continue enquanto você configura, ou prefere que eu
  prepare tudo e você só adiciona as chaves depois?
```

**Resposta:** Prepara tudo, eu adiciono as chaves depois.

```
🤖 Programador: Adicionando NextAuth.js...

  ✅ next-auth configurado com provider Google
  ✅ Página de login com botão "Entrar com Google"
  ✅ Callback route configurado
  ✅ User model atualizado (googleId, avatar)
  ✅ Lógica de vincular conta existente por email
  ✅ Testes do fluxo de autenticação

📌 CHECKPOINT: Autenticação Google adicionada
   [Aprovar? Y/n/diff]
```

### Resultado

```
✅ Autenticação Google adicionada

  O que mudou:
    • Novas dependências: next-auth
    • Novos arquivos: src/app/api/auth/[...nextauth]/
    • Modificados: User model (prisma), login page
    • Testes: 3 novos testes para o fluxo Google

  Para ativar:
    1. Adicione no .env:
       GOOGLE_CLIENT_ID=seu_id
       GOOGLE_CLIENT_SECRET=sua_secret
       NEXTAUTH_SECRET=sua_secret
    2. Rode `npx prisma migrate dev`
    3. Pronto!
```

---

## Exemplo 3: "Transforme este monólito em microsserviços"

**Refatoração complexa. Tempo estimado: 2h**

### Contexto

Você tem uma API NestJS monolítica com auth, billing, tasks e notifications tudo junto.

### Prompt

```
Quero transformar esta API monolítica em microsserviços.
Separa em: auth-service, billing-service, tasks-service, notifications-service.
Comunicação via NATS.
```

### Esclarecimento

```
IDEIA: Entendi! Refatoração grande. Algumas perguntas:

  1. Cada serviço terá seu próprio banco? (recomendado)
  2. Quer manter o monólito funcionando durante a migração?
  3. Precisa de API Gateway para unificar os endpoints?
  4. Como vai fazer deploy? (Kubernetes? Docker Compose?)
  5. Manter o mesmo banco PostgreSQL ou cada um com o seu?
```

**Resposta:** Cada um com seu banco (schema separado), manter monólito até migrar tudo, API Gateway (NestJS), Docker Compose, PostgreSQL cada um.

### Plano

```
📋 Monólito → Microsserviços — Plano de Migração

  Fase 1 — Extrair auth-service (40 min)
    • Copiar módulo auth para novo projeto
    • Configurar banco separado
    • Implementar NATS client
    • Testes de integração

  Fase 2 — Extrair tasks-service (35 min)
    • Copiar módulo tasks
    • Substituir chamadas diretas por NATS
    • Testes

  Fase 3 — Extrair billing-service (30 min)
    • Copiar módulo billing
    • Webhooks Stripe → próprio serviço
    • Testes

  Fase 4 — Extrair notifications-service (15 min)
    • Copiar módulo de email/push
    • Testes

  Fase 5 — API Gateway (20 min)
    • Novo gateway que roteia para os serviços
    • Rate limiting + auth centralizada

  Riscos:
    🔴 Chamadas síncronas no monólito precisam virar eventos
    🟡 Migrations de dados dos bancos existentes
    🟡 Testes E2E precisam rodar com todos os serviços
```

### Execução (parcial)

**Nota:** Refatorações complexas usam N2 (Semi-autônomo) com checkpoints a cada serviço.

```
Fase 1/5 — Extraindo auth-service...

  🤖 Arquiteto: Desenhando contratos entre serviços
  🤖 Programador: Copiando e adaptando módulo auth
  🤖 Programador: Adicionando NATS client
  🤖 Testador: Adaptando testes

  📌 CHECKPOINT: auth-service extraído
     ✅ 15/15 testes passando
     ✅ Contrato NATS definido
     [Aprovar? Y/n/diff] Y
```

### Resultado final

```
🎉 Migração concluída!

  📦 ./monorepo/
    ├── auth-service/         (porta 3001)
    ├── billing-service/      (porta 3002)
    ├── tasks-service/        (porta 3003)
    ├── notifications-service/ (porta 3004)
    ├── api-gateway/          (porta 80)
    └── docker-compose.yml

  ✅ 67/67 testes passando
  ✅ NATS JetStream configurado
  ✅ API Gateway com rate limiting
  ✅ Docker Compose com todos os serviços
  ✅ Monólito original preservado até corte final

  ⚠️ Atenção:
    • Dados precisam ser migrados (scripts em /migration)
    • Monólito e microsserviços funcionam em paralelo
    • Corte final: ajustar DNS para API Gateway
```

---

## Exemplo 4: "Crie um dashboard administrativo"

**CRUD + UI com testes. Tempo estimado: 30 min**

### Prompt

```
Quero um dashboard administrativo com:
- CRUD de usuários (listar, criar, editar, desativar)
- CRUD de produtos (com imagem upload)
- Gráfico de vendas mensais
- Tabela de pedidos recentes
Stack: Next.js + Tailwind + shadcn/ui + Recharts
```

### Esclarecimento

```
IDEIA: Boa! Algumas perguntas:

  1. Precisa de autenticação para acessar o admin? (sim)
  2. Quem pode acessar? (só admins?)
  3. Upload de imagem: local ou S3?
  4. Precisa de busca/filtros nas tabelas?
  5. Precisa de exportar dados (CSV/Excel)?
```

**Resposta:** Sim, só admin, local por enquanto, sim busca/filtros, CSV export seria bom.

### Execução

```
Setup: ✅ Next.js + Tailwind + shadcn/ui + Recharts

CRUD Usuários:
  ✅ Lista com busca e paginação
  ✅ Formulário de criação/edição
  ✅ Desativar/ativar (soft delete)
  ✅ Testes do CRUD

CRUD Produtos:
  ✅ Lista com filtros por categoria
  ✅ Upload de imagem (multer + local)
  ✅ Formulário com preview
  ✅ Testes do CRUD

Dashboard:
  ✅ Gráfico de vendas mensais (Recharts)
  ✅ Cards de resumo (total users, produtos, pedidos)
  ✅ Tabela de pedidos recentes
  ✅ Export CSV

Quality Gates:
  ✅ 18/18 testes
  ✅ 85% cobertura
  ✅ Acessibilidade WCAG AA
```

### Resultado

```
🎉 Dashboard Admin concluído!

  📦 ./dashboard-admin/
    ├── app/admin/
    │   ├── users/        CRUD + list
    │   ├── products/     CRUD + list + upload
    │   └── dashboard/    gráficos + cards
    ├── components/
    │   ├── ui/           shadcn components
    │   └── charts/       Recharts wrappers
    └── lib/
        ├── upload/       multer config
        └── export/       CSV generator

  ✅ 18/18 testes
  ✅ Deploy: Vercel
  ✅ Export CSV funcional
  ✅ Responsivo (mobile + desktop)
```

---

## Exemplo 5: "Documente toda a API"

**Geração de OpenAPI/Swagger. Tempo estimado: 5 min**

### Contexto

Você tem uma API NestJS com 15 endpoints e quer documentação OpenAPI completa.

### Prompt

```
Documenta toda a API com OpenAPI/Swagger
```

### Execução

```
IDEIA: Verificando endpoints...

  Endpoints encontrados:
    POST   /auth/register
    POST   /auth/login
    POST   /auth/refresh
    GET    /tasks
    GET    /tasks/:id
    POST   /tasks
    PUT    /tasks/:id
    DELETE /tasks/:id
    PATCH  /tasks/:id/status
    GET    /users/me
    PATCH  /users/me
    GET    /users
    GET    /users/:id
    DELETE /users/:id
    POST   /upload

Gerando documentação...

  ✅ Decorators Swagger adicionados a todos os endpoints
  ✅ DTOs documentados com exemplos
  ✅ Schemas de resposta documentados
  ✅ Tags de agrupamento organizadas
  ✅ Servidor configurado (dev/prod)

Resultados:
  📄 Swagger UI: /api/docs
  📄 OpenAPI JSON: /api/docs-json
  📄 API.md: documentação markdown exportada

  Exemplo gerado:

  POST /tasks
  ──────────────
  Cria uma nova tarefa.

  Body:
  ```json
  {
    "title": "Implementar login",
    "description": "Criar tela de login com JWT",
    "priority": "high",
    "dueDate": "2026-08-01T00:00:00Z"
  }
  ```

  Response (201):
  ```json
  {
    "id": "uuid",
    "title": "Implementar login",
    "description": "Criar tela de login com JWT",
    "priority": "high",
    "status": "todo",
    "createdAt": "2026-07-17T22:30:00Z"
  }
  ```
```

### Resultado

```
✅ Documentação API concluída em 3 minutos!

  • 15 endpoints documentados
  • Swagger UI em /api/docs
  • OpenAPI spec em /api/docs-json
  • API.md exportado para a raiz do projeto
  • Exemplos de request/response para cada endpoint
  • Schemas de erro documentados (400, 401, 404, 500)
```

---

> **Próximo:** [FAQ.md](FAQ.md) — Perguntas frequentes
