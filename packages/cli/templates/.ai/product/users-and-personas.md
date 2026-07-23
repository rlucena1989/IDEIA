# Usuários e Personas

> Versão: 2.0 | Atualizado em: 04/07/2026

## Persona 1 — O Dev Solo Amplificado

**Nome fictício:** Rafael, 28 anos
**Perfil:** Desenvolvedor pleno/sênior trabalhando sozinho ou em time pequeno.
Usa IA (Claude, Cursor, Copilot, Cline) como par de programação diário.

**Contexto:**

- Produz em alta velocidade, mas perde tempo "re-explicando" o projeto para
  a IA a cada nova sessão.
- Já teve bugs causados porque a IA gerou código fora do padrão que ele
  havia definido mentalmente, mas nunca documentou.
- Não tem time de arquitetura — ele é o arquiteto, o dev e o QA ao mesmo tempo.
- Usa múltiplos modelos de IA dependendo da tarefa (Claude para arquitetura,
  Copilot para autocompletar, GPT para debugging).

**Maior dor:**

> "Eu explico a arquitetura do projeto para a IA, ela entende, geramos código
> ótimo — mas na próxima sessão ela esqueceu tudo e começa a inventar padrões
> diferentes. Cada modelo de IA parece que nunca conversou com o outro."

**Como o ai-devkit resolve:**

- O `ai-handoff.md` elimina o re-onboarding a cada sessão e funciona com
  qualquer modelo, inclusive os mais fracos.
- O `laws.yaml` garante que a IA siga as regras mesmo sem o Rafael lembrar
  de reforçá-las verbalmente.
- Os prompts prontos em `.ai/prompts/` aceleram tarefas repetitivas
  (criar módulo, escrever teste, revisar PR, debugar).
- O `cognitive-bridge.js` transfere contexto entre sessões e modelos
  diferentes automaticamente.
- O `resource-agent` provisiona templates e snippets para que a IA não
  precise "inventar" soluções já resolvidas.

---

## Persona 2 — O Tech Lead Padronizador

**Nome fictício:** Camila, 35 anos
**Perfil:** Tech Lead de um time de 4–8 devs. Usa IA como ferramenta do time,
não apenas pessoal.

**Contexto:**

- O time usa IA de formas diferentes: cada dev tem seus próprios prompts,
  suas próprias convenções, e o resultado é código inconsistente no mesmo
  repositório.
- Perde horas em code review corrigindo estrutura de pastas, nomenclatura
  e violações de arquitetura que a IA "inventou".
- Precisa onboardar devs novos rapidamente sem depender de documentação
  desatualizada em Notion/Confluence.
- Precisa garantir que os quality gates rodem automaticamente sem depender
  de disciplina individual de cada dev.

**Maior dor:**

> "O João usa a IA de um jeito, a Ana de outro. O código que chega para mim
> no PR parece que foi escrito por três times diferentes — sendo que a IA
> deveria estar padronizando, não o contrário."

**Como o ai-devkit resolve:**

- O `.ai/` vive no repositório — PENDING_ACTIONs os devs e todas as IAs leem as
  mesmas regras, padrões e prompts.
- O `quality-gate.yaml` e as fitness functions rodam no CI via
  `check-boundaries.js` e `static-rule-scan.js`, bloqueando violações
  antes do PR chegar para a Camila.
- O `project-manifest.yaml` é a fonte única de verdade sobre a stack,
  decisões e padrões do time.
- O `audit-agent` gera relatórios periódicos de saúde do projeto sem
  intervenção manual.
- O `verify.js` executa PENDING_ACTIONs os quality gates em sequência como
  master script de validação.

---

## Persona 3 — O Consultor/Freelancer Produtivo

**Nome fictício:** Bruno, 32 anos
**Perfil:** Desenvolvedor freelancer ou consultor que atende múltiplos
clientes/projetos simultaneamente, em linguagens e stacks variadas.

**Contexto:**

- Troca de contexto entre 2–4 projetos diferentes na mesma semana,
  podendo ser TypeScript em um, Python em outro, PHP em outro.
- Cada projeto tem sua própria stack, regras e estado atual.
- Usa IA intensamente, mas o maior custo é o tempo gasto "configurando"
  a IA para cada projeto antes de produzir algo útil.
- Precisa garantir qualidade para clientes diferentes sem um processo
  padronizado entre projetos.

**Maior dor:**

> "Cada vez que abro um projeto de cliente, gasto 20–30 minutos lembrando
> onde parei, explicando para a IA o que é o projeto e quais são as regras.
> Isso multiplica por 4 projetos e vira horas perdidas por semana. E cada
> cliente usa uma linguagem diferente."

**Como o ai-devkit resolve:**

- O `ai-handoff.md` de cada projeto é o "briefing instantâneo" — cola,
  a IA está contextualizada em segundos, independente da linguagem.
- O `setup.js` idempotente com suporte multi-linguagem `--lang python`,
  `--lang php`, etc.) instala a mesma base de governança em qualquer
  projeto de cliente em menos de 1 minuto.
- Os templates e prompts são reaproveitados entre projetos sem adaptação
  — apenas o adapter de linguagem muda.
- O `session-log.md` mantém histórico de decisões e progresso por projeto,
  eliminando o esforço de "lembrar onde parei".

---

## Persona 4 — O Desenvolvedor Polyglot / Multi-Stack

**Nome fictício:** Ana, 31 anos
**Perfil:** Desenvolvedora que trabalha com múltiplas linguagens no mesmo
time ou projeto (ex: backend em Go, scripts em Python, frontend em TypeScript,
infra em HCL/Terraform).

**Contexto:**

- Precisa de governança consistente mesmo quando a stack é heterogênea.
- A IA se comporta de forma diferente para cada linguagem — sem um padrão
  unificado, cada parte do sistema parece ter sido construída por times
  diferentes.
- Quer aproveitar os mesmos prompts, ADRs e padrões de qualidade
  independente da linguagem que está usando no momento.

**Maior dor:**

> "Meu projeto tem Go no backend, Python nos scripts de ML e TypeScript no
> frontend. Cada parte tem suas próprias regras e a IA não consegue ver o
> projeto como um cada coerente."

**Como o ai-devkit resolve:**

- O núcleo `.ai/` é universal e agnóstico de linguagem — ADRs, padrões,
  qualidade e memória são compartilhados entre todas as partes do sistema.
- Adapters por linguagem `--lang go`, `--lang python`, `--lang typescript`)
  geram apenas o código específico, mantendo a governança unificada.
- O `project-manifest.yaml` descreve toda a stack heterogênea em um único
  arquivo de referência para a IA.

---

## Dores comuns a todas as personas

| Dor                                       | Mecanismo do ai-devkit que resolve                    |
| ----------------------------------------- | ----------------------------------------------------- |
| IA esquece contexto entre sessões         | `ai-handoff.md` + `cognitive-bridge.js`               |
| IA gera código fora do padrão             | `laws.yaml` + `.ai/patterns/` + `static-rule-scan.js` |
| Decisões arquiteturais se perdem          | `.ai/architecture/adr/` + `decisions.md`              |
| Bugs recorrentes sem rastreabilidade      | `error-catalog.md` + `lessons-learned.md`             |
| Onboarding lento de dev/IA novo           | `ai-handoff.md` + `project-manifest.yaml`             |
| Testes ignorados sob pressão de prazo     | `quality-gate.yaml` + `ci-gate.md` no CI              |
| Documentação desatualizada                | `context-agent` mantém `.ai/` sincronizado            |
| IA reinventa soluções já resolvidas       | `known-patterns.md` + `resource-agent`                |
| IA sugere caminhos já descartados         | `rejected-ideas.md`                                   |
| Inconsistência entre múltiplas linguagens | Adapters + núcleo `.ai/` universal                    |
| Auditoria manual de segurança e qualidade | `audit-agent` + `check-boundaries.js`                 |
