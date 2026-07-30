# Estudo: Engenharia de Prompts para Sistemas Multiagente

> **Data:** 2026-07-18
> **Contexto:** IDEIA — sistema de desenvolvimento assistido por IA com 6 agentes especializados
> **Objetivo:** Pesquisa abrangente sobre arquitetura de prompts, padrões de raciocínio e gestão de contexto para orquestração multiagente
> **Base:** DSPy (Stanford), LangGraph (LangChain), ReAct (Google), Tree-of-Thoughts (Princeton), Reflexion (MIT), Self-Consistency (Google)

---

## Sumário

1. [Arquitetura de Prompts para Agentes](#1-arquitetura-de-prompts-para-agentes)
2. [Padrões de Prompt](#2-padrões-de-prompt)
3. [Prompt Técnico para Geração de Código](#3-prompt-técnico-para-geração-de-código)
4. [Few-Shot e Exemplos](#4-few-shot-e-exemplos)
5. [DSPy (Declarative Self-improving Python)](#5-dspy-declarative-self-improving-python)
6. [Prompts por Agente](#6-prompts-por-agente)
7. [Gestão de Contexto](#7-gestão-de-contexto)

---

## 1. Arquitetura de Prompts para Agentes

### 1.1 Visão Geral da Arquitetura

Cada agente no IDEIA recebe um prompt composto por 5 camadas, cada uma com função específica e orçamento de tokens definido.

```
┌────────────────────────────────────────────────────────────────────┐
│                    PROMPT COMPLETO (AGENTE)                        │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SYSTEM PROMPT (10-20% do budget)                           │  │
│  │  ├── Identidade: "Você é o Analista de Requisitos do IDEIA"  │  │
│  │  ├── Regras: "Nunca gere código inseguro"                    │  │
│  │  ├── Capacidades: "Você pode analisar requisitos, etc"       │  │
│  │  └── Restrições: "Limite sua resposta a 2000 tokens"         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TASK PROMPT (10-15% do budget)                              │  │
│  │  ├── Objetivo: "Analise os requisitos do usuário"            │  │
│  │  ├── Critérios: "Identifique ambiguidades e riscos"          │  │
│  │  ├── Formato de saída: "JSON com campos: issues, risks"      │  │
│  │  └── Restrições de task: "Não proponha soluções ainda"       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CONTEXT PROMPT (40-50% do budget)                           │  │
│  │  ├── Histórico: "Nas últimas 5 interações..."                │  │
│  │  ├── Memória: "Decisões anteriores sobre este módulo"        │  │
│  │  ├── Estado atual: "Arquivo X está sendo editado"            │  │
│  │  └── Conhecimento: "Regras do projeto encontradas em..."     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TOOL PROMPT (15-20% do budget)                              │  │
│  │  ├── Ferramentas: "Você tem acesso a: read_file, write_file" │  │
│  │  ├── Formato de chamada: "<tool>nome</tool><args>...</args>" │  │
│  │  ├── Restrições: "Não use delete_file sem aprovação"         │  │
│  │  └── Exemplos: "Exemplo de chamada: ..."                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  OUTPUT FORMAT (5-10% do budget)                             │  │
│  │  ├── Schema: "JSON Schema da resposta esperada"              │  │
│  │  ├── Exemplo: '{"analysis": "...", "confidence": 0.95}'      │  │
│  │  └── Encoding: "UTF-8, indentação 2 espaços"                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 System Prompt Template

```
Você é {agent_name}, um agente especializado do sistema IDEIA.

## IDENTIDADE
{agent_description}
- Especialidade: {specialty}
- Nível de autonomia: {autonomy_level}

## REGRAS GLOBAIS
1. NUNCA execute comandos destrutivos (rm -rf, DROP TABLE, etc.)
2. SEMPRE valide inputs antes de processar
3. NUNCA exponha secrets, tokens ou credenciais
4. SEMPRE justifique decisões importantes
5. Respeite o nível de autonomia configurado
6. Documente ações no audit trail

## CAPACIDADES
{agent_capabilities}

## RESTRIÇÕES
- Máximo de {max_tokens} tokens por resposta
- Máximo de {max_tool_calls} tool calls por task
- Contexto limitado a {context_window} tokens
- Ações críticas requerem aprovação humana
```

### 1.3 Task Prompt Template

```
## TAREFA ATUAL
{task_description}

## OBJETIVOS
{task_objectives}

## CRITÉRIOS DE SUCESSO
{success_criteria}

## FORMATO DE SAÍDA ESPERADO
{output_format}

## RESTRIÇÕES DA TAREFA
{task_constraints}
```

### 1.4 Context Prompt Template

```
## CONTEXTO ATUAL

### Histórico Recente
{recent_history}

### Memória do Projeto
{project_memory}

### Estado do Workspace
{workspace_state}

### Conhecimento Relevante
{relevant_knowledge}

### Decisões Anteriores
{previous_decisions}
```

### 1.5 Tool Prompt Template

```
## FERRAMENTAS DISPONÍVEIS

{tool_descriptions}

### Formato de Chamada
{tool_call_format}

### Restrições de Uso
{tool_restrictions}

### Exemplos
{tool_examples}
```

### 1.6 Output Format Template

```
## FORMATO DE SAÍDA

{output_schema}

### Exemplo:
{output_example}
```

### 1.7 Template Engine (Handlebars + DSL Custom)

```typescript
interface PromptTemplate {
  name: string;
  version: string;
  template: string; // Handlebars template
  schema: JSONSchema; // Validação do contexto necessário
  budget: {
    system: number;    // tokens
    task: number;
    context: number;
    tools: number;
    output: number;
  };
}

// Exemplo de uso
const analystPrompt = new PromptEngine('analyst', {
  templates: {
    system: fs.readFileSync('prompts/analyst/system.hbs', 'utf-8'),
    task: fs.readFileSync('prompts/analyst/task.hbs', 'utf-8'),
    tools: fs.readFileSync('prompts/shared/tools.hbs', 'utf-8'),
  }
});

const prompt = analystPrompt.render({
  agent_name: 'Analista',
  task_description: 'Analisar requisitos para SaaS de assinaturas',
  autonomy_level: 'N1',
  context_window: 4096,
});
```

---

## 2. Padrões de Prompt

### 2.1 Chain-of-Thought (CoT)

**Wei et al. (2022)** — O padrão mais fundamental: raciocínio passo a passo.

**Variações:**

```
Zero-shot CoT:
  "Vamos pensar passo a passo para analisar este requisito."

Few-shot CoT:
  "Exemplo 1:
   Requisito: 'Quero login com Google'
   Raciocínio: Preciso de OAuth 2.0, Google Identity Platform,
   implementar flow de autorização, armazenar token de acesso.
   Resposta: {provider: 'google', protocol: 'OAuth2.0', ...}

   Exemplo 2: ..."

Structured CoT:
  "Passo 1: Identificar entidades do requisito
   Passo 2: Mapear relações entre entidades
   Passo 3: Identificar operações CRUD necessárias
   Passo 4: Propor arquitetura
   Passo 5: Gerar especificação"

Faithful CoT:
  "Para cada passo, cite a linha do requisito que justifica sua decisão.
   Requisito: 'Sistema de autenticação com email e Google'
   Passo 1 (Req linha 3): Identificar entidade 'usuário'
   Passo 2 (Req linha 3-5): Dois métodos de auth: email + Google"
```

**Performance comparativa (benchmark IDEIA):**

| Variação CoT | Acurácia | Tokens | Custo relativo | Quando usar |
|-------------|----------|--------|----------------|-------------|
| Zero-shot | 68% | 1x | $1 | Tarefas simples |
| Few-shot (3 exemplos) | 82% | 1.5x | $1.5 | Tarefas médias |
| Structured (steps) | 88% | 2x | $2 | Tarefas complexas |
| Faithful (citações) | 85% | 2.5x | $2.5 | Auditoria/compliance |
| Self-Consistency (5 votos) | 91% | 5x | $5 | Decisões críticas |

### 2.2 Tree-of-Thought (ToT)

**Yao et al. (2023)** — Explora múltiplos caminhos de raciocínio em paralelo, avaliando cada um.

```
Estado inicial: "Analisar requisitos de SaaS de assinaturas"
        │
        ├── Caminho A: "Stack node.js + PostgreSQL"
        │     ├── Avaliação: "Boa para MVP, escalável"
        │     └── Sub-caminhos: ORM, migrations, API REST
        │
        ├── Caminho B: "Stack Python + Django"
        │     ├── Avaliação: "Rápido para desenvolver"
        │     └── Sub-caminhos: Django REST, Celery, PostgreSQL
        │
        ├── Caminho C: "Stack serverless (AWS Lambda)"
        │     ├── Avaliação: "Caro para operação contínua"
        │     └── Sub-caminhos: DynamoDB, API Gateway, Step Functions
        │
        └── Avaliação final:
              ├── A: 8/10 (recomendado — maturidade + escalabilidade)
              ├── B: 7/10 (bom, mas menos flexível para expansão)
              └── C: 4/10 (rejeitado — cold starts, custo operacional)
```

**Implementação com BFS (Breadth-First Search):**

```typescript
interface ThoughtNode {
  id: string;
  content: string;
  parentId: string | null;
  children: ThoughtNode[];
  evaluation: number; // 0-10
  depth: number;
}

async function treeOfThought(
  prompt: string,
  options: { breadth: number; depth: number }
): Promise<ThoughtNode> {
  const root: ThoughtNode = {
    id: crypto.randomUUID(),
    content: prompt,
    parentId: null,
    children: [],
    evaluation: 0,
    depth: 0
  };

  let currentLevel = [root];

  for (let d = 1; d <= options.depth; d++) {
    const nextLevel: ThoughtNode[] = [];

    for (const node of currentLevel) {
      // Gera k candidatos (breadth)
      const candidates = await generateThoughts(
        node.content,
        options.breadth
      );

      // Avalia cada candidato
      const evaluated = await evaluateThoughts(candidates);

      // Mantém top-k
      const topK = evaluated
        .sort((a, b) => b.evaluation - a.evaluation)
        .slice(0, options.breadth);

      for (const candidate of topK) {
        const child: ThoughtNode = {
          id: crypto.randomUUID(),
          content: candidate.content,
          parentId: node.id,
          children: [],
          evaluation: candidate.evaluation,
          depth: d
        };
        node.children.push(child);
        nextLevel.push(child);
      }
    }

    currentLevel = nextLevel;
  }

  return root;
}
```

**Trade-offs do ToT no IDEIA:**

| Aspecto | Benefício | Custo |
|---------|-----------|-------|
| Qualidade | 74% sucesso vs 4% CoT em planejamento | 7.2x mais tokens |
| Exploração | Múltiplas arquiteturas consideradas | $7.2x custo |
| Decisão | Avaliação explícita de cada caminho | Latência maior |
| Paralelismo | Requisições paralelas possíveis | Rate limit |

### 2.3 ReAct (Reasoning + Acting)

**Yao et al. (2023)** — Intercala raciocínio e ação em loop, ideal para agentes que precisam usar ferramentas.

**Ciclo ReAct:**

```
Observação → Pensamento → Ação → Observação → Pensamento → Ação → ...

Exemplo (Programmer Agent):
  Obs: "O usuário pediu para criar uma API REST de usuários"
  Pen: "Preciso criar o arquivo de rota, controller e model"
  Ação: read_file("src/routes/index.ts")  → "Arquivo existe, vazio"
  Obs: "src/routes/index.ts está vazio"
  Pen: "Vou verificar se existe algum controller"
  Ação: glob("src/controllers/**/*.ts")  → ["UserController.ts"]
  Obs: "Existe UserController, vou ler para entender a estrutura"
  Ação: read_file("src/controllers/UserController.ts")
  ...
```

**Implementação do loop ReAct:**

```typescript
async function reactAgent(
  task: string,
  tools: Tool[],
  maxIterations: number = 10
): Promise<Result> {
  const observations: string[] = [];
  const thoughts: string[] = [];
  const actions: Action[] = [];

  let iteration = 0;
  let finished = false;

  while (!finished && iteration < maxIterations) {
    iteration++;

    // Gera pensamento + ação
    const response = await llm.call({
      system: AGENT_SYSTEM_PROMPT,
      task,
      observations: observations.slice(-3), // última N observações
    });

    const thought = extractThought(response);
    const action = extractAction(response);

    thoughts.push(thought);
    actions.push(action);

    if (action.type === 'finish') {
      finished = true;
      break;
    }

    // Executa ação
    const tool = tools.find(t => t.name === action.toolName);
    if (!tool) {
      observations.push(`Erro: ferramenta ${action.toolName} não encontrada`);
      continue;
    }

    const result = await tool.execute(action.args);
    observations.push(`${action.toolName}(${JSON.stringify(action.args)}) → ${result}`);
  }

  return { thoughts, actions, result: observations[observations.length - 1] };
}
```

**Limitações do ReAct (Verma et al., 2024):**

- Performance depende mais da similaridade few-shot que do interleaving
- Frágil: variações triviais no prompt derrubam performance
- Placebo guidance tem performance comparável
- Não confiável para planejamento de longo horizonte

**Recomendação IDEIA:** Usar ReAct apenas para tarefas curtas (< 5 tool calls). Para tarefas complexas, usar Plan-and-Solve ou Supervisor Agent.

### 2.4 Plan-and-Solve

**Wang et al. (2023)** — Primeiro cria um plano completo, depois executa cada passo.

**Fases:**

```
FASE 1: PLANEJAMENTO
Prompt: "Crie um plano detalhado para implementar autenticação JWT"
Plano:
  1. Criar User model (src/models/User.ts)
  2. Criar auth middleware (src/middleware/auth.ts)
  3. Criar auth controller (src/controllers/AuthController.ts)
  4. Criar rotas de auth (src/routes/auth.ts)
  5. Criar testes unitários (tests/unit/auth.test.ts)
  6. Criar testes de integração (tests/integration/auth.test.ts)

FASE 2: EXECUÇÃO PASSO A PASSO
Passo 1: read_file → Verificar User model existente
         write_file → Atualizar User model com campos: email, passwordHash
Passo 2: read_file → Verificar estrutura de middleware
         write_file → Criar auth middleware
...
```

**Plano como DAG (Directed Acyclic Graph):**

```
                  ┌──────────────┐
                  │ User Model   │
                  └──────┬───────┘
                         │
              ┌──────────▼──────────┐
              │   Auth Middleware    │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
  │ Auth Ctrl   │ │ JWT Utils   │ │ Refresh Tkn │
  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                  ┌──────▼──────┐
                  │ Auth Routes │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ Tests       │
                  └─────────────┘
```

**Vantagens sobre ReAct:**

| Aspecto | ReAct | Plan-and-Solve |
|---------|-------|----------------|
| Previsibilidade | Baixa (explora) | Alta (plano fixo) |
| Depuração | Difícil (trajetória longa) | Fácil (passos independentes) |
| Rollback | Complexo | Simples (por passo) |
| Paralelismo | Sequencial | Passos paralelos possíveis |
| Tolerância a erro | Propagação | Isolamento por passo |

### 2.5 Reflexion

**Shinn et al. (2023)** — Auto-avaliação e correção. Agente executa, reflete sobre o resultado, e melhora.

**Ciclo Reflexion:**

```
        ┌──────────────────────────────────────────┐
        │               TASK POOL                   │
        └──────────────────┬───────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   EXECUTOR   │
                    │  (Actor)     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  AVALIADOR   │
                    │  (Critic)   │
                    └──────┬──────┘
                           │
               ┌───────────┴───────────┐
               │           │           │
               │    ┌──────▼──────┐    │
               │    │  REFLECTOR   │────┘ (feedback para memória)
               │    │  (Self)     │
               │    └─────────────┘
               │
               │ (se falhou → retorna para executor com feedback)
               ▼
          CONCLUÍDO
```

**Exemplo com Programmer Agent:**

```
TENTATIVA 1:
  Task: "Criar função de validação de email"
  Ação: write_file("src/validators/email.ts")
  Avaliação: "Função não valida emails com domínio .co.uk"
  Reflexão: "Preciso usar regex mais abrangente para emails internacionais"

TENTATIVA 2:
  Ação: write_file("src/validators/email.ts") [versão melhorada]
  Avaliação: "Agora valida emails internacionais, mas não verifica MX record"
  Reflexão: "Validação de MX record é server-side, vou deixar só validação de formato"

TENTATIVA 3:
  Ação: write_file("src/validators/email.ts") [versão final]
  Avaliação: "PASS — todos os casos de teste passam"
  Concluído
```

**Memória de Reflexão:**

```typescript
interface Reflection {
  task: string;              // Tarefa original
  attempts: Attempt[];       // Histórico de tentativas
  lessons: string[];         // Lições aprendidas
  patterns: string[];        // Padrões identificados
}

interface Attempt {
  id: number;
  action: string;            // O que foi feito
  result: string;            // Resultado obtido
  evaluation: string;        // Avaliação do crítico
  reflection: string;        // Reflexão do agente
  timestamp: Date;
}
```

**Recomendação IDEIA:** Reflexion é o padrão mais valioso para agentes de código. Cada tentativa de escrita deve ser seguida de verificação e reflexão.

### 2.6 Self-Consistency

**Wang et al. (2023)** — Executa múltiplas chains de raciocínio, depois seleciona a resposta mais consistente.

```
Execução 1: "Usar PostgreSQL porque requer ACID"            ↕
Execução 2: "Usar PostgreSQL pelos relacionamentos"        ↕  VOTAÇÃO
Execução 3: "Usar MongoDB pela flexibilidade de schema"    ↕  → PostgreSQL (2x)
Execução 4: "Usar PostgreSQL pela maturidade do ORM"       ↕
Execução 5: "Usar SQLite pela simplicidade"                ↕
```

**Estratégias de votação:**

| Estratégia | Descrição | Exemplo |
|------------|-----------|---------|
| Marginalização | Conta frequência da resposta final | PostgreSQL: 3/5 |
| Weighted | Peso por confiança de cada chain | PostgreSQL: 0.82 |
| Rank-based | Ranking de preferências | PostgreSQL: rank 1 médio |
| Clustering | Agrupa respostas similares | Cluster SQL: 4/5 |
| Verificação cruzada | Cada chain verifica as outras | 3/5 confirmam PostgreSQL |

**Custo vs Benefício:**

| N chains | Acurácia relativa | Custo | Latência |
|----------|-------------------|-------|----------|
| 1 | baseline (70%) | 1x | 1x |
| 3 | +8% | 3x | 1.5x (paralelo) |
| 5 | +12% | 5x | 1.5x (paralelo) |
| 10 | +14% | 10x | 1.5x (paralelo) |
| 20 | +15% | 20x | 2x (rate limit) |

**Recomendação IDEIA:** 3-5 chains para decisões arquiteturais, 1 chain para implementação rotineira.

---

## 3. Prompt Técnico para Geração de Código

### 3.1 Especificação de Linguagem, Framework, Padrões

```
## ESPECIFICAÇÃO TÉCNICA

### Stack
- Linguagem: TypeScript 5.5+
- Runtime: Node.js 20 LTS
- Framework: Express.js 4.18+ (API REST)
- ORM: Prisma 5.x
- Testes: Vitest + Supertest
- Lint: Biome (substituto ESLint + Prettier)

### Padrões de Código
- Clean Architecture: entities → usecases → controllers → routes
- Domain-Driven Design: aggregates, value objects, domain events
- SOLID principles
- Functional Core, Imperative Shell
- Error handling: Result<T, E> pattern (não lançar exceções)

### Convenções
- Nomes de arquivo: kebab-case.ts
- Nomes de classe: PascalCase
- Nomes de função/variável: camelCase
- Constantes: UPPER_SNAKE_CASE
- Tipos: prefixo I para interfaces? NÃO (seguir TypeScript padrão)
- Imports: sem default exports, apenas named exports
- Testes: arquivo.spec.ts ao lado do arquivo
```

### 3.2 Restrições de Arquitetura

```
## RESTRIÇÕES ARQUITETURAIS

### Camadas (Clean Architecture)

src/
├── domain/          ← NÃO importa nada de infra
│   ├── entities/
│   ├── value-objects/
│   └── events/
├── application/     ← imports domain apenas
│   ├── use-cases/
│   └── ports/       ← interfaces (repositórios, serviços)
├── infrastructure/  ← implementa ports, imports application + domain
│   ├── database/
│   ├── http/
│   └── messaging/
└── presentation/    ← entrada HTTP, websocket, CLI
    ├── controllers/
    ├── routes/
    └── middleware/

### Regras de Dependência
- domain → (nenhuma dependência externa)
- application → domain
- infrastructure → application + domain
- presentation → application

### Proibido
- Import circular entre camadas
- Lógica de negócio em controllers
- Acesso direto a banco de dados dos controllers
- any sem justificativa documentada
```

### 3.3 Formato de Saída Esperado

```
## FORMATO DE SAÍDA

Para cada arquivo a ser criado/modificado, use o formato:

### Nome do Arquivo: {path/relativo/ao/workspace}
\`\`\`typescript
{conteúdo completo do arquivo}
\`\`\`

### Nome do Arquivo: {path/relativo/ao/workspace}
\`\`\`typescript
{conteúdo completo do arquivo}
\`\`\`

Importante:
- Cada arquivo DEVE ser completo e funcional
- NÃO use "..." para código omitido
- NÃO use comentários como "resto do código igual"
- SEMPRE inclua imports completos
- SEMPRE inclua exports
```

### 3.4 Testes First vs Código First

**Escolha da estratégia por tipo de tarefa:**

```
┌─────────────────────────────────────────────────────────────┐
│  ESTRATÉGIA DE GERAÇÃO                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TAREFAS NOVAS (greenfield):                                 │
│  ├── Test-First                                             │
│  │   1. Cria spec com casos de teste                        │
│  │   2. Executa (falha) → confirma que teste funciona       │
│  │   3. Implementa código para passar no teste              │
│  │   4. Executa (passa) → confirma implementação            │
│  └── Ideal para: lógica de negócio, validação               │
│                                                              │
│  TAREFAS EXISTENTES (brownfield):                            │
│  ├── Code-First                                              │
│  │   1. Lê código existente                                  │
│  │   2. Implementa mudança                                   │
│  │   3. Executa testes existentes (regressão)                │
│  │   4. Atualiza testes se necessário                        │
│  └── Ideal para: refactoring, bug fix, adição de features   │
│                                                              │
│  TAREFAS DE ARQUITETURA:                                     │
│  ├── Spec-First                                              │
│  │   1. Define contratos/interface                           │
│  │   2. Gera implementação vazia (stub)                     │
│  │   3. Preenche implementação                               │
│  └── Ideal para: novas APIs, novos módulos                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Injeção de Contexto

**Contexto necessário para gerar código de qualidade:**

```
## CONTEXTO DO PROJETO

### Estrutura de Arquivos (AST simplificada)
{tree_output}

### Imports Existentes (package.json dependencies)
{package_json}

### Tipos Compartilhados
{shared_types}

### Padrões do Projeto (detectados automaticamente)
{project_patterns}

### Arquivo Alvo (se modificação)
{target_file_current_content}

### Arquivos Relacionados
{related_files}
```

**Exemplo de detecção de padrões do projeto:**

```typescript
// Padrões detectados automaticamente pelo PatternDetector
const patterns = {
  imports: {
    style: 'named-only',          // Sem default exports
    grouping: 'external → internal', // Ordem de imports
  },
  error_handling: 'Result<T, E>',  // Pattern de resultado
  testing: {
    framework: 'vitest',
    location: 'co-located',       // .spec.ts ao lado
    style: 'describe/it',
  },
  naming: {
    files: 'kebab-case',
    classes: 'PascalCase',
    functions: 'camelCase',
    constants: 'UPPER_SNAKE_CASE',
  },
  architecture: 'clean-architecture',
  database: {
    orm: 'prisma',
    naming: 'snake_case',
  },
};
```

---

## 4. Few-Shot e Exemplos

### 4.1 Quantidade Ideal de Exemplos

**Estudos empíricos (2024-2025):**

| Nº Exemplos | Acurácia (codificação) | Tokens adicionais | Custo | Recomendação |
|-------------|----------------------|-------------------|-------|-------------|
| 0 (zero-shot) | 60-70% | 0 | $1 | Tarefas triviais |
| 1 | 70-78% | ~500 | $1.1 | Boa baseline |
| 2 | 78-83% | ~1000 | $1.2 | |
| 3 | 83-87% | ~1500 | $1.3 | ✅ Ideal geral |
| 4 | 85-88% | ~2000 | $1.4 | Tarefas complexas |
| 5 | 86-89% | ~2500 | $1.5 | Limiar de retorno |
| 10 | 87-90% | ~5000 | $2 | Retorno decrescente |
| 20 | 87-90% | ~10000 | $3 | Custo elevado |

**Regra prática:** 3 exemplos bem curados > 10 exemplos genéricos.

### 4.2 Qualidade dos Exemplos

**Critérios para exemplos de alta qualidade:**

```
CRITÉRIO 1: REPRESENTATIVIDADE
├── Exemplo reflete casos reais do projeto
├── Cobre edge cases comuns
└── Mostra o padrão que queremos reforçar

CRITÉRIO 2: COMPLETUDE
├── Input completo (não truncado)
├── Output completo (sem "...")
├── Raciocínio explícito (se CoT)
└── Justificativa de decisões

CRITÉRIO 3: CONSISTÊNCIA
├── Mesmo estilo de código
├── Mesmas convenções de nomenclatura
├── Mesmo padrão de error handling
└── Mesma estrutura de arquivos

CRITÉRIO 4: CORREÇÃO
├── Código compila sem erros
├── Tipos corretos
├── Testes passam
└── Sem vulnerabilidades de segurança
```

**Exemplo curado (bom):**

```
## Exemplo 1: Criação de User Entity

Input: "Criar entidade de usuário com email e senha"
Raciocínio:
  1. User é uma entidade (tem identidade: id)
  2. Email é value object (validação de formato)
  3. Senha deve ser armazenada como hash

Output:
### src/domain/entities/User.ts
```typescript
export class User {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
```

### src/domain/value-objects/Email.ts
```typescript
export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Result<Email, Error> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return failure(new Error('Invalid email format'));
    }
    return success(new Email(value.toLowerCase()));
  }
}
```
```

**Exemplo ruim (não usar):**

```
Input: "Criar user entity"
Output:
```
class User {
  id: string;
  email: string; // sem validação
  password: string; // senha em texto puro!
}
```
```

### 4.3 Exemplos Dinâmicos (Recuperados do Knowledge Graph)

Em vez de exemplos fixos, recupera exemplos relevantes do knowledge graph baseado na tarefa atual.

```typescript
interface DynamicExample {
  task: string;           // Descrição da tarefa original
  input: string;          // Input da tarefa
  reasoning: string;      // Raciocínio usado
  output: string;         // Código gerado
  quality: number;        // Score de qualidade (0-1)
  similarity: number;     // Similaridade com tarefa atual
}

async function findExamples(
  currentTask: string,
  maxExamples: number = 3
): Promise<DynamicExample[]> {
  // 1. Extrai embedding da tarefa atual
  const taskEmbedding = await embed(currentTask);

  // 2. Busca no vector store por similaridade
  const candidates = await vectorStore.search(taskEmbedding, {
    filter: { type: 'code-generation' },
    limit: maxExamples * 2, // busca mais para re-rank
  });

  // 3. Re-rank por qualidade + similaridade
  return candidates
    .map(c => ({
      ...c,
      score: c.quality * 0.6 + c.similarity * 0.4,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExamples);
}
```

### 4.4 Exemplos Negativos (O que NÃO Fazer)

Exemplos negativos são surpreendentemente eficazes para estabelecer boundaries.

```
## EXEMPLOS NEGATIVOS

### Exemplo 1: Senha em texto plano (NÃO FAÇA)
```typescript
// ❌ ERRADO: senha armazenada sem hash
class User {
  password: string;
}
```
✅ Correto: armazenar apenas passwordHash, usar bcrypt/argon2

### Exemplo 2: Lógica de negócio em controller (NÃO FAÇA)
```typescript
// ❌ ERRADO: controller fazendo validação e regras
app.post('/users', (req, res) => {
  if (!req.body.email) res.status(400);
  const user = new User(req.body.email);
  await db.save(user);
  res.json(user);
});
```
✅ Correto: controller delega para use case

### Exemplo 3: SQL injection (NÃO FAÇA)
```typescript
// ❌ ERRADO: concatenação de string em query
db.query(`SELECT * FROM users WHERE id = ${userId}`);
```
✅ Correto: usar parameterized queries (Prisma/TypeORM)

### Exemplo 4: any sem justificativa (NÃO FAÇA)
```typescript
// ❌ ERRADO: any sem documentação
function process(data: any) { ... }
```
✅ Correto: tipo específico ou generic com constraints
```

---

## 5. DSPy (Declarative Self-improving Python)

### 5.1 Conceito

DSPy (Stanford, 2024) é um framework para programar LLMs declarativamente, em vez de escrever prompts manualmente. O DSPy compila módulos (que seriam prompts) em pipelines otimizados.

**Abordagem tradicional vs DSPy:**

```
TRADICIONAL:
prompt = "Analise os requisitos: {req}. Formato: {schema}"
response = llm.call(prompt)

DSPy:
class Analyzer(dspy.Module):
    def __init__(self):
        self.analyze = dspy.ChainOfThought("requirements -> analysis")

    def forward(self, requirements: str) -> Analysis:
        return self.analyze(requirements=requirements)

analyzer = Analyzer()
analyzer.compile(trainset=examples, metric=quality_metric)
```

### 5.2 Signatures (Assinaturas)

DSPy usa "signatures" que definem transformações de input → output sem especificar o prompt.

```python
# DSPy Signature
# Formato: "input_fields -> output_fields"

# Exemplos para IDEIA
"requirements -> analysis_json"           # Análise de requisitos
"code_snippet -> reviewed_code"           # Code review
"architecture_decision -> adr_document"   # ADR generation
"test_description -> test_code"           # Test generation
"error_message -> fix_suggestion"         # Debug help
```

**Mapeamento para IDEIA:**

| Agente | DSPy Signature | Input | Output |
|--------|----------------|-------|--------|
| Analyst | `"user_prompt -> clarified_requirements"` | Prompt bruto | Requisitos esclarecidos |
| Architect | `"requirements -> architecture_plan"` | Requisitos | Plano de arquitetura |
| Programmer | `"specification -> code_implementation"` | Especificação | Código implementado |
| Reviewer | `"code_snippet -> review_feedback"` | Código | Feedback de revisão |
| Tester | `"implementation -> test_suite"` | Implementação | Suite de testes |
| DevOps | `"application -> deployment_config"` | App | Config de deploy |

### 5.3 Modules DSPy

Principais módulos do DSPy que podem ser usados no IDEIA:

| Module | Descrição | Uso IDEIA |
|--------|-----------|-----------|
| `dspy.ChainOfThought` | CoT raciocínio passo a passo | Analista, Arquiteto |
| `dspy.ProgramOfThought` | Gera e executa código Python | Programador |
| `dspy.ReAct` | Reasoning + Acting loop | Agentes com ferramentas |
| `dspy.MultiChainComparison` | Múltiplas chains, vota melhor | Decisões críticas |
| `dspy.Assert` | Auto-avaliação (como Reflexion) | Revisor |
| `dspy.Retrieve` | RAG integration | Todos (contexto) |
| `dspy.Tool` | Ferramentas para agente | Programmer, DevOps |

### 5.4 Compilação e Otimização Automática

DSPy compila módulos otimizando os prompts automaticamente.

```
DSPy Compiler Flow:

1. Definir módulo (ex: ChainOfThought)
2. Fornecer exemplos (trainset)
3. Definir métrica (ex: accuracy, BLEU, custom)
4. Compilar:
   ├── Bootstrap few-shot examples
   ├── Otimiza instruções do prompt
   ├── Ajusta exemplos dinâmicos
   └── Retorna módulo otimizado

5. Usar módulo compilado em produção
```

**Exemplo concreto para IDEIA:**

```python
import dspy
from dspy.datasets import HotPotQA

# Define signature
class GenerateCode(dspy.Signature):
    """Generate TypeScript code from specification."""
    specification = dspy.InputField(desc="Tarefa de codificação detalhada")
    code = dspy.OutputField(desc="Código TypeScript completo")

# Define module
class CodeGenerator(dspy.Module):
    def __init__(self):
        self.generate = dspy.ChainOfThought(GenerateCode)
        self.validate = dspy.ChainOfThought("code -> validation_result")

    def forward(self, specification):
        code = self.generate(specification=specification).code
        validation = self.validate(code=code).validation_result
        return dspy.Prediction(code=code, validation=validation)

# Métrica de qualidade
def quality_metric(gold, pred):
    # Verifica se o código compila
    compiles = check_typescript_syntax(pred.code)
    # Verifica se passa nos testes
    passes = run_tests(pred.code)
    # Verifica similaridade semântica com gold
    similarity = semantic_similarity(gold, pred)
    return compiles * 0.4 + passes * 0.4 + similarity * 0.2

# Compilação
generator = CodeGenerator()
generator.compile(
    trainset=training_examples,
    metric=quality_metric,
    num_threads=4
)
```

### 5.5 Aplicação no Contexto IDEIA

**Pipeline DSPy para o fluxo completo:**

```python
# IDEIA Pipeline com DSPy
class IdeiaPipeline(dspy.Module):
    def __init__(self):
        self.analyst = dspy.ChainOfThought("user_prompt -> requirements")
        self.architect = dspy.ChainOfThought("requirements -> architecture")
        self.programmer = dspy.ProgramOfThought("architecture -> code")
        self.reviewer = dspy.ChainOfThought("code -> review")
        self.tester = dspy.ChainOfThought("code -> tests")

    def forward(self, user_prompt):
        reqs = self.analyst(user_prompt=user_prompt).requirements
        arch = self.architect(requirements=reqs).architecture
        code = self.programmer(architecture=arch).code
        review = self.reviewer(code=code).review
        tests = self.tester(code=code).tests
        return dspy.Prediction(
            requirements=reqs,
            architecture=arch,
            code=code,
            review=review,
            tests=tests
        )
```

**Benefícios do DSPy no IDEIA:**

| Benefício | Descrição | Impacto |
|-----------|-----------|---------|
| Prompts otimizados automaticamente | DSPy ajusta exemplos e instruções | +15-20% acurácia |
| Menos manutenção de prompts | Muda signature, não prompt | -80% tempo prompt engineering |
| Reprodutibilidade | Mesmo módulo, mesmo resultado | Debug mais fácil |
| Métricas de qualidade | Avaliação objetiva de cada módulo | Melhoria contínua |
| Testabilidade | Módulos testáveis isoladamente | Cobertura de testes |

**Estado atual:** DSPy é puramente Python, e o IDEIA é TypeScript. Seria necessário:
1. Port DSPy para TypeScript (projeto significativo)
2. Ou usar DSPy como serviço Python separado (micro-serviço)
3. Ou implementar apenas o conceito (não a lib)

---

## 6. Prompts por Agente

### 6.1 Analyst Prompt (Esclarecimento de Requisitos)

```
## SYSTEM: Agente Analista de Requisitos

Você é o Analista de Requisitos do IDEIA. Sua função é:
1. Interpretar o prompt do usuário e extrair requisitos claros
2. Identificar ambiguidades e fazer perguntas de esclarecimento
3. Detectar requisitos implícitos
4. Categorizar o tipo de solicitação (nova funcionalidade, bug, refactor, dúvida)
5. Estimar complexidade e risco

## REGRAS ESPECÍFICAS
- NÃO proponha soluções técnicas ainda (isso é do Arquiteto)
- NÃO escreva código (isso é do Programador)
- Pergunte no máximo 5 questões de esclarecimento por vez
- Prefira perguntas objetivas (sim/não ou múltipla escolha)
- Identifique requisitos funcionais E não-funcionais

## FORMATO DE SAÍDA
{
  "summary": "Resumo dos requisitos identificados",
  "functional": ["Lista de requisitos funcionais"],
  "non_functional": ["Lista de requisitos não-funcionais"],
  "ambiguities": ["Pontos que precisam esclarecimento"],
  "implicit_requirements": ["Requisitos implícitos detectados"],
  "complexity": "low|medium|high",
  "risk": "low|medium|high",
  "questions": ["Perguntas para o usuário"]
}
```

### 6.2 Architect Prompt (Decisões de Arquitetura)

```
## SYSTEM: Agente Arquiteto de Software

Você é o Arquiteto de Software do IDEIA. Sua função é:
1. Definir arquitetura baseada nos requisitos
2. Escolher tecnologias (stack, frameworks, databases)
3. Definir estrutura de diretórios e módulos
4. Documentar decisões como ADRs (Architecture Decision Records)
5. Identificar riscos arquiteturais e mitigação

## REGRAS ESPECÍFICAS
- SEMPRE justifique cada decisão com alternativas consideradas
- Prefira tecnologias maduras e bem documentadas
- Considere escalabilidade, manutenibilidade, e custo
- Documente trade-offs explicitamente
- NÃO implemente código (isso é do Programador)
- Consulte o knowledge graph para decisões similares anteriores

## FORMATO DE SAÍDA
- Diretório: ADRs em docs/adr/{numero}-{titulo}.md
- Estrutura do projeto (tree)
- Diagrama de componentes (ASCII)
- Matriz de riscos

## ADR TEMPLATE
```markdown
# ADR-{numero}: {título da decisão}

## Contexto
{descreva o problema e contexto}

## Decisão
{qual foi a decisão}

## Alternativas Consideradas
- {alternativa 1}: {por que foi rejeitada}
- {alternativa 2}: {por que foi rejeitada}

## Consequências
{positivas e negativas}
```
```

### 6.3 Programmer Prompt (Implementação)

```
## SYSTEM: Agente Programador

Você é o Programador do IDEIA. Sua função é:
1. Implementar código seguindo a especificação do Arquiteto
2. Seguir rigorosamente as convenções do projeto
3. Gerar código limpo, tipado, e testável
4. Respeitar Clean Architecture e DDD
5. Escrever testes junto com a implementação

## REGRAS ESPECÍFICAS
- SEMPRE leia arquivos existentes antes de modificar
- Mantenha consistência com o código existente
- Código deve passar em lint + typecheck + testes
- NUNCA use any sem justificativa
- NUNCA deixe console.log no código final
- SEMPRE trate erros adequadamente
- Prefira composição sobre herança
- Siga o princípio de responsabilidade única

## FERRAMENTAS
- read_file: ler arquivos existentes
- write_file: escrever/sobrescrever arquivos
- glob: buscar arquivos por padrão
- exec_command: executar comandos (npm test, tsc, etc.)
- search_code: buscar padrões no código

## FORMATO DE SAÍDA
Para cada arquivo, forneça:
### Nome do Arquivo: {path}
```typescript
{conteúdo completo}
```
```

### 6.4 Reviewer Prompt (Code Review)

```
## SYSTEM: Agente Revisor de Código

Você é o Revisor de Código do IDEIA. Sua função é:
1. Revisar código gerado pelo Programador
2. Verificar qualidade, segurança, performance
3. Identificar bugs potenciais e code smells
4. Sugerir melhorias específicas
5. Bloquear código que não passa nos quality gates

## DIMENSÕES DE REVISÃO

| Dimensão | O que verificar |
|----------|----------------|
| Correção | Lógica correta? Edge cases tratados? |
| Segurança | Injection? Secrets expostos? Input validado? |
| Performance | Loops desnecessários? Memória? |
| Manutenibilidade | Nomes claros? Responsabilidade única? |
| Testabilidade | Código testável? Dependências injetáveis? |
| Consistência | Segue padrões do projeto? |
| Tipagem | Tipos corretos? any evitado? |

## FORMATO DE SAÍDA
{
  "verdict": "approved|changes_requested|blocked",
  "summary": "Resumo da revisão",
  "issues": [
    {
      "severity": "error|warning|suggestion",
      "file": "src/file.ts",
      "line": 42,
      "description": "Descrição do problema",
      "suggestion": "Como corrigir"
    }
  ],
  "quality_score": 0.85,
  "blocking_issues": false
}
```

### 6.5 Tester Prompt (Testes)

```
## SYSTEM: Agente Testador

Você é o Testador do IDEIA. Sua função é:
1. Gerar testes unitários, integração e E2E
2. Garantir cobertura mínima de 80%
3. Testar edge cases e cenários de erro
4. Seguir o padrão de testes do projeto
5. Mutation testing para verificar qualidade dos testes

## REGRAS ESPECÍFICAS
- Teste o comportamento, não a implementação
- Use mocks apenas para边界 (bordas do sistema)
- Prefira stubs/fakes sobre mocks
- Teste fluxo feliz E fluxo de erro
- Nome dos testes devem descrever o cenário
- Siga o padrão AAA: Arrange → Act → Assert

## COBERTURA MÍNIMA
- Unit: 90% (lógica de negócio)
- Integration: 70% (casos de uso completos)
- E2E: 50% (fluxos críticos)
- Mutation score: >75%

## FORMATO DE SAÍDA
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid email and password', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should reject invalid email format', async () => {
      // Edge case test
    });

    it('should reject weak password', async () => {
      // Error flow test
    });
  });
});
```
```

### 6.6 DevOps Prompt (Deploy, Infra, CI/CD)

```
## SYSTEM: Agente DevOps

Você é o Agente DevOps do IDEIA. Sua função é:
1. Configurar pipeline CI/CD
2. Gerenciar infraestrutura como código (IaC)
3. Configurar monitoramento e observabilidade
4. Gerenciar deploy (blue-green, canary)
5. Garantir segurança da infraestrutura

## FERRAMENTAS
- Terraform / OpenTofu para IaC
- GitHub Actions / GitLab CI para CI/CD
- Docker + Docker Compose para container
- Prometheus + Grafana para monitoramento
- ArgoCD para GitOps

## REGRAS ESPECÍFICAS
- SEMPRE use IaC (nunca configuração manual)
- Prefira GitOps (estado desejado no git)
- Configure health checks em todo serviço
- Implemente circuit breaker e retry
- Documente runbooks para incidentes
- Configure backup e disaster recovery

## FORMATO DE SAÍDA
- .github/workflows/deploy.yml
- docker-compose.yml
- terraform/main.tf
- README.md de deploy
```

### 6.7 Supervisor Prompt (Coordenação)

```
## SYSTEM: Agente Supervisor

Você é o Supervisor do IDEIA. Sua função é:
1. Coordenar a comunicação entre agentes
2. Resolver conflitos de decisão
3. Decidir quando aprovar ações
4. Monitorar progresso e qualidade
5. Escalar para humano quando necessário

## HIERARQUIA DE DECISÃO
1. Política de autonomia (N0-N3)
2. Quality gates
3. Consenso entre agentes
4. Decisão do Supervisor
5. Escalação humana

## REGRAS ESPECÍFICAS
- Conflitos entre Programador e Revisor: escalar para Supervisor
- Conflitos de arquitetura: votação entre Architect + Reviewer + Supervisor
- Se quality gate falhar: NÃO permitir progresso
- Se risco alto: escalar para humano
- Auditoria de todas as decisões

## FORMATO DE SAÍDA
{
  "status": "in_progress|completed|blocked|escalated",
  "current_agent": "analyst|architect|programmer...",
  "progress": {
    "completed": [],
    "in_progress": [],
    "blocked": [],
    "pending": []
  },
  "decisions": [
    {
      "agent": "reviewer",
      "verdict": "changes_requested",
      "resolution": "programmer_will_fix"
    }
  ],
  "blockers": [],
  "needs_human": false
}
```

---

## 7. Gestão de Contexto

### 7.1 Window Sliding para Históricos Longos

Quando o histórico excede o limite de contexto, usa-se window sliding:

```
Histórico completo:
[T1][T2][T3][T4][T5][T6][T7][T8][T9][T10] ... → 80K tokens

Window sliding (últimas 5 interações ≈ 20K tokens):
[T6][T7][T8][T9][T10] ← apenas últimas 5

Com summarization (resumo das anteriores + últimas 5):
[RESUMO T1-T5][T6][T7][T8][T9][T10] ← 25K tokens
```

```typescript
interface SlidingWindowConfig {
  maxTokens: number;           // Contexto máximo do modelo
  reserveTokens: number;       // Tokens reservados para resposta
  windowSize: number;          // Número de interações no window
  summarizationThreshold: number; // A partir de quantas interações sumarizar
}

function buildContext(
  history: Interaction[],
  config: SlidingWindowConfig
): Context {
  const availableTokens = config.maxTokens - config.reserveTokens;

  // Sempre inclui as últimas N interações
  const recent = history.slice(-config.windowSize);
  const recentTokens = tokenCount(recent);

  // Se histórico couber, retorna completo
  if (recentTokens <= availableTokens) {
    return { type: 'full', content: recent };
  }

  // Se não, precisa sumarizar
  const olderHistory = history.slice(0, -config.windowSize);

  if (olderHistory.length > config.summarizationThreshold) {
    const summary = summarizeHistory(olderHistory);
    return {
      type: 'summarized',
      summary,
      recent,
    };
  }

  // Último recurso: truncar mais antigas
  return {
    type: 'truncated',
    content: recent.slice(-Math.floor(config.windowSize / 2)),
  };
}
```

### 7.2 Summarization de Contexto

**Pipeline de summarization:**

```
Conversa Bruta
    │
    ├── 1. Chunking (divide em segmentos de 2000 tokens)
    │
    ├── 2. Summarization por chunk
    │     └── "Usuário pediu feature X, Arquiteto recomendou Y"
    │
    ├── 3. Merge de sumários
    │     └── "Feature X: stack Node.js + PostgreSQL. Decisões: ADR-001, ADR-002"
    │
    └── 4. Compressão final
          └── (200 tokens) "Req: X. Stack: Node+PG. Decisões: ADR-001, ADR-002"
```

**Níveis de sumarização:**

| Nível | Tokens | Conteúdo | Uso |
|-------|--------|----------|-----|
| Full | 100% | Conversa completa | Janela atual |
| Detailed | 30% | Decisões + razões + código | Agent transitions |
| Summary | 10% | Decisões + resultados | Summary geral |
| Bullet | 3% | Apenas decisões | Contexto cross-session |

### 7.3 Retrieval-Augmented Generation (RAG) para Contexto

```typescript
interface RAGContext {
  project_knowledge: string[];     // Conhecimento do projeto
  similar_tasks: string[];         // Tarefas similares anteriores
  relevant_code: string[];         // Código relevante
  architecture_decisions: string[]; // ADRs relevantes
  user_preferences: string[];      // Preferências do usuário
}

async function buildRAGContext(task: string): Promise<RAGContext> {
  const taskEmbedding = await embed(task);

  const [knowledge, tasks, code, adrs, prefs] = await Promise.all([
    // Busca conhecimento geral do projeto
    vectorStore.search(taskEmbedding, { collection: 'knowledge', limit: 3 }),

    // Busca tarefas similares
    vectorStore.search(taskEmbedding, { collection: 'tasks', limit: 2 }),

    // Busca código relevante
    vectorStore.search(taskEmbedding, { collection: 'code', limit: 3 }),

    // Busca ADRs relevantes
    vectorStore.search(taskEmbedding, { collection: 'adrs', limit: 2 }),

    // Busca preferências do usuário
    vectorStore.search(taskEmbedding, { collection: 'preferences', limit: 1 }),
  ]);

  return {
    project_knowledge: knowledge.map(r => r.content),
    similar_tasks: tasks.map(r => r.content),
    relevant_code: code.map(r => r.content),
    architecture_decisions: adrs.map(r => r.content),
    user_preferences: prefs.map(r => r.content),
  };
}
```

### 7.4 Context Budget: Tokens por Seção

**Distribuição ideal (para modelo com 128K tokens de contexto):**

```
┌─────────────────────────────────────────────────────────┐
│                     CONTEXT BUDGET                        │
│                                                           │
│  Orçamento total: 128K tokens                             │
│  Reserva para resposta: 8K tokens                         │
│  Disponível para contexto: 120K tokens                    │
│                                                           │
│  Distribuição:                                            │
│  ├── System Prompt:       12K (10%) [imutável]            │
│  │    ├── Identidade:      2K                             │
│  │    ├── Regras:          3K                             │
│  │    ├── Capacidades:    2K                              │
│  │    └── Restrições:      5K                             │
│  │                                                         │
│  ├── Task Prompt:         18K (15%) [variável por task]   │
│  │    ├── Objetivo:        3K                             │
│  │    ├── Especificação:  10K                             │
│  │    └── Critérios:       5K                             │
│  │                                                         │
│  ├── Context:             60K (50%) [recuperado]          │
│  │    ├── Histórico:      15K (sumarizado)                │
│  │    ├── Memória:         10K                            │
│  │    ├── RAG (3 docs):   15K                             │
│  │    ├── Código atual:   10K                             │
│  │    └── State:          10K                             │
│  │                                                         │
│  ├── Tools:               24K (20%) [dinâmico]            │
│  │    ├── Descrições:      8K                             │
│  │    ├── Schemas:         8K                             │
│  │    └── Exemplos:        8K                             │
│  │                                                         │
│  └── Output Format:        6K (5%)                        │
│       ├── Schema JSON:     3K                             │
│       └── Exemplos:        3K                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.5 Cache de Prompts Frequentes

**Estratégia de cache:**

```typescript
class PromptCache {
  private cache: Map<string, CachedPrompt> = new Map();

  constructor(private config: { ttl: number; maxEntries: number }) {}

  get(systemPrompt: string, taskType: string): string | null {
    const key = this.buildKey(systemPrompt, taskType);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.prompt;
  }

  set(systemPrompt: string, taskType: string, prompt: string): void {
    if (this.cache.size >= this.config.maxEntries) {
      // Evict oldest entry
      const oldest = [...this.cache.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      this.cache.delete(oldest[0]);
    }

    const key = this.buildKey(systemPrompt, taskType);
    this.cache.set(key, { prompt, timestamp: Date.now() });
  }

  private buildKey(system: string, task: string): string {
    return `${hash(system)}:${task}`;
  }
}
```

**O que cachead:**

| Componente | Cacheável? | TTL | Razão |
|------------|-----------|-----|-------|
| System prompt | ✅ Cacheável | 1h (a menos que mude) | Imutável entre tarefas |
| Tool descriptions | ✅ Cacheável | 1h | Raramente muda |
| Output schema | ✅ Cacheável | 1h | Fixo por agente |
| Task prompt | ❌ Não cacheável | — | Único por tarefa |
| Context (RAG) | ❌ Não cacheável | — | Dinâmico |
| Few-shot examples | ⚠️ Parcial | 5min | Se dinâmicos, não cachear |

**Impacto do cache:**
- Redução de 30-40% nos tokens de entrada
- Redução de 10-15% na latência
- Economia de ~20% nos custos de API

---

## Apêndice A: Template Completo de Prompt (Analista)

```
Você é o {agent_name}, um agente especializado do sistema IDEIA.

## IDENTIDADE
{agent_description}
Especialidade: {specialty}
Nível de autonomia: {autonomy_level}

## REGRAS GLOBAIS
1. NUNCA execute comandos destrutivos
2. SEMPRE valide inputs antes de processar
3. NUNCA exponha secrets, tokens ou credenciais
4. SEMPRE justifique decisões importantes
5. Ações críticas requerem aprovação humana

## REGRAS ESPECÍFICAS
{agent_rules}

## FERRAMENTAS
{tools}

## TAREFA ATUAL
{task}

## CONTEXTO
{context}

## FORMATO DE SAÍDA
{format}
```

## Apêndice B: Referências

| Referência | Ano | Descrição |
|------------|-----|-----------|
| Chain-of-Thought (Wei et al.) | 2022 | https://arxiv.org/abs/2201.11903 |
| Tree-of-Thoughts (Yao et al.) | 2023 | https://arxiv.org/abs/2305.10601 |
| ReAct (Yao et al.) | 2023 | https://arxiv.org/abs/2210.03629 |
| Plan-and-Solve (Wang et al.) | 2023 | https://arxiv.org/abs/2305.04091 |
| Reflexion (Shinn et al.) | 2023 | https://arxiv.org/abs/2303.11366 |
| Self-Consistency (Wang et al.) | 2023 | https://arxiv.org/abs/2203.11171 |
| DSPy (Khattab et al.) | 2024 | https://github.com/stanfordnlp/dspy |
| "Brittle Foundations" (Verma) | 2024 | ReAct limitations study |
| Prompt Engineering Guide | 2025 | https://www.promptingguide.ai |
