# ESTUDO S51 -- Parallel Agent Execution & Scalability Architecture

> **Competitive Analysis: Devin Fusion, Factory Droids, Cursor Subagents, Claude Dynamic Workflows, MetaGPT**
> **IDEIA Implementation Strategy: Hybrid Architecture for True Parallel Multi-Agent Execution**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Competitive analysis + implementation study for parallel agent execution and scalability |

---

## Sumario

1. [Competitive Landscape](#1-competitive-landscape)
2. [IDEIA Current State](#2-ideia-current-state)
3. [Architecture: IDEIA Parallel Agent System](#3-architecture-ideia-parallel-agent-system)
4. [Agent Types](#4-agent-types)
5. [Parallel Execution Models](#5-parallel-execution-models)
6. [Fusion Pattern (Devin-inspired)](#6-fusion-pattern-devin-inspired)
7. [Droid Pattern (Factory-inspired)](#7-droid-pattern-factory-inspired)
8. [Child Sessions / Decomposition](#8-child-sessions--decomposition)
9. [Resource Management](#9-resource-management)
10. [State Management](#10-state-management)
11. [Communication Protocol](#11-communication-protocol)
12. [Fault Tolerance](#12-fault-tolerance)
13. [Code Examples](#13-code-examples)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Conexoes](#15-conexoes)

---

## 1. Competitive Landscape

### 1.1 Devin: Fusion Sidekicks

Devin's Fusion architecture is the most advanced parallel agent system in production. Key characteristics:

- **Single master agent** decomposes work into independent units
- **Sidekicks** (cheaper/faster model instances) execute subtasks in parallel
- **Sidekicks have different tools** depending on task type (filesystem, search, shell)
- **Master integrates results** from all sidekicks, resolves conflicts
- **Fusion with caching**: two model instances share cached context to reduce cost
- **Agentic MapReduce**: selectors identify what to parallelize, shards split data, map executes in parallel, reduce combines

```
Devin Fusion Architecture:

    User Task
        |
    [Master Agent]  -- (expensive model, planning, reasoning)
       /    |    \
      /     |     \
  [Sidekick1] [Sidekick2] [SidekickN]  -- (cheaper model, execution)
   (tools:    (tools:     (tools:
    filesystem, search,   shell,
    read)     read)       test)
      \     |     /
       \    |    /
    [Master Agent]  -- integrates, resolves conflicts, produces final result
        |
    Final Output
```

**Strengths:**
- True parallelism with independent sidekick sessions
- Cost optimization (expensive model only for planning/merge)
- Cached context reduces redundant LLM calls
- Strong isolation between sidekicks

**Weaknesses:**
- Proprietary, no reference implementation
- Sidekick orchestration complexity grows with N
- Limited to 2 models in Fusion (dual-model cache)
- No open-source equivalent

### 1.2 Factory: Droids

Factory's Droid system uses specialized container images for different task types:

- **3 Droid types**: compute-droid (CPU-intensive), routing-droid (I/O), testing-droid (test execution)
- **Pre-configured containers** with different tool sets, environments, and resource limits
- **Autonomous execution** within container -- droid receives task, executes independently, pushes result
- **Message bus** for result delivery (NATS-based internally)
- **Each droid has a specific image** with pre-installed dependencies

```
Factory Droid Architecture:

    Task Queue (NATS)
        |
    +---+---+---+---+
    |   |   |   |   |
    v   v   v   v   v
  [D1] [D2] [D3] [D4] [D5]  -- Droid Pool
   |     |    |    |    |
  Image1 Image2 Image1 Image3 Image2
  (compute) (routing) (compute) (testing) (routing)
    |     |    |    |    |
    +---+---+---+---+
        |
    Results Bus (NATS)
        |
    Result Collector
```

**Strengths:**
- Strong isolation via containers
- Specialized environments per task type
- NATS-based async communication
- Horizontal scaling (add more droid containers)

**Weaknesses:**
- Container overhead (cold starts)
- Limited to 3 droid types
- No dynamic task decomposition
- Heavy infrastructure dependency

### 1.3 Cursor: 8 Parallel Subagents

Cursor's Tab completion uses 8 parallel subagents for code generation:

- **8 subagents** run simultaneously for each completion request
- **Each subagent proposes a completion** using different strategies
- **Ranker model** selects best completion among 8
- **Subagents share no state** -- pure independent generation
- **Sub-millisecond ranking** -- ranker is a lightweight model

```
Cursor Tab Architecture:

    Cursor Position (editor context)
        |
    +----+----+----+----+----+----+----+----+
    |    |    |    |    |    |    |    |    |
    v    v    v    v    v    v    v    v    v
  [SA1] [SA2] [SA3] [SA4] [SA5] [SA6] [SA7] [SA8]
   |     |     |     |     |     |     |     |
   |     |     |     |     |     |     |     |
    +----+----+----+----+----+----+----+
              |
          [Ranker Model]
              |
        Best Completion
```

**Strengths:**
- Extremely fast parallel execution (sub-second)
- Lightweight subagents (no LLM call per agent)
- Deterministic ranker removes ambiguity
- No state synchronization needed

**Weaknesses:**
- Limited to code completion use case
- No task decomposition capability
- No state sharing between subagents
- 8-agent limit is hardcoded

### 1.4 Claude Code: Dynamic Workflows

Claude Code uses dynamic workflow generation with parallel execution:

- **Agent Teams**: sub-agents coordinated by a supervisor
- **Plan then execute**: Claude generates a plan, executes steps in parallel where dependencies allow
- **Checkpoint system**: each completed step creates a checkpoint, allows resume
- **Auto-testing**: parallel test execution with result collection
- **Workflow is dynamic**: plan can change based on results

```
Claude Code Workflow Architecture:

    User Request
        |
    [Planner]  -- generates execution plan (DAG)
        |
    +----+----+----+        +----+
    |    |    |    |        |    |
    v    v    v    v        v    v
  [S1] [S2] [S3] [S4]    [S5] [S6]  -- parallel steps
   |    |         |        |
   +----+         +--------+
   |    |         |        |
   v    v         v        v
  [S7] [S8]     [S9]     [S10]  -- sequential after dependency resolution
   |    |         |        |
    +---+---------+--------+
              |
        [Result Merger]
```

**Strengths:**
- Dynamic plan generation adapts to results
- Dependency resolution for optimal parallelism
- Checkpoint/resume for long-running tasks
- Auto-parallelization of independent steps

**Weaknesses:**
- Proprietary to Anthropic
- Plan generation adds latency overhead
- Limited visibility into internal orchestration
- No sidekick specialization

### 1.5 MetaGPT: Role-Based Parallel

MetaGPT uses role-based decomposition with parallel execution:

- **Pre-defined roles**: PM, Architect, Engineer, QA
- **Roles execute in pipeline** with parallel internal steps
- **Shared message pool** for inter-role communication
- **Structured artifacts** (PRD, Design, Code, Test) passed between roles
- **SOP-based execution**: Standard Operating Procedures guide each role's behavior

```
MetaGPT Role Architecture:

    User Request
        |
    [Product Manager]  -- writes PRD document
        |
    [Architect]  -- writes Design document
       /    \
      /      \
  [Engineer1] [Engineer2]  -- parallel code generation
      |        |
  [Engineer1 rev]  [Engineer2 rev]  -- self-review
      |        |
  [QA] -- tests both modules
      |
  [Product Manager]  -- final review
```

**Strengths:**
- Clear role separation with explicit contracts
- Structured artifacts reduce ambiguity
- Parallel execution within same role level
- SOP-based execution is reproducible

**Weaknesses:**
- Pipeline is sequential between roles
- No dynamic task decomposition
- Shared message pool becomes bottleneck
- No resource management or prioritization

### 1.6 LangGraph: Graph-Based Orchestration

LangGraph provides the underlying graph infrastructure used by many systems:

- **StateGraph** with typed state annotations
- **Nodes** as agent functions, **edges** as transitions
- **Parallel execution** via branching edges (fan-out/fan-in)
- **Sub-graphs** for hierarchical composition
- **Checkpointing** built-in for resume
- **LangSmith** for tracing and observability

```
LangGraph Parallel Pattern:

    Start
      |
    [Planner Node]
      |
      +----------+----------+
      |          |          |
      v          v          v
  [Node A]   [Node B]   [Node C]  -- parallel fan-out
      |          |          |
      +----------+----------+
      |
    [Merge Node]  -- fan-in
      |
    [Output Node]
      |
    End
```

**Strengths:**
- Flexible graph topology
- Built-in checkpointing
- Sub-graph composition
- Strong typing with TypeScript
- Open source with active community

**Weaknesses:**
- No built-in resource management
- No agent specialization concept
- No sidekick/subagent pattern
- No MapReduce primitives
- Single-process by default (no distributed)

### 1.7 Comparative Table

| Aspect | Devin Fusion | Factory Droids | Cursor Subagents | Claude Workflows | MetaGPT Roles | LangGraph |
|--------|-------------|---------------|------------------|-----------------|---------------|-----------|
| **Parallelism Model** | Master+Sidekicks | Container Pool | N-way generation | Dynamic DAG | Pipeline+Role | Graph-based |
| **Task Decomposition** | Automatic | Manual (pre-typed) | None | Dynamic planner | SOP-based | Manual edges |
| **Isolation Level** | Sidekick session | Container | In-process | Sub-agent session | In-process | In-process |
| **Communication** | Master collects | NATS message bus | Ranker collects | Supervisor collects | Shared pool | State merge |
| **Resource Mgmt** | Session-level | Container limits | None | Token budget | None | None |
| **Fault Tolerance** | Sidekick retry | Container restart | Discard failures | Checkpoint/resume | Pipeline retry | Node retry |
| **State Sharing** | Master-only | Message bus | None | Supervisor | Pool artifacts | Shared state |
| **Open Source** | No | No | No | No | Partial | Yes |
| **Cost Model** | Expensive master + cheap sidekicks | Per-container | Single model | Token-based | Sequential | Per-node |
| **Scalability** | Session pool | Horizontal (containers) | Fixed 8 | Sub-agent threads | Role instances | Graph instances |

---

## 2. IDEIA Current State

### 2.1 What Exists Today

The IDEIA platform has substantial foundational infrastructure for parallel execution, but no complete parallel agent runtime:

**Existing parallel infrastructure (ready):**

- `@ideia/event-bus` -- NATS JetStream with Pub/Sub, KV Store, DLQ, consumer groups, Request/Reply
- `@ideia/langgraph` -- StateGraph with 8 agent types, parallel nodes, sub-graphs, timeout/retry
- `@ideia/agent-router` -- FusionEngine with merge strategies, RouteSelector with autonomy levels (N0-N5)
- `@ideia/planning-engine` -- AdaptiveDecomposer, DependencyAnalyzer with parallel group detection
- `@ideia/agent-runtime` -- Parallel execution node (`createParallelExecutionNode`), AgentRegistry with concurrency limits
- `@ideia/continuity-engine` -- Scheduler with parallel support, checkpoint/restore
- `@ideia/verification-layer` -- Parallel verification suite execution
- `@ideia/agent-router/route-selector` -- N4 and N5 autonomy levels with `parallelAgents: true`

**Existing code analysis:**

```
packages/
  agent-runtime/src/
    parallel.ts           -- createParallelExecutionNode, createReviewerTesterParallelNode
    langgraph-graph.ts    -- LangGraphAgent (sequential invoke, no real parallel execution)
    agent-registry.ts     -- AgentRegistration with maxConcurrency, getDefaultAgents
    subgraphs.ts          -- Review subgraph (reviewer+tester parallel)
    edges.ts              -- parallelReviewerTesterEdgeCondition
    agent-orchestrator.ts -- creates agent with parallel nodes

  agent-router/src/
    fusion-engine.ts      -- FusionEngine (primitive merge, no NATS integration)
    route-selector.ts     -- RoutePipeline with parallelAgents flag
    types.ts              -- FusionInput, FusionResult, AgentRole

  planning-engine/src/
    dependency-analyzer.ts -- findParallelGroups, detectCycles, critical path
    decomposer.ts          -- AdaptiveDecomposer (top-down, bottom-up, hybrid)

  event-bus/src/            -- NATS JetStream full implementation
```

**Specific code detail -- existing ParallelNode (agent-runtime/src/parallel.ts):**

```
createParallelExecutionNode:
  - Takes array of ParallelNodeConfig (role + nodeFn)
  - Executes all via Promise.all
  - Merges outputs, decisions, artifacts, errors
  - No timeout management per sub-node
  - No isolation between sub-nodes
  - No NATS distribution
  - Single process, in-memory merge
  - No retry per sub-node (whole node retries)
```

**Specific code detail -- existing FusionEngine (agent-router/src/fusion-engine.ts):**

```
FusionEngine:
  - Takes FusionInput[] (agentRole, output, confidence, artifacts)
  - Sorts by priority order
  - Joins outputs with '---' separator
  - Averages confidence scores
  - No LLM-based conflict resolution
  - No NATS-based distribution
  - No subagent lifecycle management
  - No timeout handling
```

### 2.2 Identified Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **G-PAR-1** | Critical | No real parallel agent execution -- LangGraphAgent.invoke() is sequential |
| **G-PAR-2** | Critical | No Sidekick concept -- agents cannot spawn cheaper sub-agents |
| **G-PAR-3** | Critical | No MapReduce pattern -- data cannot be split, processed in parallel, merged |
| **G-PAR-4** | High | FusionEngine does not use NATS -- results are in-process only |
| **G-PAR-5** | High | No agent pool -- agents cannot be reused across tasks |
| **G-PAR-6** | High | No resource budgeting per agent -- CPU, memory, LLM tokens not managed |
| **G-PAR-7** | High | No child session concept -- tasks cannot be decomposed into sub-sessions |
| **G-PAR-8** | High | No agent-to-agent messaging -- agents communicate only through shared state |
| **G-PAR-9** | Medium | DependencyAnalyzer detects parallel groups but no executor runs them |
| **G-PAR-10** | Medium | No concurrency limit enforcement -- AgentRegistry has maxConcurrency but no throttle |
| **G-PAR-11** | Medium | No health monitoring for parallel agents -- orphan detection missing |
| **G-PAR-12** | Medium | No conflict resolution when parallel agents modify same files |
| **G-PAR-13** | Low | No agent metrics collection (latency, tokens, throughput) |
| **G-PAR-14** | Low | AgentRegistry has only 8 default agents, no droid specialization |

### 2.3 Current Architecture Diagram

```
Current IDEIA Parallel Flow (sequential in practice):

    User Input
        |
    [RouteSelector] -- picks N0-N5 level
        |
    [AdaptiveDecomposer] -- creates PlannedStep[]
        |
    [DependencyAnalyzer] -- finds parallelGroups (analysis only)
        |
    [LangGraphAgent.invoke()] -- SEQUENTIAL execution
        |
    [analyst] -> [architect] -> [programmer] -> [reviewer] -> [tester]
        |                                           |
        +---[parallel_reviewer_tester]--------------+  (in-process Promise.all)
        |
    [FusionEngine.fuse()] -- primitive string merge
        |
    Final Output
```

---

## 3. Architecture: IDEIA Parallel Agent System

### 3.1 Hybrid Approach

The proposed architecture combines the best patterns from each competitor:

| Source | Pattern | How IDEIA Adopts |
|--------|---------|-----------------|
| **Devin** | Fusion + Sidekicks | Master/Sidekick pattern with NATS task distribution |
| **Factory** | Droid containers | Pre-configured agent images with resource limits |
| **Cursor** | N-way parallel subagents | Cheap sub-agent pool for homogeneous tasks |
| **Claude** | Dynamic workflows | PlanningEngine generates DAG, dynamic re-planning |
| **MetaGPT** | Role-based decomposition | Agent roles with structured contracts |
| **LangGraph** | Graph-based orchestration | Underlying graph execution engine |

### 3.2 High-Level Architecture

```
IDEIA Parallel Agent System:

    +-----------------------------------------------------------+
    |                    Orchestrator Layer                       |
    |  +------------------+  +----------------+  +-------------+ |
    |  | TaskDecomposer   |  | FusionEngine   |  | SidekickPool| |
    |  | (DAG generation) |  | (result merge) |  | (pool mgmt) | |
    |  +--------+---------+  +-------+--------+  +------+------+ |
    +-----------|--------------------|-------------------|--------+
                |                    |                   |
    +-----------v--------------------v-------------------v--------+
    |                    Agent Execution Layer                      |
    |  +------------------+  +----------------+  +-------------+ |
    |  | LangGraph Runtime|  | DroidContainer |  | SubAgent Pool| |
    |  | (graph executor) |  | (container mgr)|  | (8x parallel)| |
    |  +--------+---------+  +-------+--------+  +------+------+ |
    +-----------|--------------------|-------------------|--------+
                |                    |                   |
    +-----------v--------------------v-------------------v--------+
    |                    Communication Layer                       |
    |  +------------------+  +----------------+  +-------------+ |
    |  | NATS Pub/Sub     |  | KV Store       |  | Req/Reply   | |
    |  | (agent messages) |  | (shared state) |  | (sync calls) | |
    |  +------------------+  +----------------+  +-------------+ |
    +------------------------------------------------------------+
                                |
    +------------------------------------------------------------+
    |                    Resource Management Layer                 |
    |  +------------------+  +----------------+  +-------------+ |
    |  | ResourceBudget   |  | QueueManager   |  | RateLimiter | |
    |  | (CPU/memory/tok) |  | (priority q)   |  | (LLM limit) | |
    |  +------------------+  +----------------+  +-------------+ |
    +------------------------------------------------------------+
                                |
    +------------------------------------------------------------+
    |                    Monitoring & Recovery Layer               |
    |  +------------------+  +----------------+  +-------------+ |
    |  | HealthMonitor    |  | OrphanDetector |  | Checkpoint  | |
    |  | (agent heartbeat)|  | (zombie kill)  |  | (save/rest) | |
    |  +------------------+  +----------------+  +-------------+ |
    +------------------------------------------------------------+
```

### 3.3 Package Structure

New packages to be created under `@ideia/*` namespace:

```
@ideia/parallel-agent/           -- Parallel execution system
  src/
    index.ts                     -- Public API exports
    types.ts                     -- Core types (AgentPoolConfig, SidekickDef, etc.)
    sidekick-pool.ts             -- SidekickPool with NATS distribution
    task-dispatcher.ts           -- TaskDispatcher for sidekick assignment
    result-collector.ts          -- ResultCollector with timeout/retry
    conflict-resolver.ts         -- ConflictResolver for merge issues
    agent-metrics.ts             -- Metrics collection for parallel agents

@ideia/droid-pool/               -- Droid container management
  src/
    index.ts                     -- Public API exports
    types.ts                     -- Droid types, image definitions
    droid-container.ts           -- DroidContainer with resource isolation
    container-pool.ts            -- ContainerPool lifecycle manager
    droid-image-registry.ts      -- DroidImageRegistry for pre-configured images
    resource-manager.ts          -- ResourceManager for CPU/memory allocation

@ideia/sidekick-runtime/         -- Sidekick execution runtime
  src/
    index.ts                     -- Public API exports
    sidekick-executor.ts         -- Sidekick execution with LLM call
    subagent-factory.ts          -- SubAgent factory for different models
    session-manager.ts           -- Child session lifecycle

@ideia/map-reduce/               -- MapReduce executor
  src/
    index.ts                     -- Public API exports
    types.ts                     -- Selector, Shard, Mapper, Reducer types
    map-reduce-executor.ts       -- MapReduce with configurable phases
    selector-engine.ts           -- Selector strategies (file, line, semantic)
    shard-engine.ts              -- Data splitting strategies
    reducer-engine.ts            -- Merge strategies

Updates to existing packages:

@ideia/agent-runtime/
  src/
    parallel.ts                  -- Enhanced parallel execution with NATS support
    langgraph-graph.ts           -- Add distributed execution mode
    agent-registry.ts            -- Add sidekick registration, droid types

@ideia/agent-router/
  src/
    fusion-engine.ts             -- Enhanced with NATS distribution, LLM conflict resolution

@ideia/planning-engine/
  src/
    decomposer.ts                -- Enhanced with sub-session decomposition
    dependency-analyzer.ts       -- Enhanced with cost-based parallel group optimization
```

---

## 4. Agent Types

### 4.1 Agent Classification

The system defines four categories of agents:

| Type | Description | Model Cost | Lifetime | Concurrency |
|------|-------------|-----------|----------|-------------|
| **Specialized** | Role-based agents with full capabilities | Medium-High | Task lifetime | 2-3 per type |
| **Sub-agent** | Lightweight executor for subtasks | Low-Cheap | Subtask only | 8-16 per task |
| **Sidekick** | Independent parallel agent with dedicated tools | Medium | Session lifetime | 4-8 per master |
| **Meta-agent** | Orchestrator that manages other agents | High | Global | 1 per graph |

### 4.2 Specialized Agents

The existing 8 agent types with enhanced parallel capabilities:

| Agent | Role | Parallelizable | Max Concurrency | Resource Budget |
|-------|------|---------------|-----------------|-----------------|
| Analyst | Analyze requirements | Yes (multi-file analysis) | 2 | CPU: 0.5, Mem: 512MB, Tokens: 4000 |
| Architect | Design architecture | Yes (trade-off analysis) | 1 | CPU: 1.0, Mem: 1GB, Tokens: 8000 |
| Programmer | Implement code | Yes (per-file/function) | 4 | CPU: 1.0, Mem: 1GB, Tokens: 6000 |
| Reviewer | Review code | Yes (per-file) | 3 | CPU: 0.5, Mem: 512MB, Tokens: 3000 |
| Tester | Create tests | Yes (per-module) | 3 | CPU: 0.5, Mem: 512MB, Tokens: 3000 |
| DevOps | Deploy/infra | Yes (multi-service) | 2 | CPU: 0.5, Mem: 512MB, Tokens: 4000 |
| Security | Security audit | Yes (per-component) | 2 | CPU: 0.5, Mem: 512MB, Tokens: 4000 |
| Supervisor | Coordination | No (single orchestrator) | 1 | CPU: 1.0, Mem: 2GB, Tokens: 15000 |

### 4.3 Sub-Agents

Cheaper, faster agents for homogeneous subtasks:

```
interface SubAgentDefinition {
  id: string;
  modelName: string;        // e.g., 'llama3-8b', 'phi-3-mini', 'gpt-4o-mini'
  role: 'formatter' | 'linter' | 'test-generator' | 'file-reader' | 'search-worker';
  maxConcurrency: number;
  timeout: number;           // ms
  costPerCall: number;       // USD or token estimate
  parentAgentId: string;     // which specialized agent spawned this
}

const DEFAULT_SUB_AGENTS: SubAgentDefinition[] = [
  { id: 'fmt-1', modelName: 'llama3-8b', role: 'formatter', maxConcurrency: 8, timeout: 5000, costPerCall: 0.0001, parentAgentId: 'programmer' },
  { id: 'lint-1', modelName: 'phi-3-mini', role: 'linter', maxConcurrency: 8, timeout: 3000, costPerCall: 0.00005, parentAgentId: 'reviewer' },
  { id: 'test-gen-1', modelName: 'llama3-8b', role: 'test-generator', maxConcurrency: 4, timeout: 10000, costPerCall: 0.0001, parentAgentId: 'tester' },
  { id: 'search-1', modelName: 'phi-3-mini', role: 'search-worker', maxConcurrency: 16, timeout: 2000, costPerCall: 0.00002, parentAgentId: 'analyst' },
];
```

### 4.4 Sidekicks

Independent parallel agents with dedicated tool sets:

```
interface SidekickDefinition {
  id: string;
  name: string;
  tools: ('filesystem' | 'shell' | 'search' | 'network' | 'database' | 'browser')[];
  model: { provider: string; model: string; contextWindow: number };
  resourceBudget: ResourceBudget;
  maxLifetime: number;        // ms, max session duration
  allowedDomains: string[];   // network access restrictions
}

const DEFAULT_SIDEKICKS: SidekickDefinition[] = [
  {
    id: 'sk-code', name: 'Code Sidekick',
    tools: ['filesystem', 'shell', 'search'],
    model: { provider: 'ollama', model: 'codellama-13b', contextWindow: 8192 },
    resourceBudget: { cpu: 0.5, memoryMB: 256, maxTokens: 2000, maxLLMCalls: 10 },
    maxLifetime: 300000,
    allowedDomains: [],
  },
  {
    id: 'sk-test', name: 'Test Sidekick',
    tools: ['filesystem', 'shell'],
    model: { provider: 'ollama', model: 'llama3-8b', contextWindow: 4096 },
    resourceBudget: { cpu: 0.5, memoryMB: 256, maxTokens: 1500, maxLLMCalls: 8 },
    maxLifetime: 300000,
    allowedDomains: [],
  },
  {
    id: 'sk-search', name: 'Search Sidekick',
    tools: ['search', 'network'],
    model: { provider: 'ollama', model: 'phi-3-mini', contextWindow: 4096 },
    resourceBudget: { cpu: 0.3, memoryMB: 128, maxTokens: 500, maxLLMCalls: 20 },
    maxLifetime: 600000,
    allowedDomains: ['*'],
  },
];
```

### 4.5 Meta-Agents

Orchestrators that manage other agents:

```
interface MetaAgentDefinition {
  id: string;
  role: 'supervisor' | 'fusion' | 'decomposer' | 'scheduler';
  model: { provider: string; model: string; contextWindow: number };
  managedAgentIds: string[];
  resourceBudget: ResourceBudget;
  planningHorizon: number;     // how many steps ahead to plan
}

const DEFAULT_META_AGENTS: MetaAgentDefinition[] = [
  {
    id: 'supervisor-1', role: 'supervisor',
    model: { provider: 'ollama', model: 'qwen2.5-32b', contextWindow: 32768 },
    managedAgentIds: ['analyst-1', 'architect-1', 'programmer-1'],
    resourceBudget: { cpu: 1.0, memoryMB: 1024, maxTokens: 8000, maxLLMCalls: 30 },
    planningHorizon: 5,
  },
  {
    id: 'fusion-1', role: 'fusion',
    model: { provider: 'ollama', model: 'qwen2.5-14b', contextWindow: 16384 },
    managedAgentIds: ['sk-code', 'sk-test', 'sk-search'],
    resourceBudget: { cpu: 0.5, memoryMB: 512, maxTokens: 4000, maxLLMCalls: 15 },
    planningHorizon: 0,
  },
];
```

### 4.6 Resource Budget Model

```
interface ResourceBudget {
  cpu: number;              // fractional CPU cores (0.5 = half core)
  memoryMB: number;         // RAM limit in MB
  maxTokens: number;        // max LLM tokens per agent lifetime
  maxLLMCalls: number;      // max LLM calls per agent lifetime
  priority: 1 | 2 | 3 | 4 | 5;  // 5 = highest
  concurrencyLimit: number; // max parallel instances of this agent type
}

interface QueueEntry {
  agentId: string;
  priority: number;
  resourceBudget: ResourceBudget;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  dependencies: string[];   // agent IDs that must complete first
  createdAt: number;
}
```

---

## 5. Parallel Execution Models

### 5.1 Fork-Join

One task is split into N independent sub-tasks, executed in parallel, then results merged.

```
ForkJoin Pattern:

    [Master]
       |
    (fork) -----------+
       |              |
    [Sub1]          [Sub2]         [SubN]
       |              |              |
    (analysis)    (implementation)  (testing)
       |              |              |
    (join) -----------+--------------+
       |
    [Merge]
       |
    Final Result

ForkJoinConfig:
  strategy: 'eager' | 'lazy'      // eager = fork all, lazy = fork on demand
  maxParallel: number             // max concurrent sub-tasks
  timeoutPerSub: number           // per sub-task timeout
  mergeStrategy: FusionConfig
  failBehavior: 'fail_all' | 'ignore_failures' | 'majority'
```

**Implementation plan:**
1. Master agent identifies parallelizable work units
2. TaskDispatcher creates N sub-tasks with dependencies
3. SidekickPool.executeAll(subtasks) runs in parallel via NATS distribution
4. ResultCollector waits for all (or majority) results
5. ConflictResolver merges conflicting outputs
6. Master integrates merged result into final output

### 5.2 MapReduce

Large data is split, processed in parallel, then reduced.

```
MapReduce Pattern:

    [Input Data]
        |
    [Selector] -- identifies what to parallelize (files, lines, functions)
        |
    [ShardEngine] -- splits data into N shards
        |
    +----+----+----+----+
    |    |    |    |    |
    [M1] [M2] [M3] [M4] -- parallel map phase
    |    |    |    |    |
    +----+----+----+----+
        |
    [ReduceEngine] -- merge, aggregate, reconcile
        |
    [ApplyPhase] -- write results back to workspace
        |
    Final Output

MapReduceConfig:
  selector: 'file' | 'function' | 'semantic' | 'regex'
  shardBy: 'size' | 'count' | 'semantic'
  mapFn: (shard) => Result
  reduceFn: (results[]) => MergedResult
  parallelMap: number
  parallelReduce: number
  combineInMap: boolean     // local combine before global reduce
```

**Use cases for IDEIA:**
- Multi-file refactoring (shard by file, map = refactor, reduce = compile-check)
- Code review (shard by module, map = review, reduce = aggregate findings)
- Test generation (shard by function, map = generate tests, reduce = deduplicate)
- Documentation generation (shard by API, map = document, reduce = cross-reference)

### 5.3 Pipeline

Sequential stages with parallel execution within each stage.

```
Pipeline Pattern:

    Stage 1 (analysis)
      [Analyst1] [Analyst2] [Analyst3]  -- parallel analysis of different aspects
         |
    Stage 2 (planning)
      [Architect1] [Architect2]  -- parallel trade-off analysis
         |
    Stage 3 (implementation)
      [Prog1] [Prog2] [Prog3] [Prog4]  -- parallel per-file implementation
         |
    Stage 4 (verification)
      [Tester1] [Reviewer1] [Security1]  -- parallel verification
         |
    Stage 5 (delivery)
      [DevOps1] -- single deploy

PipelineConfig:
  stages: PipelineStage[]
  maxParallelPerStage: number
  bufferSize: number           // max items between stages
  stageTimeout: number
  onStageComplete: (stage, result) => void
  onStageFail: (stage, error) => 'abort' | 'skip' | 'retry'
```

### 5.4 Fire-and-Forget

Sidekicks execute independently without blocking the main task.

```
FireAndForget Pattern:

    [Master Task]  -- continues execution
       |
    [Fire] -----------+------------------+
       |              |                  |
    (master)   [Sidekick: search]  [Sidekick: test]
    continues     (answers later)    (reports later)
       |
    (master
    completes)

FireAndForgetConfig:
  sidekickId: string
  task: Task
  timeout: number
  resultCallback: (result) => void
  onTimeout: () => void
```

**Use cases:**
- Background knowledge search while coding
- Background test suite while developing
- Background documentation generation
- Background security scan

### 5.5 Dynamic (Tree-Based Decomposition)

Runtime decomposition based on intermediate results.

```
Dynamic Decomposition:

    [Task]
      |
    [Analyzer] -- determines decomposition strategy
      |
    [Split] -- runtime decision
      / \
     /   \
  [SubA] [SubB] -- parallel
    |      |
  [SubA1] [SubB1] -- sequential dependencies
    |      |
  [SubA2] [SubB2] -- may spawn more children
    |      |
    +------+
      |
    [Merge]
      |
    [Evaluate] -- decide if done or re-decompose
```

**Implementation approach:**
1. Start with initial task
2. Decomposer analyzes task and suggests decomposition
3. Execute sub-tasks in parallel based on dependency graph
4. After each completion, re-analyze remaining work
5. Dynamic re-planning if results deviate from expected

### 5.6 Model Selection per Execution Type

| Execution Model | Recommended Model | Rationale |
|----------------|------------------|-----------|
| Fork-Join Merge | Expensive (qwen2.5-32b) | Complex reasoning for integration |
| Fork-Join Sub | Cheap (codellama-13b) | Independent execution |
| Map Phase | Sub-agent (phi-3-mini) | High volume, simple transformations |
| Reduce Phase | Medium (llama3-8b) | Aggregation without deep reasoning |
| Pipeline Stage | Medium (qwen2.5-14b) | Structured output with context |
| Fire-and-Forget | Cheap (phi-3-mini) | Background tasks |
| Dynamic Decompose | Expensive (qwen2.5-32b) | Complex planning decisions |

---

## 6. Fusion Pattern (Devin-inspired)

### 6.1 Pattern Overview

The Fusion pattern enables a master agent to dispatch work to specialized sidekicks, collect results, and produce an integrated output. This is IDEIA's adaptation of Devin's Fusion:

```
Master Agent identifies work
    |
    +-- dispatches to specialized sidekicks (via NATS Req/Reply)
    |
    +-- sidekicks execute independently with their own tools
    |
    +-- sidekicks report back results (via NATS Pub/Sub)
    |
    +-- master integrates results via FusionEngine
    |
    +-- ConflictResolver handles divergent outputs
    |
    +-- Master produces final integrated result
```

### 6.2 SidekickPool

Manages the lifecycle of sidekick agents, including creation, assignment, and cleanup:

```
import { EventBus } from '@ideia/event-bus';
import { SidekickDefinition, ResourceBudget } from './types';

export interface SidekickPoolConfig {
  maxPoolSize: number;
  defaultTimeout: number;
  cleanupIntervalMs: number;
  eventBus: EventBus;
}

export class SidekickPool {
  private pool: Map<string, {
    definition: SidekickDefinition;
    instanceId: string;
    busy: boolean;
    currentTask: string | null;
    startedAt: number;
    llmCallsUsed: number;
  }> = new Map();

  private config: SidekickPoolConfig;
  private taskQueue: Array<{
    taskId: string;
    sidekickType: string;
    payload: unknown;
    priority: number;
    timeout: number;
  }> = [];

  constructor(config: SidekickPoolConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  registerSidekick(def: SidekickDefinition): void {
    for (let i = 0; i < def.maxConcurrency; i++) {
      const instanceId = `${def.id}-${i}`;
      this.pool.set(instanceId, {
        definition: def,
        instanceId,
        busy: false,
        currentTask: null,
        startedAt: Date.now(),
        llmCallsUsed: 0,
      });
    }
  }

  async executeTask(
    sidekickType: string,
    task: { taskId: string; payload: unknown },
    options?: { priority?: number; timeout?: number }
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const available = this.findAvailable(sidekickType);
    if (available) {
      return this.assignTask(available, task, options);
    }
    return this.enqueueTask(sidekickType, task, options);
  }

  private assignTask(
    instance: typeof this.pool extends Map<string, infer V> ? V : never,
    task: { taskId: string; payload: unknown },
    options?: { priority?: number; timeout?: number }
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    instance.busy = true;
    instance.currentTask = task.taskId;

    const subject = `sidekick.${instance.definition.id}.execute`;
    const timeout = options?.timeout ?? this.config.defaultTimeout;

    return this.config.eventBus.request(subject, task.payload, { timeout })
      .then(response => {
        instance.llmCallsUsed++;
        instance.busy = false;
        instance.currentTask = null;
        return { success: true, result: response };
      })
      .catch(error => {
        instance.busy = false;
        instance.currentTask = null;
        return { success: false, error: String(error) };
      });
  }

  private findAvailable(sidekickType: string): typeof this.pool extends Map<string, infer V> ? V : null {
    for (const [, instance] of this.pool) {
      if (instance.definition.id === sidekickType && !instance.busy) {
        return instance;
      }
    }
    return null;
  }

  private enqueueTask(sidekickType: string, task: { taskId: string; payload: unknown }, options?: { priority?: number; timeout?: number }): Promise<{ success: boolean; result?: unknown; error?: string }> {
    return new Promise((resolve) => {
      this.taskQueue.push({
        taskId: task.taskId,
        sidekickType,
        payload: task.payload,
        priority: options?.priority ?? 3,
        timeout: options?.timeout ?? this.config.defaultTimeout,
      });
      this.taskQueue.sort((a, b) => b.priority - a.priority);

      this.config.eventBus.subscribe(`sidekick.${sidekickType}.available`, () => {
        const next = this.taskQueue.shift();
        if (next) {
          const available = this.findAvailable(next.sidekickType);
          if (available) {
            this.assignTask(available, { taskId: next.taskId, payload: next.payload }, { priority: next.priority, timeout: next.timeout })
              .then(resolve);
          }
        }
      });
    });
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, instance] of this.pool) {
        if (instance.busy && instance.startedAt + (instance.definition.maxLifetime ?? 300000) < now) {
          this.config.eventBus.publish(`sidekick.${id}.timeout`, { instanceId: id });
          instance.busy = false;
          instance.currentTask = null;
        }
      }
    }, this.config.cleanupIntervalMs);
  }

  getPoolStatus(): { total: number; busy: number; available: number; queued: number } {
    const entries = Array.from(this.pool.values());
    return {
      total: entries.length,
      busy: entries.filter(e => e.busy).length,
      available: entries.filter(e => !e.busy).length,
      queued: this.taskQueue.length,
    };
  }
}
```

### 6.3 TaskDispatcher

Decides which sidekick should handle which task based on capability matching and load:

```
export interface DispatchRule {
  taskPattern: RegExp;
  sidekickType: string;
  priority: number;
  requiredTools: string[];
  maxRetries: number;
}

export class TaskDispatcher {
  private rules: DispatchRule[] = [];
  private pool: SidekickPool;

  constructor(pool: SidekickPool) {
    this.pool = pool;
  }

  addRule(rule: DispatchRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  async dispatch(task: { taskId: string; type: string; payload: unknown; description: string }): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const matchingRule = this.findMatchingRule(task);

    if (!matchingRule) {
      return { success: false, error: `No dispatch rule for task: ${task.description}` };
    }

    return this.pool.executeTask(matchingRule.sidekickType, {
      taskId: task.taskId,
      payload: task.payload,
    }, { priority: matchingRule.priority });
  }

  private findMatchingRule(task: { type: string; description: string }): DispatchRule | undefined {
    return this.rules.find(rule => rule.taskPattern.test(task.type) || rule.taskPattern.test(task.description));
  }

  dispatchBatch(tasks: Array<{ taskId: string; type: string; payload: unknown; description: string }>): Promise<Array<{ success: boolean; result?: unknown; error?: string }>> {
    return Promise.all(tasks.map(t => this.dispatch(t)));
  }
}
```

### 6.4 ResultCollector

Collects results from multiple parallel sidekicks with timeout handling:

```
export interface CollectOptions {
  expectedResults: number;
  timeout: number;
  tolerance: number; // how many results can be missing before considered failure
  dedupKey?: (result: unknown) => string;
}

export class ResultCollector {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async collect(
    taskIds: string[],
    options: CollectOptions
  ): Promise<{ completed: Map<string, unknown>; failed: Map<string, string>; timedOut: string[] }> {
    const completed = new Map<string, unknown>();
    const failed = new Map<string, string>();
    const timedOut: string[] = [];

    const results = await Promise.race([
      this.waitForResults(taskIds, options.expectedResults, completed, failed),
      this.timeout(options.timeout),
    ]);

    if (results === 'timeout') {
      for (const taskId of taskIds) {
        if (!completed.has(taskId) && !failed.has(taskId)) {
          timedOut.push(taskId);
        }
      }
    }

    return { completed, failed, timedOut };
  }

  private async waitForResults(
    taskIds: string[],
    expectedCount: number,
    completed: Map<string, unknown>,
    failed: Map<string, string>
  ): Promise<'completed'> {
    return new Promise(resolve => {
      let count = 0;
      for (const taskId of taskIds) {
        this.eventBus.subscribe(`result.${taskId}`, (data: { success: boolean; result?: unknown; error?: string }) => {
          if (data.success) {
            completed.set(taskId, data.result);
          } else {
            failed.set(taskId, data.error ?? 'Unknown error');
          }
          count++;
          if (count >= expectedCount) {
            resolve('completed');
          }
        });
      }
    });
  }

  private async timeout(ms: number): Promise<'timeout'> {
    return new Promise(resolve => setTimeout(() => resolve('timeout'), ms));
  }
}
```

### 6.5 ConflictResolver

Resolves conflicts when multiple parallel agents produce divergent results:

```
export type ConflictResolutionStrategy = 'llm_merge' | 'priority_order' | 'majority_vote' | 'latest_wins';

export interface ConflictResolverConfig {
  strategy: ConflictResolutionStrategy;
  priorityOrder: string[];
  llmMergePrompt?: string;
}

export class ConflictResolver {
  private config: ConflictResolverConfig;
  private llmProvider: LLMProvider;

  constructor(config: ConflictResolverConfig, llmProvider: LLMProvider) {
    this.config = config;
    this.llmProvider = llmProvider;
  }

  async resolve(results: Map<string, unknown>): Promise<{
    merged: unknown;
    conflicts: Array<{ agents: string[]; type: string; resolution: string }>;
  }> {
    const conflicts: Array<{ agents: string[]; type: string; resolution: string }> = [];

    switch (this.config.strategy) {
      case 'llm_merge':
        return this.llmMerge(results, conflicts);
      case 'priority_order':
        return this.priorityMerge(results, conflicts);
      case 'majority_vote':
        return this.majorityVote(results, conflicts);
      case 'latest_wins':
        return this.latestWins(results, conflicts);
    }
  }

  private async llmMerge(
    results: Map<string, unknown>,
    conflicts: Array<{ agents: string[]; type: string; resolution: string }>
  ): Promise<{ merged: unknown; conflicts: Array<{ agents: string[]; type: string; resolution: string }> } {
    const entries = Array.from(results.entries());
    const prompt = this.config.llmMergePrompt ?? `Merge the following outputs into a single coherent result:\n\n${entries.map(([agent, result]) => `[${agent}]:\n${JSON.stringify(result)}`).join('\n\n')}`;

    const response = await this.llmProvider.generate(prompt);
    return { merged: response, conflicts };
  }

  private priorityMerge(
    results: Map<string, unknown>,
    conflicts: Array<{ agents: string[]; type: string; resolution: string }>
  ): { merged: unknown; conflicts: Array<{ agents: string[]; type: string; resolution: string }> } {
    for (const agent of this.config.priorityOrder) {
      if (results.has(agent)) {
        return { merged: results.get(agent), conflicts };
      }
    }
    return { merged: results.values().next().value, conflicts };
  }

  private majorityVote(
    results: Map<string, unknown>,
    conflicts: Array<{ agents: string[]; type: string; resolution: string }>
  ): { merged: unknown; conflicts: Array<{ agents: string[]; type: string; resolution: string }> } {
    const votes = new Map<string, number>();
    for (const result of results.values()) {
      const key = JSON.stringify(result);
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }

    let maxVotes = 0;
    let winner: unknown = null;
    for (const [key, count] of votes) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = JSON.parse(key);
      }
    }

    if (maxVotes > 1) {
      conflicts.push({
        agents: Array.from(results.keys()),
        type: 'majority_consensus',
        resolution: `Chosen by majority (${maxVotes}/${results.size} votes)`,
      });
    }

    return { merged: winner, conflicts };
  }

  private latestWins(
    results: Map<string, unknown>,
    _conflicts: Array<{ agents: string[]; type: string; resolution: string }>
  ): { merged: unknown; conflicts: Array<{ agents: string[]; type: string; resolution: string }> } {
    const keys = Array.from(results.keys());
    return { merged: results.get(keys[keys.length - 1]), conflicts: [] };
  }
}
```

---

## 7. Droid Pattern (Factory-inspired)

### 7.1 Pattern Overview

The Droid pattern pre-configures specialized execution environments for different task types, providing strong isolation and optimized resource allocation:

```
Droid Pattern Flow:

    [DroidImageRegistry] -- stores pre-configured droid images
        |
    [Task arrives] -- classified by type
        |
    [ContainerPool] -- acquires or creates droid
        |
    [DroidContainer] -- executes task in isolated environment
        |
    [ResourceManager] -- monitors CPU/memory/tokens
        |
    [Results pushed to NATS] -- async result delivery
        |
    [ContainerPool] -- releases droid back to pool
```

### 7.2 Droid Types

Three primary droid types adapted from Factory's model:

```
Droid Types:
  compute-droid:
    Image: base-node:20 + build tools
    Use: code generation, compilation, analysis
    CPU: 2 cores, RAM: 2GB, Disk: 1GB
    Timeout: 120s
    LLM: Medium (qwen2.5-14b)

  routing-droid:
    Image: base-node:20 + network tools
    Use: API calls, web scraping, NATS operations
    CPU: 0.5 cores, RAM: 512MB, Disk: 256MB
    Timeout: 60s
    LLM: Cheap (phi-3-mini)

  testing-droid:
    Image: base-node:20 + test frameworks
    Use: test execution, coverage, linting
    CPU: 4 cores, RAM: 4GB, Disk: 2GB
    Timeout: 300s
    LLM: None (no LLM needed)
```

### 7.3 DroidContainerManager

```
import { EventBus } from '@ideia/event-bus';

export interface DroidImage {
  id: string;
  type: 'compute' | 'routing' | 'testing';
  baseImage: string;
  tools: string[];
  resourceLimits: { cpu: number; memoryMB: number; diskMB: number };
  defaultTimeout: number;
}

export interface DroidInstance {
  id: string;
  image: DroidImage;
  containerId: string;
  status: 'idle' | 'busy' | 'error';
  currentTaskId: string | null;
  startedAt: number;
  metrics: { cpuUsage: number; memoryUsage: number; taskCount: number };
}

export class DroidContainerManager {
  private images: DroidImage[] = [];
  private pool: Map<string, DroidInstance[]> = new Map();
  private eventBus: EventBus;
  private maxInstancesPerImage: number;

  constructor(eventBus: EventBus, maxInstances: number = 5) {
    this.eventBus = eventBus;
    this.maxInstancesPerImage = maxInstances;
  }

  registerImage(image: DroidImage): void {
    this.images.push(image);
    this.pool.set(image.id, []);
  }

  async acquireDroid(imageType: string, taskId: string): Promise<DroidInstance | null> {
    const image = this.images.find(i => i.id === imageType || i.type === imageType);
    if (!image) return null;

    const instances = this.pool.get(image.id) ?? [];
    const idle = instances.find(i => i.status === 'idle');

    if (idle) {
      idle.status = 'busy';
      idle.currentTaskId = taskId;
      return idle;
    }

    if (instances.length < this.maxInstancesPerImage) {
      const droid = await this.createDroid(image, taskId);
      this.pool.set(image.id, [...instances, droid]);
      return droid;
    }

    return null;
  }

  async releaseDroid(droidId: string): Promise<void> {
    for (const [, instances] of this.pool) {
      const droid = instances.find(i => i.id === droidId);
      if (droid) {
        droid.status = 'idle';
        droid.currentTaskId = null;
        droid.metrics.taskCount++;
        return;
      }
    }
  }

  private async createDroid(image: DroidImage, taskId: string): Promise<DroidInstance> {
    const id = `droid-${image.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await this.eventBus.publish(`droid.create`, {
      droidId: id,
      imageId: image.id,
      resourceLimits: image.resourceLimits,
      taskId,
    });

    return {
      id,
      image,
      containerId: `container-${id}`,
      status: 'busy',
      currentTaskId: taskId,
      startedAt: Date.now(),
      metrics: { cpuUsage: 0, memoryUsage: 0, taskCount: 1 },
    };
  }

  async executeOnDroid(
    imageType: string,
    task: { taskId: string; payload: unknown; timeout?: number }
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const droid = await this.acquireDroid(imageType, task.taskId);
    if (!droid) {
      return { success: false, error: `No available droid for image type: ${imageType}` };
    }

    try {
      const timeout = task.timeout ?? droid.image.defaultTimeout;
      const result = await this.eventBus.request(
        `droid.${droid.id}.execute`,
        task.payload,
        { timeout }
      );
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      await this.releaseDroid(droid.id);
    }
  }

  getPoolStatus(): Record<string, { total: number; busy: number; idle: number; tasksCompleted: number }> {
    const status: Record<string, { total: number; busy: number; idle: number; tasksCompleted: number }> = {};
    for (const [imageId, instances] of this.pool) {
      status[imageId] = {
        total: instances.length,
        busy: instances.filter(i => i.status === 'busy').length,
        idle: instances.filter(i => i.status === 'idle').length,
        tasksCompleted: instances.reduce((s, i) => s + i.metrics.taskCount, 0),
      };
    }
    return status;
  }
}
```

---

## 8. Child Sessions / Decomposition

### 8.1 Automatic Task Decomposition

The system decomposes large tasks into smaller sub-tasks automatically:

```
Task Decomposition Flow:

    [Large Task: "Implement user authentication system"]
        |
    [AdaptiveDecomposer]
        |
    +----+--------+--------+--------+
    |    |        |        |        |
    v    v        v        v        v
  [UI] [API]  [DB]    [Tests] [Docs]  -- sub-tasks
   |    |      |        |       |
   |   [Routes]         |       |
   |    |     [Schema]  |       |
   |   [JWT]    |      [Unit]  [API Docs]
   |   [Middleware]    [Integ]  [User Guide]
   |                   [E2E]
   |
  [Login Form] [Register] [Password Reset]

Dependencies:
  DB.schema -> API.routes -> API.JWT -> API.Middleware
  API.Routes -> Tests.Integration -> Tests.E2E
  DB.schema -> Tests.Unit
  API.* -> Docs.*
```

### 8.2 Dependency Resolution

```
export interface TaskNode {
  id: string;
  description: string;
  agentType: string;
  estimatedCost: CostEstimate;
  dependencies: string[];     // task IDs this depends on
  subTasks: TaskNode[];       // child decomposition
  parallelWith: string[];     // tasks that can run in parallel
  sessionId: string | null;   // assigned session
}

export class DependencyResolver {
  resolve(tasks: TaskNode[]): {
    layers: TaskNode[][];     // topological layers (each layer is parallel)
    criticalPath: TaskNode[];
    totalEstimatedTime: number;
    parallelSpeedup: number;  // speedup ratio vs sequential
  } {
    const { layers, remaining } = this.buildLayers(tasks);
    const criticalPath = this.findCriticalPath(tasks);
    const sequentialTime = tasks.reduce((s, t) => s + (t.estimatedCost.estimatedSeconds ?? 60), 0);
    const parallelTime = layers.reduce((s, layer) => {
      const maxInLayer = Math.max(...layer.map(t => t.estimatedCost.estimatedSeconds ?? 60));
      return s + maxInLayer;
    }, 0);

    return {
      layers,
      criticalPath,
      totalEstimatedTime: parallelTime,
      parallelSpeedup: sequentialTime / Math.max(parallelTime, 1),
    };
  }

  private buildLayers(tasks: TaskNode[]): { layers: TaskNode[][]; remaining: TaskNode[] } {
    const layers: TaskNode[][] = [];
    const remaining = [...tasks];
    const completed = new Set<string>();

    while (remaining.length > 0) {
      const layer = remaining.filter(t =>
        t.dependencies.every(d => completed.has(d))
      );
      if (layer.length === 0) break;
      layers.push(layer);
      for (const t of layer) {
        completed.add(t.id);
      }
      const layerIds = new Set(layer.map(t => t.id));
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (layerIds.has(remaining[i].id)) {
          remaining.splice(i, 1);
        }
      }
    }

    return { layers, remaining };
  }

  private findCriticalPath(tasks: TaskNode[]): TaskNode[] {
    const graph = new Map<string, TaskNode>();
    for (const t of tasks) {
      graph.set(t.id, t);
    }

    const memo = new Map<string, { path: TaskNode[]; time: number }>();

    const dfs = (nodeId: string): { path: TaskNode[]; time: number } => {
      if (memo.has(nodeId)) return memo.get(nodeId)!;
      const node = graph.get(nodeId)!;
      if (!node || node.dependencies.length === 0) {
        const result = { path: [node], time: node?.estimatedCost.estimatedSeconds ?? 60 };
        memo.set(nodeId, result);
        return result;
      }

      let maxTime = 0;
      let bestPath: TaskNode[] = [];

      for (const depId of node.dependencies) {
        const depResult = dfs(depId);
        if (depResult.time > maxTime) {
          maxTime = depResult.time;
          bestPath = depResult.path;
        }
      }

      const result = {
        path: [...bestPath, node],
        time: maxTime + (node?.estimatedCost.estimatedSeconds ?? 60),
      };
      memo.set(nodeId, result);
      return result;
    };

    let maxTime = 0;
    let criticalPath: TaskNode[] = [];
    for (const t of tasks) {
      if (t.dependencies.length === 0) {
        const result = dfs(t.id);
        if (result.time > maxTime) {
          maxTime = result.time;
          criticalPath = result.path;
        }
      }
    }

    return criticalPath;
  }
}
```

### 8.3 Parallel Execution of Independent Sub-Tasks

Once the dependency graph is resolved, independent sub-tasks execute in parallel:

```
async function executeParallelPlan(
  layers: TaskNode[][],
  executor: (task: TaskNode) => Promise<unknown>
): Promise<Map<string, unknown>> {
  const results = new Map<string, unknown>();
  const errors = new Map<string, string>();

  for (const layer of layers) {
    const layerResults = await Promise.allSettled(
      layer.map(async task => {
        try {
          const result = await executor(task);
          results.set(task.id, result);
          return { taskId: task.id, success: true as const, result };
        } catch (error) {
          errors.set(task.id, String(error));
          return { taskId: task.id, success: false as const, error: String(error) };
        }
      })
    );

    for (const result of layerResults) {
      if (result.status === 'rejected') {
        const settled = result as PromiseSettledResult<{ taskId: string; success: false; error: string }>;
        errors.set('unknown', settled.reason?.toString() ?? 'Promise rejected');
      }
    }

    if (errors.size > 0 && this.config.failBehavior === 'fail_all') {
      throw new Error(`Layer failed: ${Array.from(errors.entries()).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }
  }

  return results;
}
```

### 8.4 Progress Tracking Across Sessions

```
interface SessionProgress {
  sessionId: string;
  parentSessionId: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;            // 0-100
  currentTask: string | null;
  completedTasks: string[];
  failedTasks: string[];
  estimatedRemainingMs: number;
  startedAt: number;
  lastHeartbeat: number;
  checkpointId: string | null;
}

export class SessionTracker {
  private sessions: Map<string, SessionProgress> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  createSession(parentSessionId: string | null): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const progress: SessionProgress = {
      sessionId,
      parentSessionId,
      status: 'running',
      progress: 0,
      currentTask: null,
      completedTasks: [],
      failedTasks: [],
      estimatedRemainingMs: 0,
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      checkpointId: null,
    };
    this.sessions.set(sessionId, progress);
    this.eventBus.publish(`session.${sessionId}.created`, progress);
    return sessionId;
  }

  updateProgress(sessionId: string, update: Partial<SessionProgress>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    Object.assign(session, update, { lastHeartbeat: Date.now() });
    this.eventBus.publish(`session.${sessionId}.progress`, session);
  }

  getSessionTree(sessionId: string): SessionProgress[] {
    const tree: SessionProgress[] = [];
    const root = this.sessions.get(sessionId);
    if (!root) return tree;

    tree.push(root);
    for (const [, session] of this.sessions) {
      if (session.parentSessionId === sessionId) {
        tree.push(session);
      }
    }
    return tree;
  }

  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = 'cancelled';
    this.eventBus.publish(`session.${sessionId}.cancelled`, { sessionId });

    for (const [, child] of this.sessions) {
      if (child.parentSessionId === sessionId && child.status === 'running') {
        child.status = 'cancelled';
        this.eventBus.publish(`session.${child.sessionId}.cancelled`, { sessionId: child.sessionId });
      }
    }
  }
}
```

---

## 9. Resource Management

### 9.1 Resource Budget System

```
interface AgentResourceBudget {
  agentType: string;
  agentId: string;
  cpuLimit: number;           // fraction of CPU core
  memoryLimitMB: number;
  tokenBudget: number;        // total tokens for lifetime
  llmCallBudget: number;      // max LLM calls
  timeBudget: number;         // max lifetime in ms
  priority: number;           // 1-5, 5=highest
}

interface ResourceUsage {
  agentId: string;
  cpuUsed: number;
  memoryUsed: number;
  tokensUsed: number;
  llmCallsUsed: number;
  timeUsed: number;
  llmCost: number;            // estimated USD
}

export class ResourceManager {
  private budgets: Map<string, AgentResourceBudget> = new Map();
  private usage: Map<string, ResourceUsage> = new Map();
  private totalCpu: number;
  private totalMemory: number;

  constructor(totalCpu: number, totalMemoryMB: number) {
    this.totalCpu = totalCpu;
    this.totalMemory = totalMemoryMB;
  }

  registerBudget(budget: AgentResourceBudget): void {
    this.budgets.set(budget.agentId, budget);
    this.usage.set(budget.agentId, {
      agentId: budget.agentId,
      cpuUsed: 0,
      memoryUsed: 0,
      tokensUsed: 0,
      llmCallsUsed: 0,
      timeUsed: 0,
      llmCost: 0,
    });
  }

  canAllocate(agentId: string, cpu: number, memoryMB: number): boolean {
    const totalCpuUsed = Array.from(this.usage.values()).reduce((s, u) => s + u.cpuUsed, 0);
    const totalMemUsed = Array.from(this.usage.values()).reduce((s, u) => s + u.memoryUsed, 0);

    return (totalCpuUsed + cpu <= this.totalCpu) && (totalMemUsed + memoryMB <= this.totalMemory);
  }

  consume(agentId: string, usage: Partial<ResourceUsage>): boolean {
    const current = this.usage.get(agentId);
    const budget = this.budgets.get(agentId);
    if (!current || !budget) return false;

    const newCpu = current.cpuUsed + (usage.cpuUsed ?? 0);
    const newMem = current.memoryUsed + (usage.memoryUsed ?? 0);
    const newTokens = current.tokensUsed + (usage.tokensUsed ?? 0);
    const newCalls = current.llmCallsUsed + (usage.llmCallsUsed ?? 0);
    const newTime = current.timeUsed + (usage.timeUsed ?? 0);

    if (newCpu > budget.cpuLimit) return false;
    if (newMem > budget.memoryLimitMB) return false;
    if (newTokens > budget.tokenBudget) return false;
    if (newCalls > budget.llmCallBudget) return false;
    if (newTime > budget.timeBudget) return false;

    Object.assign(current, {
      cpuUsed: newCpu,
      memoryUsed: newMem,
      tokensUsed: newTokens,
      llmCallsUsed: newCalls,
      timeUsed: newTime,
      llmCost: current.llmCost + (usage.llmCost ?? 0),
    });

    return true;
  }

  getPoolUtilization(): { cpuPercent: number; memoryPercent: number; tokenPercent: number } {
    const totalCpuUsed = Array.from(this.usage.values()).reduce((s, u) => s + u.cpuUsed, 0);
    const totalMemUsed = Array.from(this.usage.values()).reduce((s, u) => s + u.memoryUsed, 0);
    const totalTokens = Array.from(this.budgets.values()).reduce((s, b) => s + b.tokenBudget, 0);
    const totalTokensUsed = Array.from(this.usage.values()).reduce((s, u) => s + u.tokensUsed, 0);

    return {
      cpuPercent: (totalCpuUsed / this.totalCpu) * 100,
      memoryPercent: (totalMemUsed / this.totalMemory) * 100,
      tokenPercent: totalTokens > 0 ? (totalTokensUsed / totalTokens) * 100 : 0,
    };
  }
}
```

### 9.2 Queue with Priorities

```
export interface QueuedTask {
  id: string;
  agentType: string;
  priority: number;
  resourceBudget: AgentResourceBudget;
  enqueuedAt: number;
  timeout: number;
  payload: unknown;
}

export class PriorityTaskQueue {
  private queues: Map<number, QueuedTask[]> = new Map();
  private processing = new Set<string>();

  constructor(private resourceManager: ResourceManager) {
    for (let i = 1; i <= 5; i++) {
      this.queues.set(i, []);
    }
  }

  enqueue(task: QueuedTask): void {
    const queue = this.queues.get(task.priority) ?? [];
    queue.push(task);
    this.queues.set(task.priority, queue);
  }

  dequeue(): QueuedTask | null {
    for (let priority = 5; priority >= 1; priority--) {
      const queue = this.queues.get(priority) ?? [];
      const task = queue.shift();
      if (task) {
        this.queues.set(priority, queue);
        if (this.resourceManager.canAllocate(task.agentType, task.resourceBudget.cpuLimit, task.resourceBudget.memoryLimitMB)) {
          this.processing.add(task.id);
          return task;
        } else {
          queue.push(task);
          this.queues.set(priority, queue);
        }
      }
    }
    return null;
  }

  complete(taskId: string): void {
    this.processing.delete(taskId);
  }

  getStatus(): { queued: number; processing: number; byPriority: Record<number, number> } {
    const byPriority: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      byPriority[i] = (this.queues.get(i) ?? []).length;
    }
    return {
      queued: Object.values(byPriority).reduce((s, c) => s + c, 0),
      processing: this.processing.size,
      byPriority,
    };
  }
}
```

### 9.3 LLM Rate Limiting

```
export class RateLimiter {
  private limits: Map<string, { maxRPM: number; maxTPM: number; windowMs: number; lastMinute: number[]; tokensThisMinute: number }> = new Map();
  private defaultMaxRPM: number;
  private defaultMaxTPM: number;

  constructor(maxRPM = 60, maxTPM = 100000) {
    this.defaultMaxRPM = maxRPM;
    this.defaultMaxTPM = maxTPM;
  }

  registerProvider(providerName: string, maxRPM?: number, maxTPM?: number): void {
    this.limits.set(providerName, {
      maxRPM: maxRPM ?? this.defaultMaxRPM,
      maxTPM: maxTPM ?? this.defaultMaxTPM,
      windowMs: 60000,
      lastMinute: [],
      tokensThisMinute: 0,
    });
  }

  async acquire(providerName: string, estimatedTokens: number): Promise<boolean> {
    const limit = this.limits.get(providerName);
    if (!limit) return true;

    const now = Date.now();
    const cutoff = now - limit.windowMs;
    limit.lastMinute = limit.lastMinute.filter(t => t > cutoff);

    if (limit.lastMinute.length >= limit.maxRPM) {
      const oldest = limit.lastMinute[0];
      const waitTime = oldest + limit.windowMs - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (limit.tokensThisMinute + estimatedTokens > limit.maxTPM) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    limit.lastMinute.push(Date.now());
    limit.tokensThisMinute += estimatedTokens;
    return true;
  }

  release(providerName: string, tokens: number): void {
    const limit = this.limits.get(providerName);
    if (limit) {
      limit.tokensThisMinute = Math.max(0, limit.tokensThisMinute - tokens);
    }
  }
}
```

---

## 10. State Management

### 10.1 Shared State via NATS KV Store

```
import { KVStore } from '@ideia/event-bus';

export interface AgentState {
  agentId: string;
  sessionId: string;
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask: string | null;
  artifacts: string[];
  fileLocks: string[];      // files currently being modified
  lastHeartbeat: number;
}

export class SharedStateManager {
  private kv: KVStore;
  private agentStates = new Map<string, AgentState>();
  private fileLocks = new Map<string, string>();   // filePath -> agentId

  constructor(kv: KVStore) {
    this.kv = kv;
  }

  async updateAgentState(agentId: string, update: Partial<AgentState>): Promise<void> {
    const current = this.agentStates.get(agentId) ?? {
      agentId, sessionId: '', role: '', status: 'idle',
      currentTask: null, artifacts: [], fileLocks: [], lastHeartbeat: Date.now(),
    };
    Object.assign(current, update, { lastHeartbeat: Date.now() });
    this.agentStates.set(agentId, current);
    await this.kv.set(`agent:${agentId}`, current);
  }

  async acquireFileLock(filePath: string, agentId: string): Promise<boolean> {
    const existing = this.fileLocks.get(filePath);
    if (existing && existing !== agentId) {
      return false;
    }
    this.fileLocks.set(filePath, agentId);
    await this.kv.set(`lock:${filePath}`, { agentId, acquiredAt: Date.now() });
    return true;
  }

  async releaseFileLock(filePath: string, agentId: string): Promise<void> {
    const lock = this.fileLocks.get(filePath);
    if (lock === agentId) {
      this.fileLocks.delete(filePath);
      await this.kv.delete(`lock:${filePath}`);
    }
  }

  async getFileLock(filePath: string): Promise<{ agentId: string; acquiredAt: number } | null> {
    return this.kv.get(`lock:${filePath}`) as Promise<{ agentId: string; acquiredAt: number } | null>;
  }

  async getAgentState(agentId: string): Promise<AgentState | null> {
    return this.agentStates.get(agentId) ?? (await this.kv.get(`agent:${agentId}`)) as AgentState | null;
  }

  async completeSession(sessionId: string): Promise<void> {
    const agents = Array.from(this.agentStates.values())
      .filter(a => a.sessionId === sessionId);

    for (const agent of agents) {
      agent.status = 'completed';
      await this.kv.set(`agent:${agent.agentId}`, agent);
    }
  }
}
```

### 10.2 Conflict Detection

```
export interface FileConflict {
  filePath: string;
  agentIds: string[];
  changes: Array<{ agentId: string; original: string; modified: string; timestamp: number }>;
  type: 'overlapping_lines' | 'adjacent_lines' | 'cross_file';
  severity: 'low' | 'medium' | 'high';
}

export class ConflictDetector {
  detectConflicts(
    changes: Map<string, Map<string, { original: string; modified: string; timestamp: number }>>
  ): FileConflict[] {
    const conflicts: FileConflict[] = [];

    for (const [filePath, agentChanges] of changes) {
      if (agentChanges.size <= 1) continue;

      const fileConflicts = this.detectFileConflicts(filePath, agentChanges);
      conflicts.push(...fileConflicts);
    }

    return conflicts;
  }

  private detectFileConflicts(
    filePath: string,
    agentChanges: Map<string, { original: string; modified: string; timestamp: number }>
  ): FileConflict[] {
    const conflicts: FileConflict[] = [];
    const agentIds = Array.from(agentChanges.keys());
    const changes = Array.from(agentChanges.entries()).map(([agentId, change]) => ({
      agentId,
      ...change,
    }));

    changes.sort((a, b) => a.timestamp - b.timestamp);

    const originalLines = new Map<string, number>();
    for (const change of changes) {
      const lines = change.original.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const key = `${change.agentId}:${i}`;
        originalLines.set(key, i);
      }
    }

    conflicts.push({
      filePath,
      agentIds,
      changes,
      type: 'overlapping_lines',
      severity: agentChanges.size > 2 ? 'high' : 'medium',
    });

    return conflicts;
  }
}
```

### 10.3 Checkpoint / Restore

```
export interface Checkpoint {
  checkpointId: string;
  sessionId: string;
  agentStates: AgentState[];
  taskProgress: Map<string, 'pending' | 'completed' | 'failed'>;
  fileSnapshots: Map<string, string>;  // filePath -> content hash
  artifacts: Array<{ id: string; type: string; content: string }>;
  createdAt: number;
}

export class CheckpointManager {
  private kv: KVStore;
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(kv: KVStore) {
    this.kv = kv;
  }

  async saveCheckpoint(
    sessionId: string,
    data: Omit<Checkpoint, 'checkpointId' | 'sessionId' | 'createdAt'>
  ): Promise<string> {
    const checkpointId = `ckpt-${sessionId}-${Date.now()}`;
    const checkpoint: Checkpoint = {
      checkpointId,
      sessionId,
      ...data,
      createdAt: Date.now(),
    };

    this.checkpoints.set(checkpointId, checkpoint);
    await this.kv.set(`checkpoint:${checkpointId}`, checkpoint);
    return checkpointId;
  }

  async restoreCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const cached = this.checkpoints.get(checkpointId);
    if (cached) return cached;

    return this.kv.get(`checkpoint:${checkpointId}`) as Promise<Checkpoint | null>;
  }

  async listSessionCheckpoints(sessionId: string): Promise<string[]> {
    const allKeys = await this.kv.list(`checkpoint:`);
    return allKeys.filter(k => k.includes(sessionId));
  }

  async pruneCheckpoints(sessionId: string, keepLast: number = 3): Promise<void> {
    const allCheckpoints = Array.from(this.checkpoints.values())
      .filter(c => c.sessionId === sessionId)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (allCheckpoints.length <= keepLast) return;

    const toDelete = allCheckpoints.slice(keepLast);
    for (const ckpt of toDelete) {
      this.checkpoints.delete(ckpt.checkpointId);
      await this.kv.delete(`checkpoint:${ckpt.checkpointId}`);
    }
  }
}
```

---

## 11. Communication Protocol

### 11.1 Agent-to-Agent Messaging via NATS Pub/Sub

```
Protocol Topics:

  agent.<agentId>.message       -- Direct message to a specific agent
  agent.<agentId>.heartbeat     -- Heartbeat from specific agent
  agent.<agentId>.state         -- State updates from specific agent
  agent.type.<agentType>.task   -- Task assignment to agent type
  agent.type.<agentType>.result -- Results from agent type

  sidekick.<sidekickId>.execute  -- Sidekick execution request
  sidekick.<sidekickId>.result   -- Sidekick execution result
  sidekick.<sidekickId>.available-- Sidekick availability notification

  session.<sessionId>.progress   -- Session progress updates
  session.<sessionId>.checkpoint -- Session checkpoint events
  session.<sessionId>.cancel     -- Session cancellation request

  lock.<filePath>                -- File lock operations
  artifact.<artifactId>          -- Artifact distribution
  conflict.<conflictId>          -- Conflict notifications

  orchestrator.task              -- New task available
  orchestrator.heartbeat         -- Orchestrator health
```

### 11.2 Message Envelope

```
interface AgentMessageEnvelope {
  id: string;                    // unique message ID
  type: 'request' | 'response' | 'event' | 'heartbeat' | 'error';
  source: string;                // agent ID
  target: string;                // agent ID or '*'
  subject: string;               // NATS subject
  payload: unknown;
  correlationId: string;         // for request/reply pairing
  timestamp: number;
  ttl: number;                   // time to live (ms)
  priority: number;              // 1-5
  traceId: string;               // for distributed tracing
  spans: Array<{ spanId: string; parentSpanId: string | null; operation: string; startTime: number; endTime: number | null }>;
}
```

### 11.3 Agent-to-Orchestrator via Request/Reply

```
interface OrchestratorRequest {
  requestId: string;
  agentId: string;
  action: 'register' | 'deregister' | 'task_assignment' | 'status_report' | 'resource_request' | 'conflict_report';
  payload: unknown;
  timestamp: number;
}

interface OrchestratorResponse {
  requestId: string;
  success: boolean;
  payload: unknown;
  error?: string;
  timestamp: number;
}
```

### 11.4 Shared Blackboard

```
export class Blackboard {
  private kv: KVStore;
  private entries = new Map<string, { value: unknown; owner: string; timestamp: number; ttl: number }>();

  constructor(kv: KVStore) {
    this.kv = kv;
  }

  async write(key: string, value: unknown, owner: string, ttl: number = 300000): Promise<void> {
    this.entries.set(key, { value, owner, timestamp: Date.now(), ttl });
    await this.kv.set(`blackboard:${key}`, { value, owner, timestamp: Date.now(), ttl });
  }

  async read(key: string): Promise<{ value: unknown; owner: string; timestamp: number } | null> {
    const entry = this.entries.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return { value: entry.value, owner: entry.owner, timestamp: entry.timestamp };
    }
    if (entry) this.entries.delete(key);

    const stored = await this.kv.get(`blackboard:${key}`);
    return stored as { value: unknown; owner: string; timestamp: number } | null;
  }

  async search(pattern: string): Promise<Array<{ key: string; value: unknown; owner: string; timestamp: number }>> {
    const results: Array<{ key: string; value: unknown; owner: string; timestamp: number }> = [];
    for (const [key, entry] of this.entries) {
      if (key.includes(pattern) && Date.now() - entry.timestamp < entry.ttl) {
        results.push({ key, value: entry.value, owner: entry.owner, timestamp: entry.timestamp });
      }
    }

    const storedKeys = await this.kv.list(`blackboard:`);
    for (const storedKey of storedKeys) {
      if (storedKey.includes(pattern) && !this.entries.has(storedKey.replace('blackboard:', ''))) {
        const stored = await this.kv.get(storedKey);
        if (stored) {
          const data = stored as { value: unknown; owner: string; timestamp: number; ttl: number };
          if (Date.now() - data.timestamp < data.ttl) {
            results.push({ key: storedKey.replace('blackboard:', ''), value: data.value, owner: data.owner, timestamp: data.timestamp });
          }
        }
      }
    }

    return results;
  }
}
```

### 11.5 Event-Driven Agent Wakeup

```
export class AgentWakeupSystem {
  private eventBus: EventBus;
  private subscriptions: Map<string, Set<string>> = new Map();  // event pattern -> agent IDs

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  registerWakeupPattern(agentId: string, eventPattern: string): void {
    const existing = this.subscriptions.get(eventPattern) ?? new Set();
    existing.add(agentId);
    this.subscriptions.set(eventPattern, existing);

    this.eventBus.subscribe(eventPattern, (data: unknown) => {
      this.wakeAgent(agentId, { event: eventPattern, data });
    });
  }

  private async wakeAgent(agentId: string, wakeEvent: { event: string; data: unknown }): Promise<void> {
    await this.eventBus.publish(`agent.${agentId}.wake`, wakeEvent);
  }

  unregisterWakeupPattern(agentId: string, eventPattern: string): void {
    const existing = this.subscriptions.get(eventPattern);
    if (existing) {
      existing.delete(agentId);
      if (existing.size === 0) this.subscriptions.delete(eventPattern);
    }
  }
}
```

---

## 12. Fault Tolerance

### 12.1 Agent Health Monitoring

```
export interface HealthStatus {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'dead';
  lastHeartbeat: number;
  heartbeatCount: number;
  taskSuccessRate: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  errorsLast5Min: number;
}

export class HealthMonitor {
  private agents: Map<string, {
    config: SidekickDefinition | DroidImage;
    lastHeartbeat: number;
    heartbeatCount: number;
    successCount: number;
    failCount: number;
    errors: Array<{ time: number; error: string }>;
    status: HealthStatus['status'];
  }> = new Map();

  private heartbeatTimeout: number;
  private maxErrorsPerWindow: number;
  private errorWindowMs: number;

  constructor(heartbeatTimeoutMs = 30000, maxErrorsPerWindow = 5, errorWindowMs = 300000) {
    this.heartbeatTimeout = heartbeatTimeoutMs;
    this.maxErrorsPerWindow = maxErrorsPerWindow;
    this.errorWindowMs = errorWindowMs;
  }

  registerAgent(agentId: string, config: SidekickDefinition | DroidImage): void {
    this.agents.set(agentId, {
      config,
      lastHeartbeat: Date.now(),
      heartbeatCount: 0,
      successCount: 0,
      failCount: 0,
      errors: [],
      status: 'healthy',
    });
  }

  recordHeartbeat(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.heartbeatCount++;
    }
  }

  recordTaskResult(agentId: string, success: boolean, error?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (success) {
      agent.successCount++;
    } else {
      agent.failCount++;
      if (error) {
        agent.errors.push({ time: Date.now(), error });
        this.pruneErrors(agent);
      }
    }

    this.updateStatus(agent);
  }

  private pruneErrors(agent: typeof this.agents extends Map<string, infer V> ? V : never): void {
    const cutoff = Date.now() - this.errorWindowMs;
    agent.errors = agent.errors.filter(e => e.time > cutoff);
  }

  private updateStatus(agent: typeof this.agents extends Map<string, infer V> ? V : never): void {
    const sinceHeartbeat = Date.now() - agent.lastHeartbeat;

    if (sinceHeartbeat > this.heartbeatTimeout * 3) {
      agent.status = 'dead';
    } else if (sinceHeartbeat > this.heartbeatTimeout * 2) {
      agent.status = 'unhealthy';
    } else if (agent.errors.length > this.maxErrorsPerWindow) {
      agent.status = 'degraded';
    } else {
      agent.status = 'healthy';
    }
  }

  getUnhealthyAgents(): string[] {
    const unhealthy: string[] = [];
    for (const [id, agent] of this.agents) {
      this.updateStatus(agent);
      if (agent.status === 'unhealthy' || agent.status === 'dead') {
        unhealthy.push(id);
      }
    }
    return unhealthy;
  }

  getHealthReport(): HealthStatus[] {
    const report: HealthStatus[] = [];
    for (const [agentId, agent] of this.agents) {
      this.updateStatus(agent);
      const totalTasks = agent.successCount + agent.failCount;
      report.push({
        agentId,
        status: agent.status,
        lastHeartbeat: agent.lastHeartbeat,
        heartbeatCount: agent.heartbeatCount,
        taskSuccessRate: totalTasks > 0 ? agent.successCount / totalTasks : 1,
        memoryUsagePercent: 0,
        cpuUsagePercent: 0,
        errorsLast5Min: agent.errors.length,
      });
    }
    return report;
  }
}
```

### 12.2 Orphan Agent Detection and Cleanup

```
export class OrphanDetector {
  private sessions: Map<string, { agentIds: string[]; timeout: number }> = new Map();
  private healthMonitor: HealthMonitor;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(healthMonitor: HealthMonitor, cleanupIntervalMs = 60000) {
    this.healthMonitor = healthMonitor;
  }

  start(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  registerSession(sessionId: string, agentIds: string[], timeout: number = 300000): void {
    this.sessions.set(sessionId, { agentIds, timeout });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      const unhealthy = session.agentIds.filter(id => {
        const report = this.healthMonitor.getHealthReport().find(r => r.agentId === id);
        return report && (report.status === 'dead' || (now - report.lastHeartbeat > session.timeout));
      });

      if (unhealthy.length > 0) {
        for (const agentId of unhealthy) {
          this.killAgent(agentId);
        }
      }

      if (unhealthy.length === session.agentIds.length) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private async killAgent(agentId: string): Promise<void> {
    // Cleanup sidekick/droid resources
    // The actual cleanup (KILL signal, container stop) happens in SidekickPool/DroidContainerManager
  }
}
```

### 12.3 Timeout + Retry per Agent

```
interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: RegExp[];
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    /timeout/i,
    /rate.limit/i,
    /too.many.requests/i,
    /internal.server.error/i,
    /service.unavailable/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
  ],
};

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === policy.maxRetries) break;

      const isRetryable = policy.retryableErrors.some(pattern => pattern.test(lastError!.message));
      if (!isRetryable) throw lastError;

      const delay = Math.min(
        policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1),
        policy.maxDelayMs
      );

      onRetry?.(attempt, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

---

## 13. Code Examples

### 13.1 Complete SidekickPool with NATS Task Distribution

```
import { EventBus, KVStore } from '@ideia/event-bus';
import { SidekickDefinition, TaskAssignment, TaskResult } from './types';

export interface NATSSidekickPoolConfig {
  eventBus: EventBus;
  kv: KVStore;
  maxPoolSize: number;
  poolId: string;
}

export class NATSSidekickPool {
  private eventBus: EventBus;
  private kv: KVStore;
  private maxPoolSize: number;
  private poolId: string;
  private activeSidekicks: Map<string, {
    def: SidekickDefinition;
    instanceId: string;
    busy: boolean;
    currentTaskId: string | null;
    startedAt: number;
  }> = new Map();
  private taskSubscriptions: Map<string, () => void> = new Map();

  constructor(config: NATSSidekickPoolConfig) {
    this.eventBus = config.eventBus;
    this.kv = config.kv;
    this.maxPoolSize = config.maxPoolSize;
    this.poolId = config.poolId;
  }

  async start(): Promise<void> {
    await this.eventBus.subscribe(
      `pool.${this.poolId}.task`,
      async (assignment: TaskAssignment) => {
        await this.handleTask(assignment);
      }
    );

    await this.eventBus.subscribe(
      `pool.${this.poolId}.shutdown`,
      async () => {
        await this.shutdown();
      }
    );

    await this.kv.set(`pool.${this.poolId}.status`, {
      status: 'running',
      startedAt: Date.now(),
      activeSidekicks: 0,
    });
  }

  registerSidekick(def: SidekickDefinition): void {
    for (let i = 0; i < (def.maxConcurrency ?? 1); i++) {
      const instanceId = `sk-${def.id}-${i}-${this.poolId}`;
      this.activeSidekicks.set(instanceId, {
        def,
        instanceId,
        busy: false,
        currentTaskId: null,
        startedAt: Date.now(),
      });
    }
  }

  private async handleTask(assignment: TaskAssignment): Promise<void> {
    const sidekick = this.findAvailable(assignment.requiredTools);
    if (!sidekick) {
      await this.eventBus.publish(
        `task.${assignment.taskId}.failed`,
        { taskId: assignment.taskId, error: 'No available sidekick for required tools' }
      );
      return;
    }

    sidekick.busy = true;
    sidekick.currentTaskId = assignment.taskId;

    try {
      const result = await this.executeSidekickTask(sidekick, assignment);

      await this.eventBus.publish(
        `task.${assignment.taskId}.completed`,
        { taskId: assignment.taskId, result }
      );

      await this.kv.set(`task:${assignment.taskId}`, {
        status: 'completed',
        result,
        completedAt: Date.now(),
        sidekickId: sidekick.instanceId,
      });
    } catch (error) {
      await this.eventBus.publish(
        `task.${assignment.taskId}.failed`,
        { taskId: assignment.taskId, error: String(error) }
      );

      await this.kv.set(`task:${assignment.taskId}`, {
        status: 'failed',
        error: String(error),
        failedAt: Date.now(),
        sidekickId: sidekick.instanceId,
      });
    } finally {
      sidekick.busy = false;
      sidekick.currentTaskId = null;
    }
  }

  private findAvailable(requiredTools: string[]): typeof this.activeSidekicks extends Map<string, infer V> ? V : null {
    for (const [, sidekick] of this.activeSidekicks) {
      if (!sidekick.busy && requiredTools.every(t => sidekick.def.tools.includes(t as never))) {
        return sidekick;
      }
    }
    return null;
  }

  private async executeSidekickTask(
    sidekick: typeof this.activeSidekicks extends Map<string, infer V> ? V : never,
    assignment: TaskAssignment
  ): Promise<unknown> {
    const timeout = assignment.timeout ?? 30000;

    const result = await this.eventBus.request(
      `sidekick.${sidekick.instanceId}.execute`,
      { taskId: assignment.taskId, payload: assignment.payload, tools: sidekick.def.tools },
      { timeout }
    );

    return result;
  }

  getPoolStatus(): { total: number; busy: number; available: number } {
    const entries = Array.from(this.activeSidekicks.values());
    return {
      total: entries.length,
      busy: entries.filter(e => e.busy).length,
      available: entries.filter(e => !e.busy).length,
    };
  }

  async shutdown(): Promise<void> {
    for (const [, unsub] of this.taskSubscriptions) {
      unsub();
    }
    this.activeSidekicks.clear();
    await this.kv.set(`pool.${this.poolId}.status`, {
      status: 'stopped',
      stoppedAt: Date.now(),
    });
  }
}
```

### 13.2 TaskDecomposer with Dependency Graph

```
import { AdaptiveDecomposer } from '@ideia/planning-engine';
import { EventBus, KVStore } from '@ideia/event-bus';

interface DecomposedTask {
  id: string;
  parentId: string | null;
  description: string;
  agentRole: string;
  estimatedCost: number;
  dependencies: string[];
  parallelGroup: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class ParallelTaskDecomposer {
  private decomposer: AdaptiveDecomposer;
  private eventBus: EventBus;
  private kv: KVStore;

  constructor(eventBus: EventBus, kv: KVStore) {
    this.decomposer = new AdaptiveDecomposer();
    this.eventBus = eventBus;
    this.kv = kv;
  }

  async decomposeAndExecute(
    taskId: string,
    description: string,
    maxParallel: number = 4
  ): Promise<DecomposedTask[]> {
    const plan = this.decomposer.decompose(description, 'hybrid');

    const tasks: DecomposedTask[] = plan.steps.map((step, i) => ({
      id: `${taskId}-sub-${i}`,
      parentId: taskId,
      description: step.title,
      agentRole: step.agentRole,
      estimatedCost: step.cost.estimatedSeconds,
      dependencies: step.dependencies.map(d => `${taskId}-sub-${d.stepId.match(/\d+/)?.[0] ?? i}`),
      parallelGroup: null,
      status: 'pending' as const,
    }));

    const groups = this.groupParallelTasks(tasks);

    for (const [groupId, groupTasks] of groups) {
      for (const task of groupTasks) {
        task.parallelGroup = groupId;
      }
    }

    await this.kv.set(`task:${taskId}:decomposition`, tasks);

    return tasks;
  }

  private groupParallelTasks(tasks: DecomposedTask[]): Map<string, DecomposedTask[]> {
    const groups = new Map<string, DecomposedTask[]>();
    let groupId = 0;

    for (const task of tasks) {
      const deps = tasks.filter(t => task.dependencies.includes(t.id));
      const depLevels = new Set(deps.map(d => d.id));

      const isParallel = deps.length === 0 || deps.every(d => d.status !== 'running');

      if (isParallel) {
        const gid = `group-${groupId}`;
        const existing = groups.get(gid) ?? [];
        existing.push(task);
        groups.set(gid, existing);
      } else {
        groupId++;
        groups.set(`group-${++groupId}`, [task]);
      }
    }

    return groups;
  }

  async getExecutionPlan(taskId: string): Promise<{
    layers: DecomposedTask[][];
    totalEstimatedTime: number;
  }> {
    const tasks = await this.kv.get(`task:${taskId}:decomposition`) as DecomposedTask[] | null;
    if (!tasks) return { layers: [], totalEstimatedTime: 0 };

    const layers: DecomposedTask[][] = [];
    const remaining = new Set(tasks);
    const completed = new Set<string>();

    while (remaining.size > 0) {
      const layer = Array.from(remaining).filter(t =>
        t.dependencies.every(d => completed.has(d))
      );

      if (layer.length === 0) break;
      layers.push(layer);

      for (const t of layer) {
        completed.add(t.id);
        remaining.delete(t);
      }
    }

    const totalEstimatedTime = layers.reduce(
      (max, layer) => max + Math.max(...layer.map(t => t.estimatedCost)),
      0
    );

    return { layers, totalEstimatedTime };
  }
}
```

### 13.3 MapReduceExecutor

```
import { EventBus, KVStore } from '@ideia/event-bus';

export interface MapReduceConfig {
  taskId: string;
  data: unknown[];
  shardBy: 'count' | 'size' | 'semantic';
  shardCount: number;
  mapFn: (shard: unknown, shardIndex: number) => Promise<unknown>;
  reduceFn: (intermediateResults: unknown[]) => Promise<unknown>;
  combineInMap: boolean;
  maxParallelMap: number;
  maxParallelReduce: number;
}

export class MapReduceExecutor {
  private eventBus: EventBus;
  private kv: KVStore;

  constructor(eventBus: EventBus, kv: KVStore) {
    this.eventBus = eventBus;
    this.kv = kv;
  }

  async execute(config: MapReduceConfig): Promise<{
    finalResult: unknown;
    metrics: { mapTime: number; reduceTime: number; totalTime: number; shardsProcessed: number };
  }> {
    const startTime = Date.now();

    const shards = this.splitIntoShards(config.data, config.shardCount, config.shardBy);
    await this.kv.set(`mapreduce:${config.taskId}:shards`, { count: shards.length, sizes: shards.map(s => s.length) });

    const mapStartTime = Date.now();
    const mapResults = await this.executeMapPhase(shards, config);
    const mapTime = Date.now() - mapStartTime;

    const reduceStartTime = Date.now();
    const finalResult = await this.executeReducePhase(mapResults, config);
    const reduceTime = Date.now() - reduceStartTime;

    const metrics = {
      mapTime,
      reduceTime,
      totalTime: Date.now() - startTime,
      shardsProcessed: mapResults.length,
    };

    await this.kv.set(`mapreduce:${config.taskId}:metrics`, metrics);

    return { finalResult, metrics };
  }

  private splitIntoShards(data: unknown[], shardCount: number, strategy: MapReduceConfig['shardBy']): unknown[][] {
    if (strategy === 'semantic') {
      return this.semanticSplit(data, shardCount);
    }

    const shards: unknown[][] = [];
    const shardSize = Math.ceil(data.length / shardCount);

    for (let i = 0; i < data.length; i += shardSize) {
      shards.push(data.slice(i, i + shardSize));
    }

    return shards;
  }

  private semanticSplit(data: unknown[], shardCount: number): unknown[][] {
    const shards: unknown[][] = [];
    const itemsPerShard = Math.ceil(data.length / shardCount);

    for (let i = 0; i < data.length; i += itemsPerShard) {
      shards.push(data.slice(i, i + itemsPerShard));
    }

    return shards;
  }

  private async executeMapPhase(
    shards: unknown[][],
    config: MapReduceConfig
  ): Promise<unknown[]> {
    const results: unknown[] = [];
    const running: Promise<void>[] = [];

    const semaphore = async (index: number): Promise<void> => {
      if (config.combineInMap) {
        const shardResults = await Promise.all(
          shards[index].map(async (item, i) => config.mapFn(item, index * shards[index].length + i))
        );
        results.push(shardResults);
      } else {
        const result = await config.mapFn(shards[index], index);
        results.push(result);
      }
    };

    for (let i = 0; i < shards.length; i++) {
      const task = semaphore(i);
      running.push(task);

      if (running.length >= config.maxParallelMap) {
        await Promise.race(running);
        const completedIndex = running.findIndex(async t => {
          try { await t; return true; }
          catch { return false; }
        });
        if (completedIndex >= 0) running.splice(completedIndex, 1);
      }
    }

    await Promise.allSettled(running);
    return results;
  }

  private async executeReducePhase(
    mapResults: unknown[],
    config: MapReduceConfig
  ): Promise<unknown> {
    if (config.maxParallelReduce <= 1) {
      return config.reduceFn(mapResults);
    }

    const reduceGroups: unknown[][] = [];
    const groupSize = Math.ceil(mapResults.length / config.maxParallelReduce);

    for (let i = 0; i < mapResults.length; i += groupSize) {
      reduceGroups.push(mapResults.slice(i, i + groupSize));
    }

    const intermediateReductions = await Promise.all(
      reduceGroups.map(group => {
        if (group.length === 1) return Promise.resolve(group[0]);
        return config.reduceFn(group);
      })
    );

    return config.reduceFn(intermediateReductions);
  }

  private async publishProgress(taskId: string, phase: string, progress: number): Promise<void> {
    await this.eventBus.publish(`mapreduce.${taskId}.progress`, { phase, progress });
  }
}
```

### 13.4 DroidContainer Manager

```
export interface DroidExecutionRequest {
  taskId: string;
  droidType: 'compute' | 'routing' | 'testing';
  payload: unknown;
  timeout: number;
  resourceLimits: DroidResourceLimits;
}

export interface DroidResourceLimits {
  cpu: number;
  memoryMB: number;
  diskMB: number;
}

export class DroidExecutionManager {
  private containerManager: DroidContainerManager;
  private resourceManager: ResourceManager;
  private eventBus: EventBus;

  constructor(containerManager: DroidContainerManager, resourceManager: ResourceManager, eventBus: EventBus) {
    this.containerManager = containerManager;
    this.resourceManager = resourceManager;
    this.eventBus = eventBus;
  }

  async executeOnDroid(request: DroidExecutionRequest): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const available = await this.resourceManager.canAllocate(request.droidType, request.resourceLimits.cpu, request.resourceLimits.memoryMB);
    if (!available) {
      return { success: false, error: 'Insufficient resources for droid execution' };
    }

    const result = await this.containerManager.executeOnDroid(
      request.droidType,
      { taskId: request.taskId, payload: request.payload, timeout: request.timeout }
    );

    if (result.success) {
      await this.eventBus.publish(`droid.${request.droidType}.completed`, {
        taskId: request.taskId,
        droidType: request.droidType,
        timestamp: Date.now(),
      });
    } else {
      await this.eventBus.publish(`droid.${request.droidType}.failed`, {
        taskId: request.taskId,
        droidType: request.droidType,
        error: result.error,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  async executeBatch(requests: DroidExecutionRequest[]): Promise<Array<{ success: boolean; result?: unknown; error?: string }>> {
    const results: Array<{ success: boolean; result?: unknown; error?: string }> = [];

    for (const request of requests) {
      const result = await this.executeOnDroid(request);
      results.push(result);
    }

    return results;
  }
}
```

### 13.5 ResourceBudget System with Metrics

```
export class ResourceBudgetTracker {
  private usageHistory: Map<string, Array<{
    timestamp: number;
    cpuPercent: number;
    memoryMB: number;
    tokensUsed: number;
    activeAgents: number;
  }>> = new Map();

  constructor(private resourceManager: ResourceManager) {}

  recordSnapshot(agentType: string): void {
    const utilization = this.resourceManager.getPoolUtilization();
    const history = this.usageHistory.get(agentType) ?? [];
    history.push({
      timestamp: Date.now(),
      cpuPercent: utilization.cpuPercent,
      memoryMB: utilization.memoryPercent,
      tokensUsed: utilization.tokenPercent,
      activeAgents: this.countActiveAgents(agentType),
    });

    if (history.length > 1000) history.shift();
    this.usageHistory.set(agentType, history);
  }

  private countActiveAgents(agentType: string): number {
    return 0;
  }

  getAverageUtilization(agentType: string, windowMs: number = 300000): { cpuPercent: number; memoryMB: number; tokensUsed: number } {
    const history = this.usageHistory.get(agentType) ?? [];
    const cutoff = Date.now() - windowMs;
    const relevant = history.filter(h => h.timestamp > cutoff);

    if (relevant.length === 0) return { cpuPercent: 0, memoryMB: 0, tokensUsed: 0 };

    return {
      cpuPercent: relevant.reduce((s, h) => s + h.cpuPercent, 0) / relevant.length,
      memoryMB: relevant.reduce((s, h) => s + h.memoryMB, 0) / relevant.length,
      tokensUsed: relevant.reduce((s, h) => s + h.tokensUsed, 0) / relevant.length,
    };
  }

  getResourceReport(): {
    current: { cpuPercent: number; memoryPercent: number; tokenPercent: number };
    avg5m: { cpuPercent: number; memoryPercent: number; tokenPercent: number };
    peak5m: { cpuPercent: number; memoryMB: number; tokensUsed: number };
  } {
    const current = this.resourceManager.getPoolUtilization();
    const avg5m = this.getAverageUtilization('*');
    const history5m = Array.from(this.usageHistory.values()).flat().filter(h => h.timestamp > Date.now() - 300000);

    const peak = history5m.reduce((peak, h) => ({
      cpuPercent: Math.max(peak.cpuPercent, h.cpuPercent),
      memoryMB: Math.max(peak.memoryMB, h.memoryMB),
      tokensUsed: Math.max(peak.tokensUsed, h.tokensUsed),
    }), { cpuPercent: 0, memoryMB: 0, tokensUsed: 0 });

    return {
      current,
      avg5m,
      peak5m: peak,
    };
  }
}
```

### 13.6 Parallel Agent Metrics

```
export interface AgentExecutionMetrics {
  agentId: string;
  role: string;
  taskId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime: number | null;
  durationMs: number;
  llmCalls: number;
  tokensUsed: number;
  toolsUsed: string[];
  resultsProduced: number;
  errors: string[];
  parentAgentId: string | null;
  childrenAgentIds: string[];
}

export class MetricsCollector {
  private metrics: Map<string, AgentExecutionMetrics> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  startAgent(agentId: string, role: string, taskId: string, sessionId: string, parentAgentId: string | null): void {
    const metric: AgentExecutionMetrics = {
      agentId, role, taskId, sessionId, status: 'running',
      startTime: Date.now(), endTime: null, durationMs: 0,
      llmCalls: 0, tokensUsed: 0, toolsUsed: [], resultsProduced: 0,
      errors: [], parentAgentId, childrenAgentIds: [],
    };
    this.metrics.set(agentId, metric);
  }

  recordLLMCall(agentId: string, tokens: number): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.llmCalls++;
      metric.tokensUsed += tokens;
    }
  }

  recordToolUse(agentId: string, tool: string): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.toolsUsed.push(tool);
    }
  }

  completeAgent(agentId: string, status: 'completed' | 'failed', error?: string): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.status = status;
      metric.endTime = Date.now();
      metric.durationMs = metric.endTime - metric.startTime;
      if (error) metric.errors.push(error);
    }
  }

  addChildAgent(parentId: string, childId: string): void {
    const metric = this.metrics.get(parentId);
    if (metric) metric.childrenAgentIds.push(childId);
  }

  getSessionMetrics(sessionId: string): {
    totalAgents: number;
    completed: number;
    failed: number;
    totalTokens: number;
    totalLLMCalls: number;
    totalDurationMs: number;
    agents: AgentExecutionMetrics[];
  } {
    const agents = Array.from(this.metrics.values()).filter(m => m.sessionId === sessionId);
    return {
      totalAgents: agents.length,
      completed: agents.filter(a => a.status === 'completed').length,
      failed: agents.filter(a => a.status === 'failed').length,
      totalTokens: agents.reduce((s, a) => s + a.tokensUsed, 0),
      totalLLMCalls: agents.reduce((s, a) => s + a.llmCalls, 0),
      totalDurationMs: agents.reduce((s, a) => s + a.durationMs, 0),
      agents,
    };
  }

  getParallelEfficiency(sessionId: string): {
    sequentialTime: number;
    parallelTime: number;
    speedup: number;
    efficiency: number;  // speedup / numAgents
  } {
    const sessionMetrics = this.getSessionMetrics(sessionId);
    const agentCount = sessionMetrics.totalAgents;

    const maxTime = this.findCriticalPathTime(sessionMetrics.agents);
    const totalTime = sessionMetrics.totalDurationMs;

    return {
      sequentialTime: totalTime,
      parallelTime: maxTime,
      speedup: totalTime / Math.max(maxTime, 1),
      efficiency: (totalTime / Math.max(maxTime, 1)) / Math.max(agentCount, 1),
    };
  }

  private findCriticalPathTime(agents: AgentExecutionMetrics[]): number {
    const graph = new Map<string, AgentExecutionMetrics>();
    for (const agent of agents) {
      graph.set(agent.agentId, agent);
    }

    const memo = new Map<string, number>();
    const dfs = (agentId: string): number => {
      if (memo.has(agentId)) return memo.get(agentId)!;
      const agent = graph.get(agentId);
      if (!agent) return 0;

      let maxChildTime = 0;
      for (const childId of agent.childrenAgentIds) {
        maxChildTime = Math.max(maxChildTime, dfs(childId));
      }

      const total = agent.durationMs + maxChildTime;
      memo.set(agentId, total);
      return total;
    };

    let criticalTime = 0;
    for (const agent of agents) {
      if (!agent.parentAgentId) {
        criticalTime = Math.max(criticalTime, dfs(agent.agentId));
      }
    }

    return criticalTime;
  }
}
```

---

## 14. Implementation Roadmap

### 14.1 Phase 1 -- Foundation (Week 1-2, 40h)

**Goal:** Core infrastructure for sidekick/subagent execution via NATS

| Task | Hours | Dependencies | Output |
|------|-------|-------------|--------|
| P1.1 Create `@ideia/parallel-agent` package | 4 | None | Package scaffold with types |
| P1.2 Implement SidekickPool with NATS distribution | 12 | P1.1, EventBus | SidekickPool ready for distribution |
| P1.3 Implement TaskDispatcher with rule engine | 8 | P1.2 | Rule-based task routing |
| P1.4 Implement ResultCollector with timeout | 6 | P1.2 | Timeout-aware result collection |
| P1.5 Implement basic FusionEngine with NATS | 6 | P1.3, P1.4 | NATS-based fusion pipeline |
| P1.6 Integrate with existing RouteSelector | 4 | P1.5 | N4/N5 levels use sidekicks |

**Risks:**
- NATS dependency introduces operational overhead
- Sidekick timeout handling can be complex with many agents

**Deliverable:** `IDEIA agent run --parallel` spawns sidekicks via NATS

### 14.2 Phase 2 -- MapReduce & Decomposition (Week 3-4, 48h)

**Goal:** Enable true parallel data processing and task decomposition

| Task | Hours | Dependencies | Output |
|------|-------|-------------|--------|
| P2.1 Create `@ideia/map-reduce` package | 4 | None | Package scaffold with types |
| P2.2 Implement ShardEngine (3 strategies) | 10 | P2.1 | File/line/semantic sharding |
| P2.3 Implement MapReduceExecutor | 14 | P2.2 | Configurable map-reduce pipeline |
| P2.4 Implement ReducerEngine (3 strategies) | 8 | P2.3 | Priority/majority/LLM reduce |
| P2.5 Enhance DependencyAnalyzer for cost-based grouping | 6 | PlanningEngine | Optimal parallel group detection |
| P2.6 Implement ParallelTaskDecomposer | 6 | P2.5, P2.3 | DAG-based parallel execution plan |

**Risks:**
- Semantic sharding quality depends on LLM understanding
- Reduce phase can be bottleneck for large shard counts

**Deliverable:** MapReduce for code review, multi-file refactoring, and test generation

### 14.3 Phase 3 -- Droid Pool & Resource Management (Week 5-6, 44h)

**Goal:** Container-based execution with full resource governance

| Task | Hours | Dependencies | Output |
|------|-------|-------------|--------|
| P3.1 Create `@ideia/droid-pool` package | 4 | None | Package scaffold with types |
| P3.2 Implement DroidImageRegistry | 6 | P3.1 | Pre-configured droid images |
| P3.3 Implement ContainerPool | 12 | P3.2 | Droid lifecycle management |
| P3.4 Implement ResourceManager with budget system | 10 | P3.3 | CPU/memory/token budgeting |
| P3.5 Implement PriorityTaskQueue | 6 | P3.4 | Priority-based task scheduling |
| P3.6 Implement RateLimiter for LLM providers | 6 | P3.5 | Prevent LLM rate limit errors |

**Risks:**
- Container overhead may negate parallelism benefits for small tasks
- Resource budget enforcement requires OS-level limits (cgroups)

**Deliverable:** Droids execute tasks with guaranteed resource limits

### 14.4 Phase 4 -- State Management & Fault Tolerance (Week 7-8, 40h)

**Goal:** Shared state, conflict resolution, and robust error recovery

| Task | Hours | Dependencies | Output |
|------|-------|-------------|--------|
| P4.1 Implement SharedStateManager with KV Store | 8 | EventBus | NATS KV-backed shared state |
| P4.2 Implement ConflictDetector | 6 | P4.1 | File-level conflict detection |
| P4.3 Implement ConflictResolver (LLM-based) | 8 | P4.2, LLMProvider | Intelligent conflict resolution |
| P4.4 Implement HealthMonitor | 6 | SidekickPool | Heartbeat-based health tracking |
| P4.5 Implement OrphanDetector | 4 | P4.4 | Zombie agent cleanup |
| P4.6 Implement CheckpointManager | 8 | P4.1 | Session checkpoint/restore |

**Risks:**
- LLM-based conflict resolution may be slow for frequent conflicts
- File lock contention can serialize parallel agents

**Deliverable:** Fault-tolerant parallel execution with checkpoint recovery

### 14.5 Phase 5 -- Integration & Metrics (Week 9-10, 36h)

**Goal:** Full integration with CLI, Theia, and observability

| Task | Hours | Dependencies | Output |
|------|-------|-------------|--------|
| P5.1 Implement MetricsCollector | 6 | All prior | Agent execution metrics |
| P5.2 Implement parallel efficiency reporting | 4 | P5.1 | Speedup/efficiency analytics |
| P5.3 Integrate with CLI (`IDEIA agent run --parallel`) | 8 | P5.2 | CLI parallel commands |
| P5.4 Integrate with Theia Agent Panel widget | 8 | P5.3 | Visual parallel execution view |
| P5.5 End-to-end test suite for parallel execution | 6 | P5.3 | 20+ integration tests |
| P5.6 Performance benchmark suite | 4 | P5.5 | Baseline metrics for optimization |

**Risks:**
- Theia integration may require significant widget rework
- Parallel execution visualization is complex (DAG, live updates)

**Deliverable:** Full parallel agent system integrated across CLI, Theia, and metrics

### 14.6 Effort Summary

| Phase | Hours | Tasks | Dependencies |
|-------|-------|-------|-------------|
| P1: Foundation | 40 | 6 | @ideia/event-bus, @ideia/agent-router |
| P2: MapReduce | 48 | 6 | P1, @ideia/planning-engine |
| P3: Droid Pool | 44 | 6 | P1, @ideia/event-bus |
| P4: State/FT | 40 | 6 | P1-P3 |
| P5: Integration | 36 | 6 | P1-P4 |
| **Total** | **208** | **30** | |

### 14.7 Benchmark Targets

| Metric | Current | Target (P1) | Target (P2) | Target (P3) | Target (P4) | Target (P5) |
|--------|---------|------------|------------|------------|------------|------------|
| Agents/sec | 0 (sequential) | 4 | 8 | 12 | 12 | 16 |
| Task completion time reduction | 0% | 30% | 50% | 60% | 65% | 70% |
| Resource utilization | 10% | 30% | 50% | 70% | 75% | 80% |
| Max parallel agents | 1 | 4 | 8 | 16 | 16 | 24 |
| Failed agent recovery | Manual | Manual | Auto-retry | Auto-retry | Auto-terminate | Auto-terminate |
| Cost per task (tokens) | 1x | 0.9x | 0.7x | 0.6x | 0.55x | 0.5x |
| LLM calls/sec | 0.5 | 2 | 5 | 8 | 10 | 12 |

### 14.8 Expected Impact

| Use Case | Current (Sequential) | With Parallel System | Improvement |
|----------|---------------------|---------------------|-------------|
| Multi-file code review | 5 files = 10 min | 5 files = 3 min | 3.3x speedup |
| Test suite generation | 10 modules = 20 min | 10 modules = 4 min | 5x speedup |
| Full-stack feature | 15 steps = 45 min | 15 steps = 12 min | 3.75x speedup |
| Codebase exploration | 1 analyst = 15 min | 4 search sidekicks = 5 min | 3x speedup |
| Bug fix with verification | 8 steps = 25 min | 8 steps = 8 min | 3.1x speedup |

---

## 15. Conexoes

### 15.1 S5 -- Multiagent Orchestration (ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md)

The parallel agent system in S51 is the execution engine for S5's multiagent patterns:

- S5 identifies role-based agent design as the most successful pattern
- S51 provides the concrete SidekickPool + DroidContainer to run role-based agents in parallel
- S5's Shared Message Pool and Blackboard patterns are implemented via S51's NATS Pub/Sub and KV Store
- S5's Wave Dispatch pattern (speedup 14.3x) maps to S51's Pipeline + MapReduce executors

### 15.2 S50 -- Computer Use (ESTUDO-S50-COMPUTER-USE.md)

Computer Use agents benefit from parallel execution in several ways:

- S50's browser automation tasks can run as parallel sidekicks (testing multiple pages simultaneously)
- S50's Playwright scripts execute in Droid containers with dedicated resource budgets
- S51's MapReduce can shard test cases across multiple Computer Use agents
- S50's screenshot capture and analysis can be pipeline stages in S51's parallel model

### 15.3 S52 -- PR Automation (ESTUDO-S52-PR-AUTOMATION.md)

PR Automation is a primary consumer of parallel agent execution:

- PR review is naturally parallel (shard by file, sidekick per file)
- S51's MapReduce maps perfectly to S52's parallel review + merge workflow
- ConflictResolver handles conflicting review suggestions
- S52's auto-fix pipeline benefits from Pipeline execution model
- MetricsCollector provides S52 with per-agent performance data

### 15.4 S47 -- Theia AI/Agents (ESTUDO-S47-THEIA-AI-AGENTS.md)

Theia integration requirements:

- Theia Agent Panel widget visualizes SidekickPool status and DAG progress
- S47's AICommandContribution can trigger parallel agent workflows
- S47's AgentInteractionWidget shows per-sidekick progress and results
- S47's ChatParticipant integration allows chat-triggered parallel execution
- Theia's DI system (Inversify) provides natural injection for SidekickPool, ContainerManager, etc.

### 15.5 S42 -- DI/Contributions (ESTUDO-S42-THEIA-DI-CONTRIBUTIONS.md)

Dependency injection patterns for parallel agents:

- SidekickPool registered as singleton in Theia's DI container
- DroidContainerManager provided as injectable service
- RouteSelector injected into parallel execution flows
- Different DI scopes for meta-agents (singleton) vs sub-agents (transient)
- Contribution points for registering custom sidekick types and droid images

### 15.6 Other Conexoes

| Study | Connection |
|-------|-----------|
| **S3 (Intent-to-Plan)** | S51's TaskDecomposer consumes S3's intent-classified plans |
| **S7 (Learning Engine)** | Parallel execution metrics feed S7's pattern learning |
| **S10 (Contracts)** | S51's agent contracts (SidekickDefinition, DroidImage) extend S10's contract system |
| **S12 (Test Quality)** | S51's parallel test execution integrates with S12's test automation |
| **S13 (Performance)** | S51's benchmark targets (Section 14.7) feed S13's performance model |
| **S34 (Editor Widget)** | S51's execution visualization uses S34's widget patterns |
| **S38 (Editor Intelligence)** | S51's parallel completions extend S38's inline intelligence |
| **G1 (Event Bus)** | S51 is the primary consumer of G1's NATS JetStream implementation |
| **G2 (LangGraph)** | S51 extends G2's LangGraph with distributed parallel execution |
| **G5 (Fusion Engine)** | S51 replaces G5's primitive fusion with NATS-based distributed fusion |

### 15.7 Integration Map

```
S51 Parallel Agent System (this study)
  |
  +-- requires --> G1 (NATS JetStream) -- already implemented
  |
  +-- extends --> G2 (LangGraph Multiagent) -- adds distributed execution
  |
  +-- replaces --> G5 (Fusion Engine) -- adds NATS distribution
  |
  +-- consumes --> S3 (Intent-to-Plan) -- plan decomposition
  |
  +-- feeds into --> S52 (PR Automation) -- parallel PR review
  |
  +-- feeds into --> S50 (Computer Use) -- parallel browser testing
  |
  +-- integrates with --> S47 (Theia AI/Agents) -- UI visualization
  |
  +-- extends --> S42 (DI/Contributions) -- DI scopes for agents
  |
  +-- depends on --> S13 (Performance) -- benchmark validation
  |
  +-- measures via --> S7 (Learning Engine) -- pattern learning from execution data
```

---

## Appendix A: Key Design Decisions

| Decision | Option A | Option B | Chosen | Rationale |
|----------|----------|----------|--------|-----------|
| Communication protocol | Direct HTTP | NATS Pub/Sub | NATS | Already in stack, async, scalable |
| Sidekick granularity | Per-function | Per-file | Per-file | Better isolation, simpler state mgmt |
| Resource enforcement | OS cgroups | Application-level | Application-level | Cross-platform, no OS dep |
| Conflict resolution | Deterministic | LLM-based | Hybrid | LLM for complex, deterministic for simple |
| State sharing | Central DB | NATS KV | NATS KV | Aligns with G1, low latency |
| Agent isolation | In-process | Container | Both | Sidekicks in-process, Droids in containers |
| Map synchronization | Barrier | Latch | Latch per layer | Simpler than global barrier |
| Checkpoint frequency | Every step | Every N steps | Every N steps | Balance between overhead and safety |

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| Sidekick | Independent agent spawned by master for parallel execution with dedicated tools |
| Droid | Pre-configured container with specific environment for task type |
| Sub-agent | Lightweight agent (cheap model) for homogeneous subtasks |
| Meta-agent | Orchestrator that manages other agents (supervisor, fusion) |
| Fusion | Pattern where master distributes work to sidekicks and merges results |
| MapReduce | Data processing pattern: shard -> map (parallel) -> reduce (merge) |
| Fork-Join | Task parallelism: split -> execute (parallel) -> merge |
| Pipeline | Sequential stages with parallel execution within each stage |
| Fire-and-Forget | Background sidekick execution without blocking master |
| Resource Budget | CPU/memory/token limits per agent or agent type |
| Checkpoint | Snapshot of agent state for resume after failure |
| Heartbeat | Periodic signal from agent indicating it is alive |
| Blackboard | Shared storage for collaborative agent work |
| Shard | Unit of data for parallel map processing |
| Critical Path | Longest dependency chain determining minimum execution time |
