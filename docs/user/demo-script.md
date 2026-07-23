# Video Demo Script — IDEIA

> Duração: ~5 minutos

## Cena 1: Abertura (30s)

**Tela:** Logo IDEIA + tagline "Dê a ideia, nós entregamos a solução."

**Narrador:** "Conheça a IDEIA — a primeira IDE que transforma ideias em sistemas completos. Não é um gerador de código. É um parceiro de desenvolvimento que entende o que você quer construir."

---

## Cena 2: O Problema (30s)

**Tela:** Split screen — dev digitando código manual vs IDEIA com prompt

**Narrador:** "Você descreve o que precisa em linguagem natural. A IDEIA planeja, projeta, codifica, testa, revisa e entrega — com qualidade de produção."

---

## Cena 3: Demonstração ao Vivo (2min)

**Tela:** IDEIA rodando, widget de chat aberto

**Narrador:** "Vamos construir um CRUD de usuários com autenticação JWT."

**Ação:** Digitar no chat: "Crie um CRUD de usuários com login JWT, cadastro com email/senha, listagem com paginação, busca por nome, edição e exclusão. Use PostgreSQL, React, validação Zod."

**Tela:** Mostrar o plano gerado pelos agentes:
- Analyst analisa requisitos
- Architect define arquitetura
- Programmer gera código
- Reviewer revisa
- Tester cria testes
- DevOps configura CI/CD

**Narrador:** "Seis agentes especializados trabalham em paralelo, coordenados pelo LangGraph. Cada etapa é verificada por políticas de segurança."

---

## Cena 4: Segurança e Compliance (1min)

**Tela:** Security Dashboard widget

**Narrador:** "A IDEIA verifica cada linha contra 15+ políticas de segurança. Detecta jailbreak, viés, conteúdo sensível. Tudo auditado com SHA-256 chain."

**Ação:** Mostrar o audit trail expandido com hash chain

---

## Cena 5: Observabilidade (30s)

**Tela:** Grafana dashboard com métricas

**Narrador:** "Métricas Prometheus, tracing distribuído, SLO tracking e dashboards Grafana. Você vê exatamente o que está acontecendo."

---

## Cena 6: Encerramento (30s)

**Tela:** CTA — "Comece agora"

**Narrador:** "IDEIA. Descreva sua ideia. Nós entregamos o sistema."

**Tela:** Links: GitHub, Docs, Discord, npm install -g @ideia/cli

---

## Setup Técnico

```bash
# Iniciar ambiente de demo
ideia start --demo-mode

# Garantir NATS rodando
cd docker/nats && docker-compose up -d

# Garantir Ollama com modelo
ollama pull phi-4-mini

# Monitoramento
cd docker/monitoring && docker-compose up -d
```

## Checklist Pré-Gravação

- [ ] NATS rodando
- [ ] Ollama com modelo leve
- [ ] Projeto demo limpo
- [ ] Grafana dashboard visível
- [ ] Security widget com dados mock
- [ ] Audit trail com entradas de exemplo
