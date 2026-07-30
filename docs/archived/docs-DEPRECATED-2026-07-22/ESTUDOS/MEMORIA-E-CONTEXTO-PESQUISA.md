# Estudo: Gerenciamento de Contexto e Memória Persistente para Sistemas de Desenvolvimento Assistido por IA

> **Data:** 2026-07-17
> **Propósito:** Pesquisa abrangente sobre padrões, tecnologias e estratégias para evoluir o sistema de memória do ai-devkit — de armazenamento in-memory heurístico para memória persistente cross-session, aprendizado cross-projeto e contexto de longa duração.
> **Base:** Análise do código-fonte do ai-devkit + pesquisa web sobre estado da arte (2025-2026)

---

## Sumário

1. [Metodologias e Padrões](#1-metodologias-e-padrões)
2. [Da Tecnologia Mais Madura à Mais Inovadora](#2-da-tecnologia-mais-madura-à-mais-inovadora)
3. [Estudos Técnicos e Ensaios](#3-estudos-técnicos-e-ensaios)
4. [Riscos Técnicos e Mitigações](#4-riscos-técnicos-e-mitigações)
5. [Relevância para o Fluxo Ideia → Entrega](#5-relevância-para-o-fluxo-ideia--entrega)
6. [Reuso no ai-devkit (Avaliação de Cada Item)](#6-reuso-no-ai-devkit-avaliação-de-cada-item)
7. [Conclusão e Recomendações](#7-conclusão-e-recomendações)

---

## 1. Metodologias e Padrões

### 1.1 Knowledge Graphs

Knowledge Graphs (KGs) organizam dados como nós (entidades) e arestas (relacionamentos), permitindo consultas multi-hop e raciocínio sobre conexões indiretas.

| Tecnologia | Tipo | Destaque | Maturidade |
|-----------|------|----------|------------|
| **Neo4j** | Graph DB (propriedade) | ACID, Cypher query language, ecossistema maduro (LangChain, GraphRAG) | Madura (prod~ao) |
| **Amazon Neptune** | Graph DB (cloud) | Gerenciado, suporte RDF + Property Graph, serverless | Madura (AWS) |
| **Dgraph** | Graph DB (open source) | GraphQL nativo, distribuído, alta performance | Madura |
| **RDF/SPARQL** | Padrão W3C | Interoperabilidade semântica, linked data | Madura (acadêmica) |
| **FalkorDB** | Graph DB (Redis-based) | Baixa latência, vetores + graph | Emergente |
| **Memgraph** | Graph DB in-memory | Streaming, tempo real, Cypher | Emergente |

**No contexto do ai-devkit:** KGs são ideais para conectar requisitos → código → decisões → riscos. Cada nó seria um artefato (arquivo, decisão, padrão, tarefa), e arestas representariam "depende_de", "implementa", "substitui", "causou".

### 1.2 Vector Databases

Vector databases armazenam embeddings (representações numéricas de significado semântico) e permitem busca por similaridade.

| Tecnologia | Tipo | Destaque | Maturidade |
|-----------|------|----------|------------|
| **Pinecone** | SaaS gerenciado | Serverless, híbrido (sparse+dense), 5M+ req/dia | Madura (cloud) |
| **Weaviate** | Open source + Cloud | Graph + Vector nativo, módulos generativos, multi-tenancy | Madura |
| **Qdrant** | Open source + Cloud | Rust, filtros por payload, performance extrema | Madura |
| **Milvus** | Open source + Cloud | GPU acceleration, scaling horizontal, 1B+ vetores | Madura |
| **ChromaDB** | Open source (embeddable) | Python-first, zero-config, ideal para prototipação | Madura (dev) |
| **LanceDB** | Open source (embeddable) | Baseado em Lance (columnar), serverless | Emergente |

**No contexto do ai-devkit:** O `vector-store.ts` já implementa armazenamento local com persistência JSON e IVF index. É funcional para centenas de documentos, mas não escala para dezenas de milhares. Uma migração para SQLite + FTS5 ou DuckDB seria o próximo passo natural.

### 1.3 RAG (Retrieval-Augmented Generation) — Padrões e Variações

#### Arquiteturas de RAG (mapeamento 2026)

```
1. Naive RAG:         Query → Embed → Search → Retrieve → Generate
2. Advanced RAG:      Query → Query Rewrite → HyDE → Hybrid Search → Re-rank → Generate
3. GraphRAG:          Query → Entity Extraction → Graph Traversal → Community Summaries → Generate
4. Agentic RAG:       Query → Agent (plan → tool calls → retrieve → reason → repeat) → Generate
5. Adaptive RAG:      Query → Classifier → [Simple: Naive RAG | Complex: Agentic RAG | Relational: GraphRAG]
6. Self-RAG:          Query → Retrieve → Reflect (relevance check) → Generate → Reflect (hallucination check)
7. Corrective RAG:    Query → Retrieve → Evaluate → [Pass: Generate | Fail: Rewrite/Web Search → Retry]
8. Fusion RAG:        Query → Multi-route (vector + graph + web + code) → Merge → Generate
```

#### Padrões Específicos para Código

- **RAG para código:** Embeddings de funções + análise AST + graph de dependências
- **HyDE (Hypothetical Document Embeddings):** Gera documento hipotético da query, usa ele para buscar
- **REPLUG:** Usa o próprio LLM como re-ranker (score de perplexidade)
- **Iterative RAG:** Múltiplas rodadas de busca com refinamento progressivo

**No contexto do ai-devkit:** O `rag.ts` já implementa um pipeline funcional: chunk → embedding → IVF search → hybrid rerank → citations. Suporta fallback TF-IDF, cache TTL por categoria, e 4 estratégias de ranking (hybrid, semantic, freshness, lexical). É uma base sólida que pode ser estendida com GraphRAG e Adaptive RAG.

### 1.4 GraphRAG (Microsoft)

GraphRAG é uma abordagem hierárquica que extrai um knowledge graph do texto, constrói comunidades (community detection), gera sumários para cada comunidade, e usa essas estruturas para RAG.

**Pipeline Microsoft GraphRAG:**
```
Text → Entity Extraction (LLM) → Knowledge Graph → Community Detection
(Leiden) → Community Summaries → Query → Graph Traversal → Answer
```

**Variações:**
- **LazyGraphRAG** (2025): Custa 0.1% do GraphRAG completo, ideal para corpora grandes
- **Agentic GraphRAG** (Memgraph 3.0, 2025): Agentes navegam o graph autonomamente
- **Light GraphRAG:** Extrai apenas entidades e relações mais relevantes, sem community detection

**Benchmarks (Microsoft, 2024-2025):**
| Métrica | Baseline RAG | GraphRAG | LazyGraphRAG |
|---------|-------------|----------|--------------|
| Comprehensiveness | 0.62 | 0.83 | 0.79 |
| Diversity | 0.58 | 0.82 | 0.78 |
| Cost de indexação | 1x | 3-5x | 0.001x |
| Latência de query | 50-300ms | 200-800ms | 150-500ms |

**Trade-off principal:** GraphRAG é 3-5x mais caro para indexar (requer LLM calls para extrair entidades), mas oferece muito melhor desempenho em perguntas multi-hop e sumarização global.

### 1.5 Memory Networks

#### End-To-End Memory Networks (Sukhbaatar et al., 2015)
Arquitetura neural com memória externa endereçável:
```
Input → Embed → Memory Hops (attention sobre slots) → Output → Answer
```
- Múltiplos "hops" de atenção permitem raciocínio multi-hop
- Limitado por tamanho fixo da memória
- Base conceitual para sistemas atuais

#### Differentiable Neural Computers (Graves et al., 2016, DeepMind)
- Memória externa com controle neural diferenciável
-读写 heads controlados por controller (LSTM ou feedforward)
- Permite aprendizado de algoritmos simples
- Complexo de treinar, superado por transformers + RAG

#### Transformer Memory Layer (Google, 2024-2026)
- Google Titans (2025): "Surprise metric" — detecta novidade vs memória existente
- Layer especializada que decide o que armazenar (surprise = alto)
- Híbrido: atenção de curto prazo + memória de longo prazo

**Relevância:** A arquitetura de atenção + memória externa do Titans informa como projetar sistemas que decidem automaticamente o que merece ser lembrado.

### 1.6 Episodic vs Semantic Memory

Inspirado na neurociência, esta distinção é cada vez mais usada em agent memory:

| Tipo | Descrição | Exemplo | Armazenamento |
|------|-----------|---------|---------------|
| **Episodic Memory** | Eventos específicos com contexto temporal | "Na sessão de 15/07, o usuário pediu para refatorar o módulo X" | Chronological, searchable |
| **Semantic Memory** | Fatos gerais, conhecimento estruturado | "O projeto usa NestJS com Clean Architecture" | Graph ou KV store |
| **Procedural Memory** | Como fazer coisas (habilidades) | "O padrão de controller é: valida DTO → chama use case → retorna response" | Prompts ou regras |

**Implementações atuais:**
- **LangMem:** Semantic (collections + profiles), Episodic (summaries), Procedural (prompt refinement)
- **Mem0:** User memory (fat sobre usuário), Session memory (contexto da conversa), Agent memory (específico do agente)
- **Letta:** Core memory (sempre in-context, como RAM), Archival memory (searchable, como disco), Recall memory (histórico paginado)
- **Zep/Graphiti:** Temporal knowledge graph com `valid_at`/`invalid_at` para cada fato

### 1.7 Context Window Management

Técnicas para gerenciar a janela de contexto limitada dos LLMs:

#### Sliding Window
```
[msg1, msg2, msg3, msg4, msg5] → quando chega msg6, remove msg1
```
- Simples, barato, mas perde contexto antigo abruptamente
- Usado por: ChatGPT (versões iniciais)

#### Summarization
```
[histórico completo] → LLM sumariza → [summary] → query system para consultar
```
- Hierarchical: múltiplos níveis de sumário (session → dia → semana)
- Usado por: Mem0, LangMem, sistemas de memória conversacional

#### Hierarchical Compression
```
Nível 0: mensagens brutas (últimos N turns)
Nível 1: sumário da sessão atual
Nível 2: sumário do dia
Nível 3: padrões identificados (cross-session)
Nível 4: conhecimento permanente do usuário/projeto
```
- **Key insight:** Compressão em múltiplas granularidades permite context-aware retrieval
- **Custo:** Requer LLM calls periódicas para re-summarização

#### Context Compaction (usado pelo Letta/MemGPT)
- O próprio LLM decide o que manter, o que arquivar e o que buscar
- Funções como `memory_edit`, `memory_append`, `conversation_search`
- Inspirado em paginação de memória virtual de SOs

### 1.8 Working Memory

Como manter contexto ativo da sessão atual:

| Abordagem | Descrição | Prós | Contras |
|-----------|-----------|------|---------|
| **Context Window bruta** | Histórico completo no prompt | Simples, sem perda | Caro, limitado |
| **Buffer + Summary** | Últimos N turns + sumário do resto | Balanceado | Summary pode omitir detalhes|
| **Token budget** | Aloca tokens por tipo (código > histórico > instruções) | Controle fino | Complexo de configurar |
| **Attention-based** | Modelo decide o que é relevante (sistema como RAG ativo) | Eficiente | Requer LLM capaz |
| **CAG (Cache-Augmented)** | Pré-carrega tudo no KV-cache do modelo | Zero retrieval latency | Limitado ao context window |

**No contexto do ai-devkit:** O `context-store.ts` implementa um working memory básico: `ContextStore` com `add()`, `filterRelevance()`, `pruneExpired()`, e `evictLowestPriority()`. É in-memory, sem persistência, mas a estrutura de `ContextItem` (type, source, content, tokens, priority, tags, relevanceScore) é sólida.

---

## 2. Da Tecnologia Mais Madura à Mais Inovadora

### 2.1 Tecnologias Maduras

#### Neo4j (graph database)
- **Maturidade:** 15+ anos, ACID, ecossistema massivo
- **Diferenciais:** Cypher query language, Graph Data Science library, LangChain integration, AuraDB cloud
- **Limitações:** Operacional pesado (Docker/instância dedicada), schema obrigatório
- **Casos de uso:** Knowledge graph de decisões arquiteturais, grafo de dependências do projeto
- **Licenciamento:** Community (GPL) / Enterprise (comercial)

#### Redis + RedisJSON + RedisStack
- **Maturidade:** Extremamente maduro, onipresente em infraestrutura
- **Diferenciais:** In-memory (microssegundos), RedisStack adiciona vector search + graph + JSON
- **Limitações:** Volatilidade (sem persistência se não configurado), custo de memória
- **Casos de uso:** Cache semântico, working memory, session state, rate limiting
- **Licenciamento:** Redis Source Available License (RSALv2)

#### PostgreSQL + pgvector
- **Maturidade:** PostgreSQL é o banco mais confiável do mundo; pgvector é extensão nativa
- **Diferenciais:** Um banco para tudo (relacional + vetores + JSON), sem infra extra
- **Limitações:** Vector search não é tão rápido quanto Pinecone/Qdrant em escala > 1M, sem graph nativo
- **Casos de uso:** Ideal para o ai-devkit — unifica memória relacional + vetorial
- **Licenciamento:** PostgreSQL License (liberal)

#### ChromaDB
- **Maturidade:** 20K+ GitHub stars, embeddable, Python-first
- **Diferenciais:** Zero-config, in-memory, coleções, metadata filtering
- **Limitações:** Sem escala horizontal, sem graph, sem persistência nativa (Javascript client limitado)
- **Casos de uso:** Prototipação rápida, aplicações pequenas, POCs
- **Licenciamento:** Apache 2.0

### 2.2 Tecnologias Inovadoras

#### Microsoft GraphRAG
- **O que é:** Pipeline de indexação + query que extrai knowledge graph hierárquico de texto não-estruturado
- **Inovação:** Community detection (Leiden) + sumários por comunidade + busca global vs local
- **Maturidade:** Open source (MIT), 34K+ stars, Microsoft Research, em produção desde 2024
- **Python-based** (pip install graphrag), CLI primeiro
- **Limitação:** Custo alto de indexação (múltiplas LLM calls por chunk)

#### Mem0
- **O que é:** Camada de memória persistente para AI agents, framework-agnostic
- **Inovação:** Extração automática de fatos via LLM, três escopos (user/session/agent), deduplicação, graph search
- **Maturidade:** 48K+ stars, $24M Series A (2025), AWS Agent SDK exclusive provider
- **Stack:** Qdrant (vector) + Neo4j (graph) + KV store, com cloud managed
- **Limitação:** Features de graph no Pro tier ($249/mês)
- **Python first**, mas tem TypeScript SDK e REST API

#### Letta (ex-MemGPT)
- **O que é:** Framework para stateful agents com memória hierárquica (OS-inspired virtual context management)
- **Inovação:** O próprio agente decide o que manter/arquivar/buscar (self-managed memory)
- **Arquitetura:** 3 tiers: Core memory (in-context, RAM) → Archival memory (disco) → Recall memory (histórico)
- **Maturidade:** Apache 2.0, paper no arXiv (2310.08560), Letta Cloud, terminal agents
- **Python + TypeScript**, server Docker-ready
- **Benchmark:** #1 no Terminal-Bench
- **Limitação:** Tight coupling com o runtime do Letta

#### LangMem
- **O que é:** SDK de memória de longo prazo da LangChain
- **Inovação:** Três tipos de memória (semantic, episodic, procedural), background processing, auto-consolidação
- **Maturidade:** ~1.5K stars, MIT, mas release cadence lento (0.0.30 desde Out/2025)
- **Python-first**, integração nativa com LangGraph BaseStore
- **Melhor para:** Equipes já no ecossistema LangChain/LangGraph
- **Limitação:** Ainda pré-1.0, memória procedural é basicamente otimização de prompt

#### CAG (Cache-Augmented Generation)
- **O que é:** Paradigma que substitui RAG por pré-carregamento de conhecimento no KV-cache do LLM
- **Inovação:** Latência zero de retrieval (cache hit < 1s), sem erros de retrieval, arquitetura simplificada
- **Paper:** "Don't Do RAG" (Chan et al., arXiv:2412.15605, ACM Web Conference 2025)
- **Quando usar:** Corpus < 2M tokens, estável, alta frequência de queries
- **Quando evitar:** Corpus grande > 2M tokens, dados que mudam frequentemente
- **Provider support:** OpenAI prompt caching (50% desconto), Anthropic context caching, Google (nativo)

**Relevância para o ai-devkit:** O contexto de código de um projeto (source + docs + configs) geralmente cabe em 2M tokens. CAG é viável como alternativa ou complemento ao RAG existente.

#### Graphiti (Zep)
- **O que é:** Temporal knowledge graph engine open source (Apache 2.0)
- **Inovação:** Arestas com `valid_at`/`invalid_at` (bi-temporal), detecção automática de mudanças de fato, construção autônoma do graph
- **Stack:** Neo4j (ou KùzuDB como backend), ingestão incremental de episódios
- **Maturidade:** ~25K stars, paper arXiv (2501.13956), 94.8% DMR benchmark
- **Zep Cloud:** Managed service com <200ms p99 latency, ABAC, SOC2
- **Integração:** MCP server, Python SDK, TypeScript SDK, Go SDK

**Benchmark (DMR — Deep Memory Retrieval):**
| Sistema | Accuracy |
|---------|----------|
| Zep (GPT-4o Mini) | 98.2% |
| Zep | 94.8% |
| MemGPT | 93.4% |
| Mem0 | ~88% |

**Benchmark (LongMemEval):**
| Sistema | Accuracy |
|---------|----------|
| Zep | 63.8% |
| Mem0 | 49.0% |
| MemGPT | ~55% |

#### Zep (Plataforma Completa)
- MCP Server para memory retrieval unificado entre agentes
- Graph visualization dashboard
- Cross-session user memory com temporal validity
- Pricing: Free (1000 episódios/mês) até Enterprise (custom)

### 2.3 Matriz Comparativa Consolidada

| Tecnologia | Open Source | Setup | Persistência | Graph | Temporal | LLM-native | MCP | Ideal para |
|-----------|------------|-------|-------------|-------|----------|------------|-----|------------|
| Neo4j | Parcial | Docker/Cloud | ACID | ✅ Nativo | ⚠️ Extensão | ❌ | ❌ | KGs de dependências |
| pgvector | ✅ | Extensão PG | ✅ SQL | ❌ | ✅ SQL | ❌ | ❌ | Unificado relacional+vetor |
| ChromaDB | ✅ | pip install | ⚠️ JSON | ❌ | ❌ | ❌ | ⚠️ | Prototipação |
| Microsoft GraphRAG | ✅ | pip install | ✅ Files | ✅ Extraído | ❌ | ✅ Index | ❌ | Análise multi-documento |
| Mem0 | ✅ (core) | pip install | ✅ Cloud/KV | ⚠️ Pro | ❌ | ✅ Extração | ❌ | Perfil de usuário |
| Letta (MemGPT) | ✅ | pip/Docker | ✅ DB | ❌ | ❌ | ✅ Self-managed | ❌ | Agentes autônomos |
| LangMem | ✅ | pip install | ✅ LangGraph | ❌ | ❌ | ✅ Background | ❌ | Equipes LangChain |
| Graphiti (Zep) | ✅ | pip/Docker | ✅ Neo4j | ✅ Temporal | ✅ Bi-temporal | ✅ Extração | ✅ | Memória temporal |
| Zep Cloud | ❌ | API Key | ✅ Cloud | ✅ Temporal | ✅ Bi-temporal | ✅ Extração | ✅ | Enterprise |
| CAG | N/A | Provider | ❌ | ❌ | ❌ | ✅ KV-cache | ❌ | Corpus pequeno/estável |

---

## 3. Estudos Técnicos e Ensaios

### 3.1 "Lost in the Middle" (Liu et al., TACL 2024)

**Descoberta fundamental:** LLMs têm desempenho significativamente pior quando a informação relevante está no **meio** do contexto, comparado ao início ou final — uma curva em formato de U.

**Magnitude:**
- Queda de ~20 pontos percentuais (75% → 55%) em QA multi-documento quando o documento relevante move da posição 1 para a posição 10 (de 20)
- O efeito aparece em **todos os modelos testados**: GPT-3.5-Turbo, GPT-4, Claude-1.3 (8K e 100K), MPT-30B, LongChat-13B
- Claude-1.3-100K, mesmo com 100K de contexto, **não é imune** — ter janela grande não significa usá-la bem

**Mecanismo:** Tokens nas bordas recebem atenção desproporcional; tokens no meio recebem menos, independente de importância. É análogo ao efeito de primazia/recência na memória humana.

**Mitigações:**
- Colocar informações mais importantes no **início ou final** do prompt
- **Reordenar** documentos retrieved por relevância (mais relevante no início)
- Preferir **retrieval hierárquico** sobre carregamento completo
- Usar **Context Compaction** para evitar soterramento
- Atenção calibrada (Ms-PoE, 2026) reduz o bias sem retreinar

**Implicação para o ai-devkit:** O `context-store.ts` já ordena por relevância, mas o RAG engine precisa garantir que chunks críticos apareçam no início do contexto montado para o LLM.

### 3.2 Comparação de Chunking Strategies

| Estratégia | Descrição | Prós | Contras | Melhor para |
|-----------|-----------|------|---------|-------------|
| **Fixed-size** | Divide em N tokens fixos | Simples, rápido | Pode cortar no meio de uma função | Prototipação |
| **Recursive** | Separa por \n\n → \n → . → espaço | Preserva parágrafos | Pode criar chunks muito grandes | Documentação |
| **Semantic** | LLM decide onde dividir | Contextualmente perfeito | Caro (LLM call), lento | Documentos críticos |
| **Code-aware** | Divide por função/classe/bloco | Preserva unidades lógicas | Requer parser de AST | Código fonte |
| **Late chunking** | Embaralha chunks, delay embedding | Flexível | Complexo | Pesquisa |

**No ai-devkit:** O `chunker.ts` implementa recursive chunking com separadores configuráveis. Chunk size atual = 1000 caracteres com overlap de 200. Sugestão: adicionar code-aware chunking usando ts-morph (já disponível no projeto) e AST indexer.

### 3.3 Embedding Models — Comparação

| Modelo | Dimensões | Contexto | Custo | Performance (MTEB) | Provider |
|--------|-----------|----------|-------|-------------------|----------|
| text-embedding-3-small | 1536 | 8K | $0.02/1M tokens | 62.3 | OpenAI |
| text-embedding-3-large | 3072 | 8K | $0.13/1M tokens | 64.6 | OpenAI |
| voyage-3-large | 1024 | 32K | $0.09/1M tokens | 65.1 | Voyage AI |
| voyage-code-3 | 1024 | 32K | $0.09/1M tokens | — (código) | Voyage AI |
| embed-english-v3.0 | 1024 | 512 | $0.10/1M tokens | 64.0 | Cohere |
| BGE-large-en-v1.5 | 1024 | 512 | Gratuito (open) | 63.7 | BAAI |
| nomic-embed-text-v1.5 | 768 | 8192 | Gratuito (open) | 60.9 | Nomic (Ollama) |

**Recomendação:** `nomic-embed-text` via Ollama (gratuito, local) para desenvolvimento; `voyage-code-3` para produção (melhor em embeddings de código). O ai-devkit atualmente usa `nomic-embed-text` via Ollama — escolha acertada para o estágio atual.

### 3.4 Hybrid Search — Estado da Arte

Hybrid search combina múltiplas modalidades de busca para superar as limitações de cada uma:

```
Query → [Vector Search (dense)] → RRF Fusion → Rerank → Result
         [BM25 (sparse)]       ↗
         [Graph Traversal]     ↗
```

**Reciprocal Rank Fusion (RRF):**
```
Score(d) = Σ 1 / (k + rank_i(d))
```
- k = 60 (Elasticsearch default)
- Opera sobre ranks, não over scores — resolve incompatibilidade de escalas

**Benchmarks (WANDS dataset):**
| Abordagem | NDCG |
|-----------|------|
| BM25 puro | 0.6983 |
| Vector puro | 0.6953 |
| Hybrid (RRF) | 0.7497 (+7.4%) |

**No ai-devkit:** O `rag.ts` já implementa hybrid search ponderado (semanticWeight 0.5, freshnessWeight 0.25, lexicalWeight 0.25). Sugestão: adicionar graph traversal como terceira via e substituir weighted sum por RRF.

### 3.5 Hierarchical Summarization para Compressão

```
Nível 0 (raw):    Mensagens individuais dos últimos N turns
Nível 1 (session): Sumário da sessão atual
Nível 2 (daily):   Sumário do dia
Nível 3 (weekly):  Padrões identificados na semana
Nível 4 (global):  Conhecimento permanente do projeto
```

**Quando cada nível é usado:**
- Query atual → Nível 0 (full context)
- Sessão longa > 10 turns → Nível 0 + 1
- Nova sessão, mesmo dia → Nível 1 + 2
- Nova sessão, dia diferente → Nível 2 + 3
- Projeto diferente, mesmo usuário → Nível 3 + 4

**Implementação:** Cada nível é um sumário gerado por LLM, armazenado com timestamp, e recuperado sob demanda. O custo é de ~1 LLM call por nível por sessão.

### 3.6 Cache Strategies

#### Semantic Cache
- Cacheia resultados de busca por similaridade semântica, não por query exata
- Se query Q2 é semanticamente similar a Q1 (cosine > 0.95), retorna cache de Q1
- Reduz latência em 40-60% em sistemas com queries repetitivas
- Implementado no ai-devkit via `vector-store.ts` com TTL por categoria

#### TTL-based Cache
- Cache expira após tempo fixo
- `TTL_BY_CATEGORY` no ai-devkit: source (10min), documentation (30min), tests (5min)
- Simples, eficaz para dados que mudam em escala conhecida

#### LRU (Least Recently Used)
- Quando o cache atinge o limite, remove os itens menos recentemente usados
- O `ContextStore` implementa uma variante: `evictLowestPriority()` remove 10% dos itens de menor prioridade

#### KV-Cache (CAG)
- Cacheia os Key-Value states do transformer para o corpus completo
- Reduz tempo de prefill para zero em queries subsequentes
- Provider-specific: OpenAI Prompt Caching, Anthropic Context Caching
- Custo: ~50% do custo normal de inference (cached-input discount)

---

## 4. Riscos Técnicos e Mitigações

### 4.1 Hallucination em Recuperação de Contexto

| Tipo | Descrição | Mitigação |
|------|-----------|-----------|
| **Context hallucination** | LLM usa contexto irrelevante como se fosse relevante | Re-ranking, relevância mínima, citações |
| **Retrieval hallucination** | Chunk recuperado não contém a informação | Fallback TF-IDF (já implementado), multi-hop search |
| **Citation hallucination** | LLM atribui informação a fonte incorreta | Citation tracking (já implementado em `citations.ts`) |
| **Staleness hallucination** | Informação correta mas desatualizada | Temporal validity tracking (Zep/Graphiti pattern) |

### 4.2 Embedding Drift

**O que é:** Quando documentos são embeddados com versões diferentes do modelo de embedding, o espaço vetorial muda e a similaridade cosseno para de refletir similaridade semântica real.

**Causas:**
1. **Model drift:** Atualização do embedding model sem re-embeddar o corpus
2. **Data drift:** Novos documentos com distribuição diferente dos originais
3. **Preprocessing drift:** Mudanças em limpeza/tokenização entre índices
4. **Chunk-boundary drift:** Mudanças na estratégia de chunking

**Sintomas:**
- Recall cai silenciosamente (ex: 0.92 → 0.74)
- Mesmas queries retornam documentos diferentes
- Score de similaridade permanece alto (falsa confiança)

**Mitigações:**
- **Pin version do embedding model** em produção
- **Version vectors:** Cada documento armazena model_id + model_version
- **Drift detection:** Comparar distância cosseno de documentos conhecidos ao longo do tempo
- **Test set fixo:** Manter queries de teste com ground truth para monitorar recall
- **Incremental re-embedding:** Re-processar documentos em background conforme o modelo muda

**No ai-devkit:** O `vector-store.ts` já armazena `model` e `dimensions` por documento — base para versionamento. Falta: monitoramento de drift e alertas.

### 4.3 Staleness de Memória

| Problema | Exemplo | Risco |
|----------|---------|-------|
| Decisão antiga vs nova | "Usar Express" → depois "migrar para Fastify" | Contradição |
| Preferência de usuário mudou | "Prefiro tabs" → "agora prefiro spaces" | Irritação |
| Dependência desatualizada | "Usando React 17" (mas já migrou para 18) | Recomendação incorreta |

**Solução completa (Zep/Graphiti pattern):**
- Cada fato tem `valid_at` e `invalid_at` timestamps
- Quando um novo fato contradiz um antigo, o antigo é marcado como `invalid_at: now()`
- Queries retrievam apenas fatos onde `valid_at <= now() < invalid_at`
- Histórico preservado para debugging e rollback

### 4.4 Custo de Embedding/Store em Escala

| Cenário | Embeddings/mês | Storage | Custo estimado |
|---------|---------------|---------|---------------|
| Projeto pequeno (~1K arquivos) | ~500K tokens | ~50MB | ~$0.01 (Ollama) / ~$0.10 (OpenAI) |
| Projeto médio (~10K arquivos) | ~5M tokens | ~500MB | ~$0.10 (Ollama) / ~$1.00 (OpenAI) |
| Projeto grande (~100K arquivos) | ~50M tokens | ~5GB | ~$1.00 (Ollama) / ~$10.00 (OpenAI) |
| Cross-project (10 projetos) | ~500M tokens | ~50GB | ~$10 (Ollama) / ~$100 (OpenAI) |

**Mitigação:**
- Usar Ollama para embedding gratuito (local) — já é o padrão no ai-devkit
- Cache semântico reduz chamadas de embedding em 40-60%
- Partial reindex (já implementado) evita re-embeddar documentos não modificados
- Para scale cross-project, avaliar SQLite + FTS5 como alternativa ao vector store JSON

### 4.5 Privacidade

| Risco | Descrição | Mitigação |
|-------|-----------|-----------|
| Dados sensíveis em memória | Código proprietário, credenciais, PII | Sanitização antes de armazenar |
| Cross-user leakage | Memória de um usuário vaza para outro | Isolamento por namespace/user_id |
| Right to be forgotten | Usuário solicita deleção de memória | Marcador `deleted_at` + exclusão programada |
| Memory poisoning | Injeção de falsas memórias via prompt | Validação cruzada, confiança mínima |

**Boas práticas:**
- Todo `MemoryRecord` deve ter `namespace` ou `userId` para isolamento
- Implementar `deleteByUser(userId)` em todos os stores
- Audit trail imutável (já implementado via `attestations/chain.ts`)
- Criptografia em repouso (HMAC-SHA256 já usado nas atestações)

### 4.6 Tamanho do Contexto vs Performance

| Fator | Impacto | Mitigação |
|-------|---------|-----------|
| Contexto grande (>50K tokens) | Degradação "Lost in the Middle" | Reordenar por relevância, chunking inteligente |
| Contexto muito grande (>100K tokens) | Custo alto de inference, latência | CAG / KV-cache / compressão hierárquica |
| Múltiplos contextos (RAG + memória + instruções) | Concorrência por tokens | Budget allocation por tipo |
| Memória excessiva (muitos itens recuperados) | Diluição da informação relevante | Re-ranking, limite de itens (top-k) |

**No ai-devkit:** O `ContextStore` já tem `maxTotalTokens: 128000` e `maxItems: 500`. O `filterRelevance()` retorna no máximo 20 itens por query. Bom baseline.

---

## 5. Relevância para o Fluxo Ideia → Entrega

### 5.1 Como a Memória de Decisões Anteriores Alimenta Novas Tarefas

```
Ideia → Consulta memória (decisões similares anteriores)
      → Pattern detector (identifica padrões recorrentes)
      → Risk engine (avalia riscos baseado em resultados passados)
      → Context assembly (monta contexto para o LLM)
      → Geração de plano de implementação
      → Execução
      → Registro na memória (decisões, resultados, lições)
```

**Exemplo concreto:**
- Tarefa: "Adicionar autenticação JWT"
- Memória recupera: decisão anterior de usar `@nestjs/jwt` com `accessToken` + `refreshToken`
- Pattern detector nota: 3 tarefas anteriores usaram `@nestjs/passport`
- Risk engine calcula: baixo risco (padrão já validado)
- Contexto montado inclui: código existente de autenticação, decisões anteriores, riscos identificados
- Resultado: implementação consistente com o resto do projeto

### 5.2 Como o Sistema "Aprende" o Estilo e Padrões do Projeto

**Fases de aprendizado:**

1. **Sessão 1:** Sistema observa escolhas do usuário (framework, padrões, naming)
2. **Sessão 2:** Pattern detector identifica repetições → recomendações heurísticas
3. **Sessão 5+:** Learning engine ajusta políticas → alguns padrões são auto-aplicados
4. **Cross-project:** Padrões comuns entre projetos viram "receitas" reutilizáveis

**O que o sistema aprende:**
- Estrutura de diretórios preferida (`src/modules/feature/*.ts`)
- Padrões de código (Clean Architecture, DDD, MVC)
- Convenções de naming (camelCase, PascalCase, kebab-case)
- Frameworks e bibliotecas preferidos
- Estratégias de teste (unitário > integração > e2e)
- Preferências de estilo (tabs vs spaces, ponto-e-vírgula, aspas)

### 5.3 Como Contexto de Longa Duração Permite Continuidade entre Sessões

**Cenário real:**
- Sessão 1 (Dia 1): Usuário inicia "refatorar módulo de pagamentos"
- Sessão 2 (Dia 3): Continua de onde parou — sistema recupera contexto da sessão anterior
- Sessão 3 (Dia 7): Finaliza refatoração — sistema atualiza memória com resultados
- Sessão 4 (Dia 14): Nova tarefa similar — sistema recupera padrões da refatoração anterior

**Técnicas:**
- **Session checkpointing** (já implementado em `checkpoint-manager.ts`): salva estado SHA-256
- **Hierarchical summarization**: sumário da sessão anterior é carregado como contexto
- **Memory retrieval**: busca semântica por memórias relevantes da tarefa atual
- **Continuity guard**: detecta se uma tarefa foi interrompida e oferece continuidade

### 5.4 Como Knowledge Graph Conecta Requisitos → Código → Decisões → Riscos

```
[Requisito] ──implementa──→ [Módulo] ──contém──→ [Arquivo]
     │                        │                     │
     ├──gera──→ [Tarefa]      ├──depende_de──→ [Módulo B]
     │                        │
     └──influencia──→ [Decisão Arquitetural]
                          │
                          ├──causou──→ [Risco]
                          ├──substitui──→ [Decisão Anterior]
                          └──gerou──→ [ADR]
```

**Benefícios:**
- Rastreabilidade completa: de um requisito até os arquivos que o implementam
- Análise de impacto: "quebrar o módulo X afeta quais decisões?"
- Detecção de risco: "esta decisão já causou problemas antes?"
- Navegação contextual: "por que este arquivo foi criado?"

---

## 6. Reuso no ai-devkit (Avaliação de Cada Item)

### 6.1 Knowledge Graphs

| Tecnologia | Já existe? | Status | Criar ou adaptar? | Complexidade | Dependências |
|-----------|-----------|--------|-------------------|-------------|--------------|
| **Neo4j** | ❌ Não | Não existe | Criar adapter | Alta (Docker + schema + queries) | node-neo4j-driver |
| **Graph interno (JSON)** | 🟡 Parcial | Esqueleto | Adaptar | Baixa | Typescript `Map<K,V>` |
| **FalkorDB** | ❌ Não | Não existe | Criar adapter | Média | Redis + falkordb |

**Recomendação:** Começar com graph interno em JSON (aproveitando `pattern-detector.ts` e `memory-store.ts`), evoluir para FalkorDB se escala exigir, e apenas considerar Neo4j se houver necessidade de análise multi-hop complexa.

### 6.2 Vector Databases

| Tecnologia | Já existe? | Status | Criar ou adaptar? | Complexidade | Dependências |
|-----------|-----------|--------|-------------------|-------------|--------------|
| **ChromaDB** | ❌ Não | Não existe | Criar adapter | Média | chromadb npm |
| **pgvector** | ❌ Não | Não existe | Criar adapter | Alta (requer PostgreSQL) | pg + pgvector |
| **Vector store JSON** | ✅ Sim | Implementado | Adaptar (escala) | Baixa | fs, path |
| **SQLite + FTS5** | ❌ Não | Não existe | Criar | Média | better-sqlite3 |

**Recomendação:** O vector store JSON atual é suficiente para projetos < 10K documentos. Para cross-project, migrar para SQLite + FTS5 (já testado no `searcher.ts` como fallback TF-IDF).

### 6.3 RAG

| Componente | Já existe? | Status | Criar ou adaptar? | Complexidade | Dependências |
|-----------|-----------|--------|-------------------|-------------|--------------|
| **RAG Engine** | ✅ Sim | Implementado (`rag.ts`, 415 linhas) | Adaptar | Média | embeddings.ts, vector-store.ts |
| **Chunker** | ✅ Sim | Implementado (`chunker.ts`, 162 linhas) | Adaptar (add code-aware) | Baixa | fs, path |
| **Reranker** | ✅ Sim | Implementado (`reranker.ts`) | Adaptar | Baixa | — |
| **Citations** | ✅ Sim | Implementado (`citations.ts`) | Adaptar | Baixa | — |
| **GraphRAG** | ❌ Não | Não existe | Criar | Alta | LLM calls para entity extraction |
| **Adaptive RAG** | ❌ Não | Não existe | Criar | Alta | Classifier (LLM/heuristic) |
| **CAG** | ❌ Não | Não existe | Criar | Média | LLM provider com prompt caching |

**Recomendação:** O RAG engine atual é maduro (415 linhas, com fallback TF-IDF, hybrid rerank, cache, citations). Próximos passos: 1) Adicionar code-aware chunking, 2) Implementar CAG como alternativa de baixa latência, 3) GraphRAG como evolução futura.

### 6.4 Memory Systems

| Componente | Já existe? | Status | Criar ou adaptar? | Complexidade | Dependências |
|-----------|-----------|--------|-------------------|-------------|--------------|
| **MemoryStore** | ✅ Sim | Implementado (in-memory, 36 linhas) | Adaptar (add persistência) | Baixa | JSONL / SQLite |
| **PatternDetector** | ✅ Sim | Implementado (heurístico, 22 linhas) | Adaptar (add LLM) | Média | LLM provider |
| **LearningEngine** | ✅ Sim | Implementado (heurístico, 11 linhas) | Adaptar (add LLM) | Média | LLM provider |
| **PolicyAdapter** | ✅ Sim | Implementado (heurístico, 17 linhas) | Adaptar (add LLM) | Média | LLM provider |
| **ContextStore** | ✅ Sim | Implementado (in-memory, 234 linhas) | Adaptar (add persistência) | Média | JSONL |
| **Working Memory** | ✅ Sim | Implementado (ContextStore) | Adaptar | Baixa | — |
| **Semantic Memory** | 🟡 Parcial | Memory types + Vector store | Integrar | Média | memory-store ↔ vector-store |
| **Episodic Memory** | ❌ Não | Não existe | Criar | Média | Conversão de ContextItem para MemoryRecord |
| **Procedural Memory** | ❌ Não | Não existe | Criar | Alta | Prompt templates + pattern-learner |
| **Temporal Memory** | ❌ Não | Não existe | Criar (Graphiti pattern) | Alta | valid_at/invalid_at nos records |

**Recomendação:** Converter `MemoryStore` de in-memory para JSONL append-only (padrão já usado em `attestations/chain.ts`). Adicionar LLM ao `PatternDetector` e `LearningEngine`. Implementar `EpisodicMemory` como bridge entre `ContextStore` e `MemoryStore`.

### 6.5 Tecnologias Externas

| Tecnologia | Já existe? | Status | Criar ou adaptar? | Complexidade | Dependências |
|-----------|-----------|--------|-------------------|-------------|--------------|
| **Mem0** | ❌ Não | Não existe | Adaptar (SDK) | Baixa (REST/JS SDK) | mem0 API key |
| **Letta** | ❌ Não | Não existe | Adaptar (Docker) | Média | Docker, letta server |
| **LangMem** | ❌ Não | Não existe | Adaptar (SDK) | Baixa (pip) | Python (cross-language) |
| **Graphiti** | ❌ Não | Não existe | Adaptar (Docker) | Média | Docker, Neo4j |
| **Zep Cloud** | ❌ Não | Não existe | Adaptar (API) | Baixa | API key |
| **Microsoft GraphRAG** | ❌ Não | Não existe | Adaptar (CLI) | Alta | Python, LLM API |

**Recomendação:** Avaliar Mem0 como camada de memória gerenciada (menor esforço de integração). Graphiti/Zep para necessidades temporais futuras. Letta/LangMem para equipes com偏好 por LangChain ou agentes autônomos.

### 6.6 Cache Strategies

| Estratégia | Já existe? | Status | Criar ou adaptar? | Complexidade |
|-----------|-----------|--------|-------------------|-------------|
| **Semantic Cache** | ✅ Sim | Implementado (vector-store.ts) | Adaptar | Baixa |
| **TTL Cache** | ✅ Sim | Implementado (TTL_BY_CATEGORY) | Adaptar | Baixa |
| **LRU Eviction** | ✅ Sim | Implementado (evictLowestPriority) | Adaptar | Baixa |
| **KV-Cache (CAG)** | ❌ Não | Não existe | Criar | Média |
| **Prompt Caching** | ❌ Não | Não existe | Adapter por provider | Baixa |

---

## 7. Conclusão e Recomendações

### 7.1 Stack de Memória Recomendada para o ai-devkit

Baseado na análise de maturidade, custo, integração com o ecossistema existente e necessidades do projeto:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FASE ATUAL (Já funciona)                      │
│                                                                     │
│  Vector Store: JSON local + IVF index (nomic-embed-text via Ollama) │
│  RAG Engine: chunk → embed → hybrid search → rerank → citations     │
│  Memory Store: in-memory MemoryRecord[] + PatternDetector heurístico │
│  Context Store: in-memory ContextMap com evicção por prioridade     │
│  Chunker: recursive text splitting (1000 chars, 200 overlap)        │
│  Cache: TTL por categoria + LRU eviction                            │
│  Audit: JSONL append-only + HMAC-SHA256 chain                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Stack recomendada para EVOLUÇÃO:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PERSISTÊNCIA (Fase 1)                           │
│                                                                     │
│  Memory Store: JSONL append-only (padrão comprovado do audit trail) │
│  Context Store: JSONL + save/load automático ao iniciar/desligar   │
│  Vector Store: SQLite + FTS5 (substitui JSON para >10K docs)       │
│  Cache: LRU com persistência em disco (já existe, melhorar)        │
│  Schema unificado: UnifiedRecord (proposto na análise de módulos)  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  MEMÓRIA INTELIGENTE (Fase 2)                       │
│                                                                     │
│  Semantic Memory: Vector store + LLM extraction de fatos            │
│  Episodic Memory: ContextStore adaptado com persistência cross-     │
│                   session (sumários hierárquicos)                   │
│  PatternDetector v2: LLM + heurísticas (fallback)                   │
│  LearningEngine v2: LLM + threshold adaptativo                      │
│  CAG: KV-cache para corpus de código (prompt caching providers)    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   APRENDIZADO CROSS-PROJECT (Fase 3)                │
│                                                                     │
│  Graph interno: Nós = projetos/módulos/decisões, Arestas =         │
│                  depende/implementa/substitui                       │
│  Cross-project patterns: PatternLearner unificado entre projetos   │
│  Knowledge Base federada: padrões comuns extraídos de múltiplos    │
│                           projetos                                  │
│  Mem0/Graphiti: avaliação para memória temporal cross-project      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Roadmap de Implementação

#### Fase 1 — Fundação (Semanas 1-3) — Já parcialmente em planejamento

| Item | Esforço | Prioridade | Depende de |
|------|---------|-----------|------------|
| **UnifiedRecord** em @ai-devkit/core | 2 dias | 🔴 Crítica | — |
| **Persistent MemoryStore** (JSONL append-only) | 3 dias | 🔴 Crítica | UnifiedRecord |
| **Persistent ContextStore** (save/load automático) | 2 dias | 🔴 Crítica | — |
| **EventBus** (integração entre módulos) | 2 dias | 🔴 Crítica | — |
| **Migrar MemoryStore** para PersistentStore | 2 dias | 🔴 Crítica | PersistentStore |
| **Migrar KnowledgeBase** para PersistentStore | 2 dias | 🟡 Alta | PersistentStore |
| **Migrar ContextStore** para PersistentStore | 2 dias | 🟡 Alta | PersistentStore |
| **Code-aware chunking** (AST-based) | 3 dias | 🟡 Alta | ts-morph (já existe) |

#### Fase 2 — Inteligência (Semanas 4-6)

| Item | Esforço | Prioridade | Depende de |
|------|---------|-----------|------------|
| **LLM no PatternDetector** (substituir heurística) | 5 dias | 🔴 Crítica | PersistentStore, LLM provider |
| **LLM no LearningEngine** (recomendações reais) | 3 dias | 🔴 Crítica | PatternDetector v2 |
| **CAG implementation** (KV-cache para código) | 4 dias | 🟡 Alta | LLM provider com prompt caching |
| **Semantic Memory** (extração de fatos via LLM) | 5 dias | 🟡 Alta | LLM provider |
| **Cognitive Coprocessor → Memory** (hub central) | 3 dias | 🟡 Alta | EventBus |

#### Fase 3 — Cross-Project (Semanas 7-9)

| Item | Esforço | Prioridade | Depende de |
|------|---------|-----------|------------|
| **PatternLearner cross-project** | 5 dias | 🟡 Alta | SQLite + FTS5 |
| **Graph de dependências** (projetos ↔ módulos) | 5 dias | 🟡 Média | Graph interno JSON |
| **Mem0 integration** (avaliação) | 3 dias | 🟢 Média | Mem0 SDK |
| **Hierarchical summarization** | 5 dias | 🟢 Média | LLM provider |
| **Temporal memory** (valid_at/invalid_at) | 4 dias | 🟢 Média | Graphiti ou equivalente |

### 7.3 Trade-offs: Embedded vs Externas vs Cloud

| Abordagem | Prós | Contras | Indicação |
|-----------|------|---------|-----------|
| **Embedded (JSONL/SQLite)** | Zero dependência externa, privacidade total, custo zero | Escala limitada, sem cache distribuído | **Fase 1** — desenvolvimento local, projetos pequenos |
| **Externas (Neo4j/PostgreSQL)** | Escala, ACID, query poderosa | Operacional pesado, requer manutenção | **Fase 3** — equipes maiores, multi-projeto |
| **Cloud (Mem0/Zep/Pinecone)** | Zero operação, SLA, features avançadas | Custo mensal, dependência de terceiros, privacidade | **Fase 3+** — produção, enterprise |
| **Híbrida (Embedded + Cloud)** | Melhor dos dois mundos | Complexidade de sincronia | **Recomendado** — embedded para dev, cloud para prod |

### 7.4 Resumo das Recomendações

1. **Persistência imediata:** Converter `MemoryStore` para JSONL append-only (padrão comprovado no projeto) → resolve o problema crítico de perda de estado entre sessões
2. **Schema unificado:** Implementar `UnifiedRecord` em `@ai-devkit/core` → permite que todos os módulos conversem
3. **LLM gradual:** Substituir heurísticas do `PatternDetector` e `LearningEngine` por LLM calls com fallback heurístico → sem quebrar o que funciona
4. **Cache inteligente:** Manter e expandir o sistema de cache existente (TTL + LRU + semântico) → ganho imediato de performance
5. **CAG como alternativa:** Implementar CAG para tasks com corpus de código conhecido → latência < 1s sem retrieval
6. **Graph futuro:** Começar com graph interno (JSON), evoluir para FalkorDB ou Mem0 quando a escala exigir
7. **Mem0/Zep na mira:** Avaliar integração com Mem0 para memória gerenciada cross-session (menor esforço) e Zep/Graphiti para necessidades temporais

### 7.5 Riscos de Não Implementar

| Risco | Impacto | Timeline |
|-------|---------|----------|
| **Usuário perde contexto ao trocar de sessão** | Experiência quebrada, retrabalho | **Já acontece** — todos os stores são in-memory |
| **Módulos continuam isolados** | Sistema não escala em complexidade | **Imediato** — nenhuma integração entre módulos |
| **Heurísticas se tornam gargalo** | Decisões pioram com o tempo | **3-6 meses** — sem aprendizado real |
| **Perda de conhecimento entre projetos** | Cada projeto começa do zero | **6-12 meses** — sem cross-project learning |
| **Concorrentes com memória real ultrapassam** | Diferencial competitivo desaparece | **12 meses** — Mem0/Letta/Zep já são padrão de mercado |

---

> **Documento gerado em:** 2026-07-17
> **Propósito:** Pesquisa abrangente para evolução do sistema de memória do ai-devkit
> **Base:** Análise do código-fonte (75+ arquivos em 6 módulos) + pesquisa web sobre estado da arte (2025-2026)
> **Stack atual do ai-devkit:** TypeScript/Node.js, Ollama (embeddings), JSON (persistência), Commander.js (CLI), React/Vite (web-ui)
> **Próximo passo:** Iniciar Fase 1 — Persistent MemoryStore (JSONL) + UnifiedRecord + EventBus
