# Objetivos de Negócio

> Versão: 2.0 | Atualizado em: 04/07/2026

## Meta principal

Tornar o ai-devkit o padrão de referência para desenvolvimento assistido por
IA em qualquer linguagem de programação (TypeScript, Python, Go, Rust, Java,
C#, C++, PHP, HTML/CSS e outras) — da mesma forma que `create-react-app` ou
`create-next-app` se tornaram o ponto de partida óbvio para seus ecossistemas.

O ai-devkit não é apenas um instalador de arquivos: é um **agente ativo de
governança** que participa do ciclo completo de desenvolvimento, fornecendo
contexto, templates, quality gates, auditoria e sincronização automática para
que a IA produza sistemas melhores, mais completos e de alta qualidade — 5x
ou mais rápido do que a IA trabalhando sozinha.

---

## Objetivos por horizonte

### Curto prazo (0–3 meses)

- Consolidar o `setup.js` como ferramenta estável e idempotente, cobrindo
  100% do ciclo de vida de um projeto (discovery → produção) em tempo recorde.
- Ter documentação interna suficiente para que qualquer IA — incluindo modelos
  de baixa capacidade e contexto reduzido (Claude Haiku, GPT-3.5, Mistral,
  modelos locais via Ollama) — consiga retomar o projeto em menos de 2 minutos
  usando apenas o `ai-handoff.md`.
- Cobrir todos os arquivos de alta prioridade ausentes:
  - `.github/workflows/ci.yml` e `release.yml`
  - `module-boundaries.md`
  - `threat-model.md`
  - `rollback-plan.md`
  - `decisions-log.md`
  - `lessons-learned.md`
  - `agent-architecture.md`
  - `questionnaire-spec.md`
- Implementar o questionário inteligente de inicialização com sugestões
  automáticas baseadas na detecção do projeto existente.
- Implementar o modo `--minimal` para reduzir barreira de entrada.

### Médio prazo (3–6 meses)

- Publicar o ai-devkit como pacote npm executável via
  `npx ai-devkit@latest init` em qualquer projeto novo.
- Ter pelo menos um "golden path" documentado e testado end-to-end para
  NestJS + Prisma + PostgreSQL, do zero até deploy em produção.
- Lançar adapters oficiais para as 3 linguagens mais demandadas além de
  TypeScript (candidatos: Python, Go, Java).
- Ativar os agentes de ciclo de vida:
  - `context-agent` — mantém `ai-handoff.md` atualizado automaticamente.
  - `quality-agent` — executa quality gates em pre-commit e CI.
  - `audit-agent` — gera relatórios de auditoria periódicos.
  - `resource-agent` — provisiona templates e snippets para a IA.
- Tornar o ai-devkit ativamente participativo: a IA usa os recursos do kit
  para produzir sistemas 5x mais rápido com qualidade máxima.

### Longo prazo (6+ meses)

- Ser referenciado em artigos, talks e cursos como o padrão de governança
  para projetos com IA como co-desenvolvedor.
- Suportar múltiplos "flavors" de instalação (API REST, GraphQL,
  microsserviços, CLI tool, frontend, mobile) mantendo o mesmo núcleo
  de governança `.ai/`.
- Construir ecossistema de adapters contribuídos pela comunidade.
- Ser o ponto de partida padrão para times que adotam IA como
  co-desenvolvedor ativo, não apenas assistente.

---

## Como medir na prática

| Métrica                            | Como medir                                               | Meta                         |
| ---------------------------------- | -------------------------------------------------------- | ---------------------------- |
| Tempo de retomada de sessão        | Cronometrar do "cole o handoff" até primeiro commit útil | < 2 minutos                  |
| Consistência arquitetural          | % de módulos novos sem correção manual de estrutura      | > 95%                        |
| Cobertura de testes                | Relatório do Jest/pytest/go test no CI                   | ≥ 85%                        |
| ADRs registradas                   | Contagem em `.ai/architecture/adr/`                      | 100% das decisões relevantes |
| Adoção externa                     | Stars no GitHub, downloads npm, forks                    | Crescimento mês a mês        |
| Retrabalho evitado                 | Nº de PRs rejeitados por violação arquitetural           | Tendência a zero             |
| Aceitação do questionário          | % de sugestões automáticas aceitas sem edição            | > 80%                        |
| Velocidade de desenvolvimento      | Comparativo de tempo com/sem ai-devkit                   | 5x ou mais rápido            |
| Compatibilidade com modelos fracos | Sessão funcional com modelo de contexto < 8k tokens      | 100% via handoff mínimo      |
| Cobertura de linguagens            | Adapters oficiais disponíveis e testados                 | +1 linguagem por trimestre   |
