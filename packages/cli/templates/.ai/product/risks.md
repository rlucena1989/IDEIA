# Riscos do Projeto

> Versão: 2.0 | Atualizado em: 04/07/2026

## Matriz de Riscos

| #   | Risco                                                   | Probabilidade | Impacto | Nível      |
| --- | ------------------------------------------------------- | ------------- | ------- | ---------- |
| R1  | IA ignorar as regras do `laws.yaml`                     | Alta          | Alto    | 🔴 Crítico |
| R2  | Excesso de arquivos assustar devs iniciantes            | Alta          | Médio   | 🟠 Alto    |
| R3  | Desatualização dos arquivos `.ai/` ao longo do tempo    | Média         | Alto    | 🟠 Alto    |
| R4  | Fragmentação de versões do `setup.js`                   | Média         | Médio   | 🟡 Médio   |
| R5  | Dependência de um único modelo/provedor de IA           | Baixa         | Alto    | 🟡 Médio   |
| R6  | Conflito entre regras do `.ai/` e exigências do cliente | Média         | Médio   | 🟡 Médio   |
| R7  | Baixa adoção por falta de "quick win" visível           | Média         | Alto    | 🟠 Alto    |
| R8  | Complexidade de manter adapters para N linguagens       | Alta          | Médio   | 🟠 Alto    |
| R9  | Agentes ativos causando efeitos colaterais indesejados  | Baixa         | Alto    | 🟡 Médio   |
| R10 | Questionário inteligente com sugestões incorretas       | Média         | Médio   | 🟡 Médio   |

---

## Detalhamento

### 🔴 R1 — IA ignorar as regras do `laws.yaml`

**Descrição:** O modelo de IA recebe o contexto mas, sob pressão de completar
uma tarefa, gera código que viola as leis arquiteturais (ex: regra de negócio
no controller, dependência direta na camada errada).

**Por que acontece:**

- O modelo prioriza "fazer funcionar" sobre "fazer certo".
- Contexto longo dilui a atenção às regras no meio da conversa.
- Modelos diferentes têm diferentes níveis de "obediência" a instruções.
- Modelos de baixa capacidade podem não processar todas as regras do `laws.yaml`.

**Mitigações:**

- Quality gate no CI que bloqueia merges via `check-boundaries.js` e
  `static-rule-scan.js`.
- Fitness functions automatizadas (proibir imports diretos entre camadas).
- Prompt `24-architecture-review.md` obrigatório antes de cada PR.
- Regras críticas repetidas no início E no final do `ai-handoff.md`.
- `autonomous-loop.js` executa testes e detecta violações antes do commit.
- Versão compacta do `laws.yaml` para modelos com contexto limitado.

---

### 🟠 R2 — Excesso de arquivos assustar devs iniciantes

**Descrição:** Um dev que abre o projeto pela primeira vez vê ~120 arquivos
em `.ai/` e sente que é "burocracia demais" para um projeto simples.

**Por que acontece:**

- O ai-devkit foi projetado para cobertura máxima, não para mínimo viável.
- Devs iniciantes não reconhecem o valor de ADRs, fitness functions ou
  threat models até já terem sofrido sem eles.

**Mitigações:**

- Modo `--minimal` no `setup.js`: instala apenas o núcleo essencial
  (handoff, laws, patterns, prompts básicos, AppError, Contract).
- `README.md` em cada subpasta de `.ai/` explicando o propósito em 1–2 linhas.
- Documentação clara no `README.md` raiz: quais arquivos são obrigatórios
  versus opcionais versus avançados.
- Progressão guiada: `--minimal` → `--standard` → `--full` conforme
  o projeto cresce.

---

### 🟠 R3 — Desatualização dos arquivos `.ai/` ao longo do tempo

**Descrição:** O projeto evolui, mas o `ai-handoff.md`, `project-manifest.yaml`
e os prompts ficam desatualizados — a IA passa a trabalhar com contexto errado.

**Por que acontece:**

- Atualizar documentação compete com a pressão de entregar features.
- Não há mecanismo automático que force a revisão periódica.

**Mitigações:**

- `context-agent` detecta mudanças em `package.json`, `go.mod`,
  `requirements.txt` e atualiza o `ai-handoff.md` automaticamente.
- `update-memory.js` sincroniza `.ai/memory/` com o estado atual.
- CI exibe aviso (não bloqueante) se `ai-handoff.md` não foi atualizado
  há mais de 14 dias.
- Checklist de fim de sprint em `.ai/checklists/` inclui revisão do handoff.
- Datas de "última revisão" em PENDING_ACTIONs os arquivos críticos.

---

### 🟠 R7 — Baixa adoção por falta de "quick win" visível

**Descrição:** Devs instalam o ai-devkit mas não percebem benefício imediato
tangível — e abandonam antes de ver o valor real.

**Por que acontece:**

- O valor do ai-devkit é majoritariamente preventivo (evita problemas futuros).
- Sem um caso de uso "wow" no primeiro uso, a percepção é de overhead.

**Mitigações:**

- `npx ai-devkit demo`: demonstração interativa que mostra a IA gerando
  um módulo completo em 60 segundos usando os prompts do kit.
- Documentar "antes e depois" real: sessão sem ai-devkit vs. com ai-devkit.
- Garantir que o primeiro `npx ai-devkit init` entregue um projeto que
  compila, testa e tem CI funcionando — não só arquivos `.md`.
- Questionário inteligente que preenche os arquivos automaticamente:
  o dev vê valor imediato sem esforço manual de escrita.

---

### 🟠 R8 — Complexidade de manter adapters para N linguagens

**Descrição:** Cada nova linguagem suportada adiciona um adapter que precisa
ser mantido, testado e atualizado conforme as ferramentas da linguagem evoluem.

**Por que acontece:**

- Cada linguagem tem seu próprio ecossistema de linting, testes, build e
  gerenciamento de dependências.
- Breaking changes em ferramentas (ex: nova versão do ESLint, mudança no
  pytest) podem quebrar adapters silenciosamente.

**Mitigações:**

- Definir um `adapter-contract.md` claro: interface mínima que cada adapter
  deve implementar (init, lint, test, build, quality-gate).
- Testes automatizados para cada adapter em CI separado.
- Política de suporte: adapters "oficiais" (mantidos pelo core team) vs.
  "community" (mantidos pela comunidade, sem garantia de SLA).
- Versionamento semântico independente por adapter.

---

### 🟡 R4 — Fragmentação de versões do `setup.js`

**Mitigações:**

- Versionamento semântico estrito com `CHANGELOG.md`.
- `ai-devkit update` verifica e atualiza para a versão mais recente.
- `devkit-version.md` registra a versão instalada em cada projeto,
  permitindo detectar projetos desatualizados.

---

### 🟡 R5 — Dependência de um único modelo/provedor de IA

**Mitigações:**

- Design model-agnostic: PENDING_ACTIONs os prompts e arquivos `.ai/` funcionam
  com qualquer LLM.
- Testar o `ai-handoff.md` com pelo menos 3 modelos diferentes
  (Claude, GPT, Gemini) a cada release.
- Versão compacta do handoff para modelos com janela de contexto limitada.

---

### 🟡 R9 — Agentes ativos causando efeitos colaterais indesejados

**Descrição:** Os agentes `context-agent`, `quality-agent`, etc.) operam
de forma autônoma e podem modificar arquivos de forma inesperada ou
gerar ruído excessivo de notificações.

**Mitigações:**

- RN13 (regra de negócio): agentes operam em modo não-destrutivo —
  nunca modificam `src/` ou arquivos marcados como "human-owned".
- Toda ação automática registrada em `agent-activity-log.md`.
- Agentes desativáveis individualmente via `ai-devkit.config.json`.
- Modo `--dry-run` para visualizar o que o agente faria sem executar.

---

### 🟡 R10 — Questionário inteligente com sugestões incorretas

**Descrição:** A detecção automática de linguagem/framework sugere valores
errados, e o dev aceita sem revisar, gerando documentação incorreta.

**Mitigações:**

- Exibir sempre a sugestão com o campo editável — nunca preencher
  silenciosamente sem confirmação.
- Campos marcados como "decisão humana obrigatória" (RN12) nunca
  recebem sugestão automática — exigem input explícito.
- Log de detecção: mostrar ao dev qual evidência gerou cada sugestão
  (ex: "Detectei `fastapi` em `requirements.txt` → sugerindo Python/FastAPI").

---

## Plano de monitoramento

| Risco | Sinal de alerta                                       | Frequência de revisão  |
| ----- | ----------------------------------------------------- | ---------------------- |
| R1    | Aumento de PRs rejeitados por violação arquitetural   | A cada sprint          |
| R2    | Feedback de "muito complexo" em issues/discussões     | Contínuo               |
| R3    | `ai-handoff.md` não atualizado há > 14 dias           | Semanal (automatizado) |
| R4    | Mais de 2 versões do `setup.js` em uso simultâneo     | A cada release         |
| R5    | Falha de sessão com modelo diferente do padrão        | A cada release         |
| R6    | Issues de conflito com regras de cliente              | Contínuo               |
| R7    | Taxa de abandono após primeiro `init` (analytics npm) | Mensal                 |
| R8    | Adapter com falha em CI por > 7 dias                  | Semanal                |
| R9    | Entradas inesperadas em `agent-activity-log.md`       | Diário (automatizado)  |
| R10   | Reports de sugestão incorreta em issues               | Contínuo               |
