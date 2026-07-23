# G6 — Geração de Código a partir de SpecAST

> **Tipo**: `structural-gap`  
> **Status**: `study-active`  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

O Estudo 14 implementa geração de testes a partir de spec, mas ninguém no ecossistema gera código de produção a partir de SpecAST (Abstract Syntax Tree de especificação). Isso significaria: usuário escreve spec de alto nível (interface, comportamento, contratos) → sistema gera código TypeScript, Python, Go etc. automaticamente. É um gap de alto valor estratégico mas de maturidade técnica baixa — nenhum concorrente faz isso de forma confiável.

**Decisão recomendada**: 🔍 INVESTIGAR — Score 2.9. Reavaliar quando mercado amadurecer.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Model-Driven Development (MDD), Code Generation, AST Transformation, Program Synthesis.
- **Concorrentes**: NENHUM concorrente faz geração de código de produção a partir de spec de forma confiável. Cursor, Copilot, Devin fazem geração via LLM (texto → código), não spec → código. O GitHub Copilot tem "Code generation from PR descriptions" mas é limitado.
- **Open source**: `prisma` (schema → DB code), `openapi-generator` (OpenAPI → client/server), `graphql-codegen` (GraphQL schema → TypeScript), `plop` (scaffolding), `hygen` (code generators).
- **Papers**: "Program Synthesis with Large Language Models" (Austin et al., 2021). "Type-Directed Program Synthesis" (Polikarpova et al., PLDI 2016). A área de Program Synthesis é ativa mas não madura para spec→código geral.

### 1.3 Análise Técnica

**Arquitetura proposta (conceitual)**:
```
SpecAST (YAML/JSON)
  ├── Entity definitions
  ├── Service interfaces
  ├── Data contracts
  ├── Workflow definitions
  └── Business rules

Code Generator
  ├── EntityGenerator → classes/models TypeScript
  ├── ServiceGenerator → implementations (scaffold only)
  ├── ContractGenerator → validators (Zod/Ajv)
  ├── RouteGenerator → API route stubs
  └── TestGenerator → test skeleton (already exists in Study 14)
```

**Dependências**: `packages/contracts/` (G4), TypeScript Compiler API (para AST), adapters de linguagem (Python, Go, NestJS).

### 1.4 Riscos e Limitações

- **Falsa generalidade**: Código gerado por spec é geralmente template + placeholders — longe de código real de produção.
- **Qualidade imprevisível**: Specs ambíguas geram código quebrado — exigir validação humana obrigatória.
- **Manutenção**: Geradores precisam evoluir com as linguagens — equipe dedicada.
- **Adoção**: Times preferem escrever código manualmente a editar specs — risco de baixa adoção.

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 3 | 9 |
| **Diferenciação** | 2 | 4 | 8 |
| **Sinergia c/ arquitetura** | 2 | 3 | 6 |
| **Custo-benefício** | 2 | 2 | 4 |
| **Maturidade** | 1 | 2 | 2 |

**Score = (9 + 8 + 6 + 4 + 2) / 10 = 2.9** 🔍 INVESTIGAR

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **L** | 5-8 | Novo módulo complexo, múltiplos geradores, baixa maturidade |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-19 — Investigação de Geração de Código por Spec

```markdown
# Tarefa — Investigação: Geração de Código via SpecAST

## ID: TASK-IDE-19 | Módulo: codegen-spec | Tipo: investigate

## Objetivo: Investigar viabilidade técnica e de mercado da geração de código a partir de SpecAST.

## Dependências
- Nenhuma (investigação independente)

## Critérios de aceite
### Subtarefa 19.1 — Pesquisa complementar
- [ ] Mapear 5 ferramentas open source de codegen (openapi-generator, prisma, graphql-codegen, etc.)
- [ ] Testar cada ferramenta com spec real do AI-Devkit
- [ ] Documentar qualidade do código gerado (escala 1-5)

### Subtarefa 19.2 — Protótipo limitado
- [ ] Gerar scaffold de entidade TypeScript a partir de spec JSON
- [ ] Gerar validador Zod a partir de spec de contrato
- [ ] Gerar rota Express a partir de spec de API
- [ ] Comparar com código escrito manualmente (linhas, complexidade)

### Subtarefa 19.3 — Relatório de viabilidade
- [ ] Custo × benefício realista (horas de implementação vs horas economizadas)
- [ ] Recomendação: full codegen vs. scaffold-only vs. não fazer
- [ ] PDF em `docs/ESTUDOS/G6-CODEGEN-SPECAST/DECISAO.md`

## Arquivos que PODEM ser alterados
- `docs/ESTUDOS/G6-CODEGEN-SPECAST/` (documentos de investigação)
- `packages/codegen-spec/src/` (protótipo, se aprovado)

## Riscos
- Protótipo pode sugerir viabilidade falsa — testar com specs reais, não idealizadas
- Código gerado pode ser inseguro — exigir revisão de segurança

## Verificação
- [ ] Protótipo funcional com 3 exemplos reais
- [ ] Relatório comparativo com métricas objetivas
```

### 3.2 Contratos

*(Nenhum contrato novo — gap em fase de investigação)*

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G6: Geração de Código a partir de SpecAST

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G6-CODEGEN-SPECAST/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G6-CODEGEN-SPECAST/README.md
  │
  ├──> PESQUISA (Fase 1) → Sem concorrentes fazendo, maturidade baixa
  │
  ├──> ANÁLISE (Fase 2) → Score 2.9 — 🔍 INVESTIGAR
  │     │
  │     └──> INVESTIGA → Protótipo + relatório de viabilidade
  │           │
  │           ├──> Viável → DECISAO.md justifica + novo estudo
  │           │
  │           └──> Inviável → docs/ESTUDOS/G6-CODEGEN-SPECAST/DECISAO.md
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
       (reavaliar se concorrentes lançarem codegen)
```

---

## Referências

- Estudo 14 — Geração de testes a partir de spec
- OpenAPI Generator — `openapi-generator.tech`
- Prisma — `prisma.io` (schema → code)
- GraphQL Code Generator — `graphql-code-generator.com`
- "Program Synthesis with Large Language Models" — Austin et al., 2021
- "Type-Directed Program Synthesis" — Polikarpova et al., PLDI 2016
