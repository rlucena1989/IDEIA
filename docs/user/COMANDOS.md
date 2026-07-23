# Comandos — IDEIA

> **Referência completa de comandos do chat.**

---

## Dando Ideias

Comandos para começar algo novo ou adicionar funcionalidades.

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `quero [descrição]` | Cria um novo projeto ou funcionalidade | `quero um CRUD de produtos` |
| `cria [descrição]` | Cria um módulo, componente ou arquivo | `cria um módulo de autenticação` |
| `adiciona [funcionalidade]` | Adiciona ao projeto atual | `adiciona paginação na listagem` |
| `gera [algo]` | Gera código, documentação, testes | `gera testes para o módulo auth` |

### Exemplos

```
quero uma API REST de tarefas com JWT e PostgreSQL
→ Gera projeto completo com NestJS + Prisma + JWT

adiciona autenticação por Google
→ Adiciona Google OAuth ao projeto existente

cria um dashboard administrativo
→ Cria módulo de dashboard com gráficos e tabelas

gera documentação OpenAPI
→ Gera Swagger/OpenAPI para todos os endpoints
```

---

## Modificando

Comandos para alterar o que já foi feito.

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `muda [algo] para [outro]` | Refatora ou substitui | `muda PostgreSQL para MongoDB` |
| `troca [algo] por [outro]` | Troca implementação | `troca JWT por sessions` |
| `remove [algo]` | Remove funcionalidade | `remove o módulo de notificações` |
| `renomeia [A] para [B]` | Renomeia arquivos/componentes | `renomeia Tasks para TodoItems` |
| `refatora [módulo]` | Refatora código existente | `refatora o módulo de checkout` |

### Exemplos

```
muda o banco de PostgreSQL para MongoDB
→ Reconfigura Prisma para MongoDB, ajusta queries, mantém lógica

troca o sistema de login de JWT para sessions
→ Remove JWT guard, implementa session-based auth

remove o módulo de notificações por email
→ Remove código, testes e referências

refatora o módulo de pagamentos para usar Strategy Pattern
→ Reestrutura sem mudar comportamento
```

---

## Testando

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `testa [módulo]` | Executa testes de um módulo | `testa auth` |
| `roda testes` | Executa todos os testes | `roda testes` |
| `testa [arquivo]` | Executa testes de um arquivo | `testa auth.service.spec.ts` |
| `cobertura` | Mostra relatório de cobertura | `cobertura` |
| `adiciona testes para [módulo]` | Gera novos testes | `adiciona testes para o módulo billing` |

---

## Deploy

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `deploy [ambiente]` | Faz deploy no ambiente | `deploy staging` |
| `deploy produção` | Deploy em produção | `deploy produção` |
| `deploy preview` | Deploy em preview/Vercel | `deploy preview` |
| `status deploy` | Status do último deploy | `status deploy` |
| `rollback` | Reverte último deploy | `rollback` |

---

## Documentação

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `documenta [função/módulo]` | Gera documentação | `documenta módulo auth` |
| `documenta API` | Gera OpenAPI/Swagger | `documenta API` |
| `explica [código]` | Explica o que o código faz | `explica src/auth/auth.service.ts` |
| `explica [função]` | Explica função específica | `explica login()` |

### Exemplos

```
explica src/auth/jwt.guard.ts
→ "Este guard implementa autenticação JWT. Ele extrai o token do header
   Authorization, verifica a assinatura com a chave secreta, e injeta
   o usuário no request. Se o token é inválido, retorna 401."

explica a função calculateDiscount()
→ "Calcula o desconto baseado no plano e cupom. Usa a tabela de
   descontos progressivos: quanto maior o plano, maior o desconto."
```

---

## Perguntas e Análise

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `por que [decisão]?` | Explica decisão anterior | `por que escolheu NestJS?` |
| `por que [código]?` | Explica decisão técnica | `por que usou Prisma?` |
| `o que é [conceito]?` | Explica conceito | `o que é um guard?` |
| `como funciona [algo]?` | Explica funcionamento | `como funciona o Stripe webhook?` |
| `analisa [módulo]` | Análise de qualidade | `analisa módulo auth` |
| `revisa [módulo]` | Revisão de código | `revisa módulo billing` |

---

## Controle e Navegação

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `status` | Status atual do projeto | `status` |
| `plano` | Mostra o plano atual | `plano` |
| `progresso` | Progresso da execução atual | `progresso` |
| `pausa` | Pausa a execução | `pausa` |
| `continua` | Retoma execução pausada | `continua` |
| `muda nível [N0-N4]` | Altera nível de autonomia | `muda nível N2` |
| `autonomia [N0-N4]` | Mesmo que muda nível | `autonomia N3` |
| `histórico` | Mostra ações recentes | `histórico` |
| `log` | Mostra log da sessão | `log` |
| `audita` | Mostra trilha de auditoria | `audita` |
| `ajuda` | Mostra comandos disponíveis | `ajuda` |

---

## Memória e Aprendizado

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `o que você sabe sobre mim?` | Mostra preferências aprendidas | `o que você sabe sobre mim?` |
| `esquece que [preferência]` | Remove item da memória | `esquece que prefiro Tailwind` |
| `aprende que [preferência]` | Adiciona à memória | `aprende que prefiro FastAPI` |
| `preferências` | Lista preferências salvas | `preferências` |

---

## Projetos

| Comando | O que faz | Exemplo |
|---------|-----------|---------|
| `novo projeto [nome] --stack=[stack]` | Cria novo projeto | `novo projeto meu-saas --stack=nextjs` |
| `lista projetos` | Lista projetos | `lista projetos` |
| `abre [projeto]` | Abre projeto existente | `abre meu-saas` |
| `remove [projeto]` | Remove projeto | `remove projeto-teste` |

---

## Template de Projetos

| Stack | Comando |
|-------|---------|
| Next.js + Tailwind | `novo projeto [nome] --stack=nextjs` |
| Node.js API (NestJS) | `novo projeto [nome] --stack=nestjs` |
| Python API (FastAPI) | `novo projeto [nome] --stack=fastapi` |
| React SPA | `novo projeto [nome] --stack=react` |
| Go API | `novo projeto [nome] --stack=go` |

---

## Atalhos de Teclado

| Atalho | O que faz |
|--------|-----------|
| `Ctrl+P` | Quick Open — busca arquivos |
| `Ctrl+Shift+F` | Buscar em todos os arquivos |
| `Ctrl+S` | Salvar arquivo |
| `Ctrl+Enter` | Enviar mensagem no chat |
| `Esc` | Cancelar geração / Fechar modal |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` | Refazer |
| `Ctrl+` ` | Abrir terminal |

---

## Dicas de Uso

1. **Seja específico** — "Quero uma API REST de tarefas" funciona melhor que "Faz um sistema"
2. **Fale em português** — comandos funcionam em português natural
3. **Use frases completas** — "Adiciona autenticação por Google com OAuth 2.0" é melhor que "add auth google"
4. **Corrija pelo chat** — "Na verdade, queria MongoDB" — a IDEIA ajusta na hora
5. **Peça explicação** — se não entendeu algo, peça que a IDEIA explica

---

> **Próximo:** [EXEMPLOS.md](EXEMPLOS.md) — Exemplos completos do mundo real
