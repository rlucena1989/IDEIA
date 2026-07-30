---
id: ADR-005
title: Cedar como Policy Engine
status: Approved
date: 2026-07-17
deciders: Arquiteto, Tech Lead, Security Engineer
consulted: Equipe de Governança
---

# ADR-005: Cedar como Policy Engine

**Status:** Approved

## Contexto

O policy-engine atual do ai-devkit é uma implementação caseira com 27 padrões de matching (auto/ask/block) baseada em switch-case e expressões regulares. Essa abordagem não escala: não há suporte a policy-as-code com validação estática, não há separação clara entre política e implementação, e a cada novo padrão é necessário modificar o código do engine. Para o IDEIA, o policy engine precisa ser extensível, auditável, testável isoladamente, e capaz de expressar políticas complexas (ex: "agente pode executar npm install apenas se projeto for Node.js e usuário tiver papel 'senior'").

O ecossistema de policy-as-code tem dois líderes: OPA (Open Policy Agent) com sua linguagem Rego, e Cedar (AWS Verified Permissions). Ambos oferecem avaliação de políticas baseada em `{principal, action, resource, context}`, validação estática, e capacidade de deploy como sidecar ou Wasm. A escolha impacta simplicidade de integração com Node.js, performance, e familiaridade do time.

Três opções foram consideradas: (1) Cedar (AWS), (2) OPA/Rego (CNCF), (3) Manter e expandir policy-engine caseiro.

## Decisão

Adotar Cedar (AWS) como policy engine do IDEIA. Utilizar o formato Cedar `{principal, action, resource, context}` para modelar todas as decisões de autorização. Políticas serão escritas em Cedar, validadas estaticamente com `cedar validate`, e avaliadas via Wasm (integração Node.js sem overhead de HTTP). O policy-engine caseiro será deprecado gradualmente, mantendo compatibilidade via wrapper que traduz os 27 patterns existentes para políticas Cedar.

## Consequências

**Positivas:**
- Políticas declarativas e legíveis — `permit(principal in Role::"admin", action in Action::"execute", resource)` — versus código imperativo com switch-case
- Validação estática de políticas em tempo de CI/CD (erros de política são capturados antes de produção)
- Avaliação via Wasm permite integração Node.js sem servidor HTTP adicional (sub-1ms por avaliação)
- Sintaxe mais simples que Rego (curva de aprendizado menor)
- AWS Verified Permissions como backend gerenciado se necessário no futuro
- Separação clara entre política (Cedar) e implementação (TypeScript) — políticas podem ser mantidas por time de segurança
- Modelo de entidades permite contexto rico (usuários, agentes, projetos, ações)

**Negativas:**
- Nova linguagem de política requer aprendizado do time
- Ecosistema menor que OPA (comunidade, ferramentas, exemplos)
- Sem suporte nativo a bundles de política (OPA tem distribution via bundles)
- Sem suporte a decisões baseadas em dados externos (OPA tem `data` documents) — dados contextuais precisam ser passados explicitamente
- Ferramentas de debug menos maduras que OPA (Rego Playground, OPA REPL)
- Wasm pode ter limitações de memória para conjuntos grandes de políticas

## Decision

Adopt Cedar (AWS) as the IDEIA policy engine. Use the Cedar `{principal, action, resource, context}` model for all authorization decisions. Policies are written in Cedar, statically validated with `cedar validate`, and evaluated via Wasm for Node.js integration without HTTP overhead. The existing hand-coded policy engine will be gradually deprecated, maintaining compatibility via a wrapper that translates the 27 existing patterns into Cedar policies.

## Consequences

**Positive:** Declarative, readable policies — `permit(principal in Role::"admin", action in Action::"execute", resource)` vs imperative switch-case; static policy validation at CI/CD time (policy errors caught before production); Wasm evaluation enables sub-1ms Node.js integration without additional HTTP server; simpler syntax than Rego (lower learning curve); AWS Verified Permissions as managed backend option; clear separation between policy (Cedar) and implementation (TypeScript); rich entity model supporting users, agents, projects, and actions.

**Negative:** New policy language requires team learning; smaller ecosystem than OPA (community, tools, examples); no native policy bundle support (OPA has distribution via bundles); no support for external data-based decisions (OPA has `data` documents) — contextual data must be passed explicitly; less mature debug tools than OPA (Rego Playground, OPA REPL).

**Risk:** Wasm may have memory limitations for large policy sets; smaller community may result in slower issue resolution and fewer available examples.

## Opções Consideradas

| Opção | Descrição | Motivo para Rejeição |
|-------|-----------|---------------------|
| OPA / Rego (CNCF) | Policy engine maduro com linguagem Rego | Sintaxe Rego mais complexa (Prolog-like); integração Node.js via HTTP adiciona latência; Wasm OPA é menos maduro que Cedar Wasm; Rego é mais verboso para casos de uso simples |
| Manter policy-engine caseiro | Expandir engine para suportar mais 27+ patterns | Sem validação estática, sem isolamento entre política e implementação; testabilidade limitada; cada nova política requer deploy de código; risco de segurança por falta de auditoria formal |
| OpenFGA (Auth0) | Modelo de permissão baseado em grafos (Google Zanzibar) | Overhead de infraestrutura (servidor, banco); focado em autorização de usuários, não em políticas de agentes; modelo ReBAC supera requisitos atuais |

## Referências

- `docs/ESTUDOS/SEGURANCA-PROMPT-GOVERNADOR-AI.md` — Segurança e governança de IA
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Categoria F (Segurança e Governança), seção F1 (OPA/Cedar)
- `docs/ESTUDOS/IDEIA-MASTER.md` — Camada de Segurança com Cedar Policy Engine
- `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` — Camada 2 (Segurança), contratos entre camadas
- Cedar Docs: https://docs.cedarpolicy.com/
- Cedar Wasm: https://github.com/cedar-policy/cedar-wasm
- OPA Wasm: https://www.openpolicyagent.org/docs/latest/wasm/
