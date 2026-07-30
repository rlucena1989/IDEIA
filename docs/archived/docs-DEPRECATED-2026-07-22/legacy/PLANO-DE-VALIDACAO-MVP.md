# Plano de Validação do MVP — IDEIA (Fase 0)

> **Propósito:** Validar que o MVP entrega valor real antes de avançar para a Fase 1.
> **Duração da Fase 0:** Semanas 1-4 (15 tasks técnicas + 4 QA)

---

## 10 Cenários de Teste Obrigatórios

### Cenário 1: Chat Streaming — Pergunta e Resposta
**Descrição:** Usuário envia pergunta no chat e recebe resposta via SSE streaming.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Abrir IDEIA | Dashboard + Chat + Editor visíveis |
| 2 | Digitar "explique o que é TypeScript em 3 linhas" | Input aparece no chat |
| 3 | Pressionar Enter | Resposta começa a streamar token por token |
| 4 | Aguardar conclusão | Resposta completa com markdown renderizado |
| 5 | Clicar "Parar" no meio da resposta | Geração interrompe imediatamente |

**Critério de sucesso:** TTFT < 500ms (local) · Streaming visível token-a-token · Stop funcional · Markdown renderizado

---

### Cenário 2: Chat → Execução de Comando
**Descrição:** Usuário pede para executar um comando via chat.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Digitar "roda os testes" no chat | Intent classifier identifica ação de execução |
| 2 | Aguardar processamento | Task runner executa `npm test` |
| 3 | Ver resultado | Output do terminal aparece no chat |
| 4 | Verificar fallback | Se comando falha, erro é exibido no chat |

**Critério de sucesso:** Comando executado · Output exibido · Erro capturado e mostrado

---

### Cenário 3: Chat → Engineer Pipeline (CRUD)
**Descrição:** Usuário descreve uma mudança de código e a IDEIA implementa.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Digitar "adiciona validação de email no cadastro de usuário" | Sistema entende a intenção |
| 2 | Ver plano gerado | Plano com 3-5 steps exibido no chat |
| 3 | Aprovar plano | Clicar "Aprovar" no plano |
| 4 | Acompanhar implementação | Progresso visível no chat (dif file a file) |
| 5 | Revisar diff | Diff preview de cada arquivo alterado |
| 6 | Aprovar alterações | Clicar "Aprovar" em cada diff |
| 7 | Verificar resultado | Arquivos alterados, testes passando |

**Critério de sucesso:** Plano gerado · Implementação executa · Diff preview funciona · Aprovação persiste

---

### Cenário 4: CRUD de Arquivos
**Descrição:** Usuário cria, edita, renomeia e deleta arquivos.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Clicar direito no File Explorer → Novo Arquivo | Context menu abre |
| 2 | Digitar "teste.txt" | Arquivo criado na árvore |
| 3 | Clicar no arquivo | Abre no Monaco Editor |
| 4 | Digitar código e Ctrl+S | Arquivo salvo (dirty state some) |
| 5 | Clicar direito → Renomear (F2) | Inline renomeia |
| 6 | Clicar direito → Deletar | Confirmação aparece |
| 7 | Confirmar deleção | Arquivo some da árvore |

**Critério de sucesso:** CRUD funcional · Path traversal bloqueado · Backup criado em `.ai/backups/`

---

### Cenário 5: Memória → Contexto do Chat
**Descrição:** Decisões anteriores influenciam respostas futuras.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Perguntar "qual stack você recomenda para este projeto?" | IA responde com recomendação |
| 2 | Responder "prefiro FastAPI em vez de NestJS" | Preferência registrada na memória |
| 3 | Fechar e reabrir a IDEIA | Sessão reinicia |
| 4 | Perguntar "qual framework web usamos?" | IA lembra que você prefere FastAPI |

**Critério de sucesso:** Preferência persiste entre sessões · Contexto incluído no prompt · Limite de 128K tokens respeitado

---

### Cenário 6: Quick Open e Navegação
**Descrição:** Usuário navega pelo projeto usando Ctrl+P.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Pressionar Ctrl+P | Modal Quick Open abre |
| 2 | Digitar parte do nome de um arquivo | Fuzzy match encontra o arquivo |
| 3 | Pressionar Enter | Arquivo abre no editor |
| 4 | Digitar `:comando` | Comandos aparecem nos resultados |
| 5 | Pressionar Escape | Modal fecha |

**Critério de sucesso:** Fuzzy match em 10K+ arquivos < 2s · Enter abre no editor · Escape fecha

---

### Cenário 7: Dashboard com Dados Reais
**Descrição:** Dashboard mostra métricas reais do projeto.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Abrir a IDEIA | Dashboard visível (não SAMPLE_DATA) |
| 2 | Verificar métricas | Número de arquivos, commits, tasks, health score |
| 3 | Aguardar 30s | Dados atualizam automaticamente |
| 4 | Executar uma task via chat | Health score e métricas mudam |

**Critério de sucesso:** Nenhum SAMPLE_DATA · Dados reais · Atualização a cada 30s

---

### Cenário 8: Checkpoint de Plano — Aprovação Parcial
**Descrição:** Usuário aprova parte do plano e rejeita outra.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Pedir "cria um sistema de autenticação completo" | Plano com múltiplos steps é gerado |
| 2 | Aprovar step 1 (modelo User) | Step 1 é aprovado |
| 3 | Rejeitar step 2 (JWT) com motivo | Step 2 é rejeitado |
| 4 | Acompanhar execução | Só step 1 é executado |
| 5 | Verificar persistência | Decisões salvas na memória |

**Critério de sucesso:** Aprovação parcial funcional · Decisões persistem · Motivo registrado

---

### Cenário 9: Níveis de Autonomia
**Descrição:** Usuário muda nível de autonomia e comportamento da IA se adapta.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Status Bar mostra nível atual | Nível visível (ex: N1) |
| 2 | Executar tarefa no N1 | IA pede aprovação antes de escrever |
| 3 | Mudar para N2 via comando | IA executa ciclos sem pedir a cada diff |
| 4 | Executar tarefa no N2 | IA implementa módulo e pede aprovação ao final |
| 5 | Mudar para N0 | IA só sugere, não executa |

**Critério de sucesso:** N0 bloqueia escrita · N1 requer aprovação · N2 executa ciclos · Mudança é instantânea

---

### Cenário 10: Qualidade — Quality Gates Iniciais
**Descrição:** Sistema impede commit se quality gates falham.

| Etapa | Ação | Resultado Esperado |
|-------|------|--------------------|
| 1 | Introduzir erro de lint proposital | ESLint detecta erro |
| 2 | Tentar commit | Hook pré-commit bloqueia |
| 3 | Corrigir erro | Commit passa |
| 4 | Introduzir erro de tipo | TypeScript detecta |
| 5 | Tentar commit | Bloqueado novamente |
| 6 | Executar `ai-devkit verify` | Todos os gates rodam |

**Critério de sucesso:** Lint = 0 errors · Test = 100% pass · Build limpo · Husky trava se falha

---

## Checklist de Aceite do MVP

- [ ] Chat envia e recebe mensagens via SSE streaming
- [ ] Markdown renderizado no chat (lists, code blocks, tables)
- [ ] Botão "Parar" interrompe geração
- [ ] Chat → Task Runner: comandos executam via chat
- [ ] Chat → Engineer: mudanças implementadas via chat
- [ ] Plano gerado com 3-5 steps antes da execução
- [ ] Diff preview de cada arquivo alterado
- [ ] Aprovação/rejeição de diffs
- [ ] CRUD de arquivos (criar, editar, renomear, deletar)
- [ ] File Watcher via chokidar (mudanças aparecem em < 500ms)
- [ ] Context menu no File Explorer
- [ ] Memória persiste entre sessões (cross-session)
- [ ] Contexto da memória incluído em prompts
- [ ] Quick Open (Ctrl+P) com fuzzy match
- [ ] Status Bar com branch, problemas, autonomia, LLM ativo
- [ ] Dashboard com dados reais (sem SAMPLE_DATA)
- [ ] Quality gates: lint, test, build
- [ ] Níveis de autonomia: N0 (assistido), N1 (supervisionado), N2 (semi-autônomo)
- [ ] Mínimo 1 provider de LLM funcional (Ollama)
- [ ] Backup automático pré-sobrescrita

## O que NÃO Testar no MVP

| Funcionalidade | Por que fica de fora | Quando testar |
|---------------|----------------------|---------------|
| NATS JetStream persistente | Fase 1 — infraestrutura | Semana 5 |
| Multi-agente (6 agentes colaborando) | Fase 3 — orquestração | Semana 13 |
| Prompt injection scanner (LLM Guard) | Fase 2 — segurança | Semana 9 |
| Output validation (PII, safety) | Fase 2 — segurança | Semana 9 |
| Audit hash chain | Fase 1 — governance | Semana 5 |
| Intent classifier LLM-based | Fase 2 — inteligência | Semana 9 |
| ADAPT decomposition | Fase 2 — inteligência | Semana 9 |
| Cross-project learning | Fase 5 — aprendizado | Semana 29 |
| Terminal real (xterm.js + node-pty) | Fase 4 — delivery | Semana 21 |
| GitOps (ArgoCD/Flux) | Fase 4 — delivery | Semana 21 |
| IaC generation (OpenTofu) | Fase 4 — delivery | Semana 21 |
| Feature flags | Fase 4 — delivery | Semana 21 |
| Theia Platform integration | Fase 3 — plataforma | Semana 13 |
| Performance benchmarks | QA contínuo | A partir da Fase 1 |
| Testes E2E completos | QA contínuo | A partir da Fase 1 |
| Testes de segurança (injection suite) | Fase 2 | Semana 9 |
| Mobile / responsivo | v2+ | Depois do MVP |

## Critérios de Bloqueio (MVP não pode lançar se)

1. Chat não consegue enviar/receber mensagens SSE
2. Plano não é gerado a partir do prompt do usuário
3. Alterações de código não são aplicadas via chat
4. CRUD de arquivos não funciona
5. Memória não persiste entre sessões
6. Quality gates falham sem feedback claro
7. A IDEIA quebra (crash) em fluxo básico

## Métricas de Sucesso do MVP

| Métrica | Alvo | Como medir |
|---------|------|-----------|
| Chat → primeira resposta | < 2s (local) | Benchmark interno |
| Chat → task executada | < 30s | Log de auditoria |
| Planos gerados corretamente | > 80% | Aprovação humana |
| Taxa de erro em tarefas | < 15% | Dashboard |
| NPS (Net Promoter Score) | > 30 | Survey |

---

> **MVP aprovado ↔ Início da Fase 1**
> Revise este plano a cada checkpoint de fase.
