# Estudo: Aprendizado Adaptativo, Feedback Loop e Evolução Cross-Projeto

> **Data:** 2026-07-17
> **Contexto:** ai-devkit — sistema de desenvolvimento assistido por IA
> **Objetivo:** Fundamentar a evolução do sistema de aprendizado de heurístico em memória para aprendizado cross-projeto com LLM real, fine-tuning seletivo e adaptive autonomy.

---

## Sumário

1. [Metodologias e Padrões](#1-metodologias-e-padrões)
2. [Da Tecnologia Mais Madura à Mais Inovadora](#2-da-tecnologia-mais-madura-à-mais-inovadora)
3. [Estudos Técnicos e Ensaios](#3-estudos-técnicos-e-ensaios)
4. [Riscos Técnicos e Mitigações](#4-riscos-técnicos-e-mitigações)
5. [Relevância para o Fluxo Ideia → Entrega](#5-relevância-para-o-fluxo-ideia--entrega)
6. [Reuso no ai-devkit (AVALIAÇÃO)](#6-reuso-no-ai-devkit-avaliação)
7. [Conclusão e Recomendações](#7-conclusão-e-recomendações)

---

## 1. Metodologias e Padrões

### 1.1 Active Learning

Seleciona os exemplos mais informativos para rotulação humana, maximizando ganho por anotação. Critérios: incerteza (menor confiança), diversidade (amostras representativas), expected model change (exemplos que mais alterariam o modelo).

**Relevância:** Reduzir custo de feedback humano no pipeline — o sistema pede revisão apenas quando o modelo está inseguro.

### 1.2 Reinforcement Learning from Human Feedback (RLHF)

Pipeline em 3 estágios: SFT (fine-tuning supervisionado) → RM (modelo de recompensa treinado em preferências humanas) → PPO (otimização da política com KL penalty contra o modelo base). Complexo, instável, mas poderoso. DPO (seção 2) substitui o RL.

**Relevância:** Paradigma fundacional. Para o ai-devkit, o conceito de "recompensa" mapeia para: aprovação do usuário, testes passando, tempo de entrega.

### 1.3 Online vs Offline Learning

| Aspecto | Offline | Online |
|---------|---------|--------|
| Dados | Lote fixo pré-coletado | Streaming, gerado pela política atual |
| Estabilidade | Alta | Requer regularização |
| Amostragem | Off-policy (distribuição fixa) | On-policy (distribuição atual) |
| Exemplo clássico | DPO vanilla | Online DPO, PPO, GRPO |
| Custo | Baixo (uma passada) | Alto (rollouts constantes) |

**Relevância:** Offline é ponto de partida. Online é necessário quando o sistema precisa se adaptar a novos padrões de projeto continuamente.

### 1.4 Few-shot Learning e In-context Learning

Few-shot: exemplos no prompt (zero custo de treino, mas limitado ao contexto). In-context learning: o modelo generaliza a partir de exemplos fornecidos na entrada, sem atualizar pesos.

**Relevância:** Mecanismo mais barato de adaptação. Ideal para o ai-devkit absorver estilo de um projeto específico sem fine-tuning. Use como camada 1 (imediata) da estratégia multi-nível.

### 1.5 Curriculum Learning

Ordena tarefas por dificuldade crescente. O modelo aprende conceitos fundamentais antes de enfrentar casos complexos.

**Relevância:** O ai-devkit pode usar curriculum learning para: (1) começar com projetos boilerplate, (2) evoluir para projetos com lógica de negócio, (3) chegar a projetos complexos com múltiplos serviços. Cada nível de dificuldade expande o repertório do sistema.

### 1.6 Meta-Learning (Learning to Learn)

Treina um modelo em múltiplas tarefas para que ele generalize para novas tarefas com poucos exemplos (few-shot generalization). MAML (Model-Agnostic Meta-Learning) e Reptile são algoritmos clássicos.

**Relevância:** O santo graal do cross-project learning: um sistema que "aprendeu a aprender" projetos e se adapta a um novo projeto em poucas iterações.

### 1.7 Transfer Learning e Domain Adaptation

Conhecimento adquirido em um domínio (ex: projetos web) é transferido para outro (ex: projetos mobile). Técnicas: fine-tuning, feature extraction, adversarial domain adaptation.

**Relevância:** Essencial para cross-project learning no ai-devkit. Padrões identificados em projetos Python devem informar decisões em projetos TypeScript. O memory-store atual já tenta isso com tags, mas sem generalização real.

### 1.8 Continuous Learning (Lifelong Learning)

Capacidade de aprender sequencialmente sem esquecer o anterior. Três famílias de mitigação:

1. **Replay-based:** Armazena exemplos antigos e os re-treina junto com novos dados (experience replay)
2. **Regularization-based:** Elastic Weight Consolidation (EWC), SI — penaliza mudanças em parâmetros importantes para tarefas antigas
3. **Architecture-based:** Expandir a rede (ex: novos adaptadores LoRA por tarefa), sem modificar parâmetros já treinados

**Relevância:** Crítico para o ai-devkit evoluir sem perder conhecimento de projetos anteriores.

### 1.9 Bayesian Optimization

Otimização de funções black-box usando modelos probabilísticos (Gaussian Processes). Usado para tuning de hyperparâmetros quando cada avaliação é cara.

**Relevância:** Tuning de parâmetros do agente (temperatura, top-p, número de exemplos few-shot, threshold de confiança) sem busca exaustiva.

### 1.10 Feedback Loops: Humano → Sistema → Modelo

Três níveis de loop:

1. **Humano → Sistema:** Usuário corrige saída, aprova/rejeita, fornece preferência explícita
2. **Sistema → Modelo:** O sistema coleta feedback, armazena em memória, usa como contexto em prompts futuros (in-context)
3. **Modelo → Sistema:** O modelo sugere melhorias nos próprios mecanismos do sistema (ex: "percebi que sempre erro validação de schema — sugiro criar um verificador automático")

**Relevância:** O feedback-pipeline atual implementa apenas o nível 1 (humano→sistema). Falta os níveis 2 e 3.

---

## 2. Da Tecnologia Mais Madura à Mais Inovadora

### 2.1 Maduras (prontas para uso imediato)

#### RLHF + DPO

- **Status:** Maduro, padrão-ouro desde 2024
- **Funciona:** Sem reward model, sem PPO, loss binária em pares de preferência
- **Limitação:** Requer pares (chosen/rejected), offline
- **Uso no ai-devkit:** Alinhar o LLM base ao estilo do desenvolvedor/equipe

#### LoRA / QLoRA

- **Status:** Maduro, amplamente suportado (HuggingFace PEFT, Unsloth)
- **Funciona:** Adaptadores de baixo posto (rank 8–64); QLoRA quantiza base em 4-bit
- **Custo:** Treina 0.1–1% dos parâmetros
- **Uso no ai-devkit:** Fine-tuning eficiente do modelo de geração de código para cada equipe

#### Scikit-learn + XGBoost

- **Status:** Maduro, décadas de uso
- **Funciona:** Classificação, regressão, detecção de padrões em dados tabulares
- **Uso no ai-devkit:** Detecção de padrões heurísticos (ex: "projetos com arquivo X tendem a ter bug Y") — complementar ao LLM

#### Prompt Engineering + Few-shot

- **Status:** Maduro, custo zero de treino
- **Funciona:** Incluir exemplos no prompt, ajustar instruções
- **Uso no ai-devkit:** Adaptação imediata a cada projeto (camada 1), personalização por contexto do usuário

### 2.2 Inovadoras (potencial alto, maturidade média)

#### Constitutional AI (Anthropic, 2022)

- **Status:** Validado em produção (Claude), mas requer LLM capaz de auto-crítica
- **Funciona:** Modelo critica e revisa próprias respostas guiado por uma "constituição" de princípios
- **Uso no ai-devkit:** O sistema pode auto-avaliar suas sugestões contra princípios de arquitetura (Clean Architecture, SOLID, DRY) antes de apresentar ao usuário
- **Diferença:** SL-CAI (aprendizado supervisionado de auto-crítica) + RL-CAI (RL de feedback da IA)

#### Self-Play / Self-Improvement (SPIN, Self-Rewarding)

- **Status:** Emergente (2024), resultados promissores
- **SPIN:** Modelo joga contra versão anterior de si mesmo — gera respostas, a versão nova aprende a preferir as respostas humanas sobre as geradas
- **Self-Rewarding LLM:** Modelo gera recompensas para si mesmo (LLM-as-a-Judge) e treina com Iterative DPO
- **Uso no ai-devkit:** Auto-melhoria sem feedback humano — o sistema gera código, avalia, e melhora iterativamente

#### Iterative DPO / Online DPO

- **Status:** Emergente (2024-2025), já usado em produção (Snorkel, HuggingFace TRL)
- **Funciona:** DPO com dados de preferência gerados on-policy a cada iteração. O modelo gera respostas, um juiz (humano ou automático) escolhe a melhor, e o modelo é atualizado
- **Uso no ai-devkit:** Ciclo contínuo: gerar código → usuário aceita/rejeita → DPO online → nova geração

#### KTO (Kahneman-Tversky Optimization)

- **Status:** 2024, validado até 30B params
- **Funciona:** Não precisa de pares — apenas rótulo binário (desejável/não desejável)
- **Vantagem:** Dados mais fáceis de coletar (thumbs up/down)
- **Uso no ai-devkit:** O feedback atual (approval/rejection) já é binário — KTO se encaixa perfeitamente

#### ORPO (Odds Ratio Preference Optimization)

- **Status:** 2024, monolítico (sem SFT separado + sem reference model)
- **Funciona:** Combina SFT e preferência em uma única etapa. Usa odds ratio como penalty
- **Uso no ai-devkit:** Simplifica o pipeline — um único fine-tuning em vez de SFT → alignment

#### GRPO (Group Relative Policy Optimization)

- **Status:** 2025, usado no DeepSeek-R1, emergente
- **Funciona:** Sem reward model, sem critic model. Compara respostas dentro de um grupo para calcular vantagem relativa
- **Uso no ai-devkit:** Ideal para verifiable rewards (testes passando, compilação bem-sucedida) — o grupo de respostas compete e a melhor vence

### 2.3 Fronteira (experimental, alto risco, alto retorno)

#### Lifelong Learning para LLMs (L2M)

- **Status:** Pesquisa ativa (2024-2026), surveys consolidadas
- **Abordagens:** Continual pre-training (CPT), Domain-adaptive pre-training (DAP), Continual fine-tuning (CFT)
- **Desafio:** Catastrophic forgetting ainda não resolvido em escala
- **Uso no ai-devkit:** Cenário ideal —mas exige pesquisa aplicada. Alternativa prática: LoRA per-task + router

#### Agent Symbolic Learning

- **Status:** Experimental (Zhou et al., 2024)
- **Funciona:** Trata prompts, ferramentas e pipelines como "pesos simbólicos" que são otimizados via análogos de backpropagation em linguagem natural
- **Uso no ai-devkit:** O agente poderia reescrever seus próprios prompts e ferramentas com base em erros — auto-evolução

#### Reflection (Reflexion — Shinn et al., 2023)

- **Status:** Validado (NeurIPS 2023), 91% pass@1 no HumanEval com GPT-4
- **Funciona:** Actor gera → Evaluator avalia → Self-Reflection critica em linguagem natural → Memória episódica → Próxima tentativa condicionada na reflexão
- **Uso no ai-devkit:** O agente reflete sobre códigos rejeitados e armazena a lição aprendida. Próxima vez que enfrentar problema similar, consulta a memória de reflexões

---

## 3. Estudos Técnicos e Ensaios

### 3.1 "Direct Preference Optimization" (Rafailov et al., 2023 — NeurIPS)

- **Contribuição:** Fecho algébrico do reward model RLHF: a política ótima pode ser expressa diretamente como função das probabilidades do modelo, eliminando RM + PPO
- **Loss:** `L_DPO = -E[log σ(β log(π_θ(y_w|x)/π_ref(y_w|x)) - β log(π_θ(y_l|x)/π_ref(y_l|x)))]`
- **Impacto:** Padrão-ouro desde 2024. Base para Llama-3-Instruct, Zephyr, Mistral-Instruct
- **Limitação:** Offline, dados fixos, sofre com distribuição do dataset

### 3.2 "Constitutional AI" (Bai et al., 2022 — Anthropic)

- **Contribuição:** Substitui feedback humano por auto-crítica guiada por princípios
- **Duas fases:** SL-CAI (modelo gera, critica, revisa → SFT) + RL-CAI (preferências geradas por IA → RM+RL)
- **Impacto:** Claude usa isso. Reduz drasticamente necessidade de anotadores humanos para segurança
- **Limitação:** Depende de modelo já capaz o suficiente para auto-crítica útil

### 3.3 "Self-Rewarding Language Models" (Meta, 2024)

- **Contribuição:** Modelo é simultaneamente gerador e reward model (LLM-as-a-Judge). Ciclo virtuoso: melhora instrução-following → melhora capacidade de julgar → melhora instrução-following
- **Método:** Iterative DPO com auto-recompensa
- **Impacto:** Demonstra auto-melhoria além do nível do seed model

### 3.4 "KTO: Model Alignment as Prospect Theoretic Optimization" (Ethayarajh et al., 2024)

- **Contribuição:** Função de utilidade baseada na Teoria do Prospecto (Kahneman-Tversky). Aversão a perda, sensibilidade não-linear a ganhos
- **Loss:** `L_KTO = E[w(y)(1 - v_KTO(x,y;β))]` onde v_KTO usa função logística (côncava em ganhos, convexa em perdas)
- **Dado necessário:** Binário (desejável/não), sem pares
- **Resultado:** Iguala DPO em benchmarks sem precisar de preference pairs

### 3.5 "ORPO: Monolithic Preference Optimization without Reference Model" (Hong et al., 2024)

- **Contribuição:** Unifica SFT + alignment em uma única etapa. Elimina reference model
- **Inovação:** Odds ratio penalty: `logit(y_w) / (1 - logit(y_w))` — amplifica diferença entre resposta preferida e rejeitada
- **Vantagem:** Um único fine-tuning, menos hyperparams, menos memória

### 3.6 "DeepSeek-R1: GRPO + Reinforcement Learning" (DeepSeek, 2025)

- **Contribuição:** Raciocínio emerge de RL puro sem SFT inicial. GRPO elimina critic model
- **Método:** Para cada pergunta, gera G respostas → calcula recompensa para cada → normaliza pelo grupo → advantage = (r_i - mean(r)) / std(r) → otimiza política com clipping
- **Resultado:** DeepSeek-R1-Zero desenvolve auto-verificação, reflexão e chain-of-thought sem supervisão
- **Lições para ai-devkit:** RL com verifiable rewards (testes, compilação) pode gerar comportamentos emergentes de qualidade

### 3.7 Comparação de Métodos de Fine-tuning

| Método | Parâmetros treinados | Memória (GPU) | Performance relativa | Custo |
|--------|---------------------|---------------|---------------------|-------|
| Full fine-tuning | 100% | 16× | Baseline | Altíssimo |
| LoRA (r=16) | 0.1-1% | 2× | 95-100% | Baixo |
| QLoRA (4-bit) | 0.1-1% | 1.5× | 93-99% | Muito baixo |
| Adapters | 3-5% | 3× | 96-100% | Médio |
| Prefix tuning | 0.1% | 1.2× | 90-95% | Mínimo |
| Prompt tuning | 0.01% | 1× | 85-93% | Mínimo |

### 3.8 Catastrophic Forgetting em LLMs

- **Causa:** Mudança na distribuição dos dados entre tarefas; estabilidade-plasticidade dilemma
- **Evidência:** Modelos fine-tuned em código perdem performance em linguagem natural (McCloskey effect)
- **Mitigações:**
  - **Replay:** Misturar 5-20% de dados antigos no novo treinamento (mais eficaz)
  - **EWC:** Penalização quadrática em parâmetros importantes
  - **LoRA per-task:** Manter adaptadores separados, rotear por task ID
  - **Model merging:** fundir adaptadores via weight averaging (model soup)
- **No ai-devkit:** Usar LoRA per-project + replay de exemplos antigos durante fine-tuning

### 3.9 "Reflexion" (Shinn et al., 2023 — NeurIPS)

- **Contribuição:** Agente aprende com erros via feedback verbal, sem update de pesos
- **Arquitetura:** Actor → Evaluator → Self-Reflection → Memória Episódica
- **Resultados:**
  - HumanEval: 91% pass@1 (vs 80% GPT-4 baseline)
  - Melhora significativa em decision-making (AlfWorld, WebShop)
- **Para ai-devkit:** Implementar como mecanismo de baixo custo — reflexão textual armazenada no memory-store, consultada em projetos futuros

---

## 4. Riscos Técnicos e Mitigações

### 4.1 Reward Hacking

- **Descrição:** Agente maximiza a métrica (não o objetivo). Ex: gera código que passa nos testes mas é inseguro/ineficiente
- **Mitigação:**
  - Múltiplas recompensas (testes + estilo + segurança + performance)
  - Ensemble de reward models
  - KL penalty contra modelo base
  - Regularização via múltiplos objetivos
  - Antropic sugere "inoculation prompting" — instruir explicitamente o modelo a não fazer reward hacking

### 4.2 Catastrophic Forgetting

- **Descrição:** Novo fine-tuning destrói conhecimento anterior
- **Mitigação:**
  - Experience replay (10-20% dados antigos no lote novo)
  - LoRA separado por projeto/domínio
  - EWC para parâmetros críticos
  - Model merging periódico
  - Para o ai-devkit: manter um "core" congelado + adaptadores por domínio

### 4.3 Data Distribution Shift

- **Descrição:** Projeto novo tem padrões diferentes do que o modelo viu em treino
- **Mitigação:**
  - Detecção de out-of-distribution via confidence score
  - Active learning: pedir feedback humano quando incerto
  - Domain adaptation rápida via few-shot no prompt
  - Fine-tuning incremental com dados do novo domínio

### 4.4 Feedback Loop Amplification (Viés se Reforça)

- **Descrição:** Se o sistema sugere algo errado e o usuário aceita, o sistema aprende que aquilo é correto e reforça o erro
- **Mitigação:**
  - Fontes de feedback múltiplas e independentes
  - Delay na incorporação: batch de feedback antes de treinar
  - Validação cruzada: se 2+ usuários rejeitam padrão similar, revisar
  - Never trust a single positive feedback sem verificação objetiva (testes)

### 4.5 Cold Start

- **Descrição:** Primeiro projeto não tem histórico — modelo não tem base para recomendar
- **Mitigação:**
  - Seed model com conhecimento geral de engenharia de software
  - Few-shot com templates de projetos similares (públicos/open-source)
  - Modo "exploratório" inicial com mais pedidos de confirmação humana
  - Usar heurísticas clássicas como fallback (ex: pattern-detector atual)

### 4.6 Overfitting a Padrões Específicos

- **Descrição:** Modelo decora padrões do dataset de treino sem generalizar
- **Mitigação:**
  - Regularização (dropout, weight decay, early stopping)
  - Dados diversos (cross-project, cross-language)
  - Evaluation em projetos hold-out
  - LoRA com rank baixo (r=8-16) naturalmente regulariza

### 4.7 Custo de Fine-tuning Continuado

- **Descrição:** Fine-tuning frequente é caro (GPU, energia, engenharia)
- **Mitigação:**
  - QLoRA (4-bit, 1.5× VRAM vs base, vs 16× full FT)
  - Fine-tuning noturno/off-peak
  - Graduação do custo: in-context (grátis) → LoRA semanal (barato) → FT completo mensal (caro)
  - Cache de adaptadores por projeto

---

## 5. Relevância para o Fluxo Ideia → Entrega

### 5.1 Cross-Project Learning

O sistema melhora a cada projeto porque armazena **padrões, pitfalls e preferências** no memory-store. Com aprendizado cross-projeto:

- **Projeto 1:** Sistema age como novato, pede confirmação frequente
- **Projeto 5:** Sistema reconhece "esse time prefere injeção de dependência via construtor" e já gera código nesse estilo
- **Projeto 20:** Sistema sugere arquitetura automaticamente baseada no domínio e nas preferências acumuladas

O pattern-detector atual (heurístico por tag frequency) evolui para:
- Pattern detector ML (classificador treinado em dados de projetos anteriores)
- Recommender system (sugestão baseada em similaridade de projeto)
- Policy learner (regras de arquitetura inferidas de decisões passadas)

### 5.2 Feedback do Usuário Refina Especificação e Implementação

- Feedback no nível de **linha de código**: "esta função está muito longa" → sistema aprende limite de tamanho
- Feedback no nível de **arquitetura**: "prefiro camada de serviço separada" → sistema ajusta templates
- Feedback no nível de **projeto**: "o setup de testes ficou muito complexo" → sistema simplifica boilerplate

### 5.3 Detecção de Padrões de Sucesso/Fracasso

O sistema deve correlacionar características do projeto com outcomes:

- **Sucesso:** Projetos que usaram biblioteca X tiveram 30% menos bugs
- **Fracasso:** Padrão de commit "fix: ..." após sugerir microsserviço indica complexidade desnecessária
- **Métrica:** Taxa de aceitação de sugestões por categoria

### 5.4 Adaptive Autonomy

O sistema ganha mais autonomia conforme demonstra confiabilidade:

| Nível | Confiança | Ação |
|-------|-----------|------|
| Blocked | < 30% | Só sugere, nunca executa |
| Guided | 30-70% | Sugere com justificativa, requer aprovação |
| Autonomous | 70-90% | Executa e notifica |
| Full | > 90% | Executa silenciosamente, relata apenas exceções |

A autonomy-policy atual já implementa isso, mas usa heurísticas fixas. A evolução é usar **Bayesian confidence estimation**: a confiança do sistema é calibrada por dados reais de acerto/erro por categoria.

### 5.5 Personalização (Estilo do Desenvolvedor/Equipe)

- Por desenvolvedor: prefere async/await vs Promises, tabs vs spaces, nomes descritivos vs curtos
- Por equipe: convenções de nomenclatura, padrão de commits, estrutura de diretórios
- Por organização: políticas de segurança, compliance, frameworks preferidos

---

## 6. Reuso no ai-devkit (AVALIAÇÃO)

### 6.1 Estado Atual dos Módulos Existentes

| Módulo | O que faz | O que falta |
|--------|-----------|-------------|
| feedback-pipeline | Submit → process → memory | Apenas mapeamento determinístico type→recommendation. Sem aprendizado, sem LLM, sem peso por feedback |
| pattern-detector | Agrupa tags com frequência ≥ 2 | Heurístico, threshold arbitrário, sem ML, sem contexto semântico |
| learning-engine | Mapeia padrão → ação (confidence ≥ 0.8 → "apply_policy_tuning") | Regra fixa, sem adaptação, sem aprendizado real |
| memory-store | Armazena/recupera registros com tags | Sem busca semântica, sem relevância temporal, sem esquecimento |
| observability-engine | Métricas e custos | Apenas coleta, sem análise preditiva, sem recomendação baseada em dados |
| autonomy-policy | Risk score → autonomy level | Heurístico, sem aprendizado dos outcomes reais |

### 6.2 Avaliação por Tecnologia

| Tecnologia | Existe? | Status | Precisa criar? | Complexidade |
|------------|---------|--------|---------------|-------------|
| In-context learning (few-shot) | Não | Não existe | Adaptar do zero | Baixa — apenas estender prompts |
| KTO (preferência binária) | Não | Não existe | Criar integração com feedback-pipeline | Média — requer LLM real |
| DPO offline | Não | Não existe | Criar pipeline de fine-tuning | Alta — requer GPU, dados, orquestração |
| LoRA/QLoRA | Não | Não existe | Integrar com provider de LLM | Alta — depende de qual LLM será usado |
| GRPO (verifiable rewards) | Não | Não existe | Criar reward functions + grupo de amostragem | Alta — experimental |
| Reflection (Reflexion) | Parcial | Esqueleto | Criar Actor-Evaluator-Reflection loop | Média — conceito simples, orquestração complexa |
| Active Learning | Não | Não existe | Criar seletor de exemplos informativos | Média |
| Curriculum Learning | Não | Não existe | Ordenar projetos por dificuldade | Baixa — principalmente metadados |
| Agent Symbolic Learning | Não | Não existe | Pesquisa aplicada | Muito alta |
| Lifelong Learning (L2M) | Não | Não existe | Estratégia LoRA per-task + replay | Alta |
| Bayesian Optimization | Não | Não existe | Wrapper para hyperparameter tuning | Média |
| Constitutional AI (auto-crítica) | Parcial | Esqueleto | Adicionar "constituição" de princípios de código | Média |
| Online DPO / Iterative DPO | Não | Não existe | Ciclo gerar → julgar → treinar | Alta |
| Model Merging | Não | Não existe | Técnica para combinar adaptadores | Média |
| Experience Replay | Não | Não existe | Buffer de exemplos antigos para fine-tuning | Baixa — buffer circular simples |

### 6.3 Análise de Integração com a Stack Atual

**Integrações chave para cada tecnologia:**

| Tecnologia | Se conecta com | Contrato necessário |
|------------|---------------|-------------------|
| In-context learning | LLM provider (prompts), memory-store | `MemoryStore.search(query, topK)` → retorna exemplos similares |
| KTO | feedback-pipeline, LLM provider | `FeedbackPipeline.getBinaryPreferences()` → `{prompt, response, label}` |
| Reflection | pattern-detector, memory-store, autonomy-policy | `Agent.reflect(task, error) → reflection_text`; `MemoryStore.store(reflection)` |
| Active Learning | observability-engine, feedback-pipeline | `ObservabilityEngine.getUncertainPredictions()` → lista de itens para revisão |
| LoRA/QLoRA | LLM provider, memory-store | `LLMProvider.fineTune(adaptor, dataset)`; cache de adapters por `projectId` |
| GRPO | verification-layer, LLM provider | `VerificationLayer.runTests(code) → pass/fail` como verifiable reward |
| Curriculum Learning | onboarding-engine, policy-engine | `OnboardingEngine.getNextProjectDifficulty(userLevel)` |
| Experience Replay | memory-store, learning-engine | `MemoryStore.sampleOldExamples(ratio, category)` → buffer de replay |

---

## 7. Conclusão e Recomendações

### 7.1 Abordagem de Aprendizado em Múltiplos Níveis

```
Nível 1 — In-Context (imediato, custo zero)
├── Few-shot no prompt com exemplos do projeto atual
├── Reflection armazenada em memória para o mesmo projeto
├── Active learning: pede feedback quando incerto
├── Custo: 0 (apenas tokens extras no prompt)
└── Entrega: Imediata (próxima interação)

Nível 2 — Fine-tuning Periódico (médio prazo, custo baixo)
├── KTO ou DPO com feedback acumulado da semana
├── QLoRA (4-bit) para adaptação ao estilo da equipe
├── Experience replay com buffer de exemplos antigos
├── Custo: Baixo (QLoRA ~$3-10/sessão em GPU)
└── Entrega: Diária/semanal

Nível 3 — Cross-Project Patterns (longo prazo, custo médio)
├── Model merging de adaptadores LoRA por projeto
├── GRPO com verifiable rewards (testes, compilação)
├── Curriculum learning: dificuldade crescente entre projetos
├── Bayesian optimization para hyperparams do agente
├── Custo: Médio (requer pipeline MLOps básico)
└── Entrega: Entre projetos
```

### 7.2 Roadmap de Implementação Sugerido

**Fase 1 (curto prazo — 2-3 semanas) — Nível 1:**
1. In-context learning: `MemoryStore.search(query, topK)` com embeddings semânticos
2. Reflection loop: Actor → Evaluator → Self-Reflection → memória
3. Active learning: threshold de confiança para pedir revisão humana

**Fase 2 (médio prazo — 4-6 semanas) — Nível 2:**
4. Pipeline KTO: coletar feedback binário → formatar dataset → fine-tuning via QLoRA
5. Experience replay no fine-tuning (buffer 20% dados antigos)
6. Cache de adaptadores LoRA por `projectId`

**Fase 3 (longo prazo — 8-12 semanas) — Nível 3:**
7. GRPO com verifiable rewards (integração verification-layer)
8. Model merging periódico de adaptadores
9. Curriculum learning: profile de dificuldade por projeto
10. Bayesian optimization para autonomia adaptativa

### 7.3 Trade-offs

| Decisão | Prós | Contras |
|---------|------|---------|
| Fine-tuning vs Prompting | Fine-tuning: mais preciso, menor latência por token | Fine-tuning: custo GPU, complexidade operacional |
| KTO vs DPO | KTO: dados mais fáceis (binário) | DPO: mais preciso com pares de qualidade |
| LoRA vs Full FT | LoRA: 100× mais barato, troca rápida | Full FT: potencialmente mais preciso |
| Online vs Offline | Online: adaptação contínua | Offline: mais estável, reprodutível |
| Model Merging vs Ensemble | Merging: inferência simples (1 modelo) | Merging: pode degradar ambos |
| Criar vs Comprar API | Próprio: controle total, sem dependência externa | API: zero manutenção de infraestrutura ML |

### 7.4 Decisão Estratégica

**Recomendação:** Começar pelo Nível 1 (in-context + reflection + active learning) que não requer GPU e dá ganho imediato. Seguir para KTO + QLoRA quando houver massa crítica de feedback (~500+ exemplos). GRPO e cross-project learning são objetivos de médio prazo (3-6 meses).

A maior alavanca de curto prazo é **Reflection**: implementar agora custa pouco (é só texto) e o ganho de qualidade é imediato. A segunda maior alavanca é **embeddings semânticos no memory-store** para busca cross-projeto.

---

## Referências

1. Rafailov et al. (2023). "Direct Preference Optimization." NeurIPS. arXiv:2305.18290
2. Bai et al. (2022). "Constitutional AI: Harmlessness from AI Feedback." arXiv:2212.08073
3. Yuan et al. (2024). "Self-Rewarding Language Models." arXiv:2401.10020
4. Ethayarajh et al. (2024). "KTO: Model Alignment as Prospect Theoretic Optimization." ICML. arXiv:2402.01306
5. Hong et al. (2024). "ORPO: Monolithic Preference Optimization without Reference Model." arXiv:2403.07691
6. DeepSeek-AI (2025). "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning." arXiv:2501.12948
7. Shao et al. (2024). "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models." arXiv:2402.03300 (GRPO)
8. Shinn et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." NeurIPS. arXiv:2303.11366
9. Chen et al. (2024). "Self-Play Fine-Tuning Converts Weak Language Models to Strong Language Models." arXiv:2401.01335 (SPIN)
10. Zhou et al. (2024). "Symbolic Learning Enables Self-Evolving Agents." arXiv:2406.18532
11. Shi et al. (2024). "Continual Learning of Large Language Models: A Comprehensive Survey." arXiv:2404.16789
12. Wu et al. (2024). "Continual Learning for Large Language Models: A Survey." arXiv:2402.01364
13. Zheng et al. (2025). "Towards Lifelong Learning of Large Language Models: A Survey." ACM Computing Surveys
14. Hu et al. (2021). "LoRA: Low-Rank Adaptation of Large Language Models." ICLR. arXiv:2106.09685
15. Dettmers et al. (2023). "QLoRA: Efficient Finetuning of Quantized Language Models." NeurIPS. arXiv:2305.14314
16. Xiong et al. (2024). "Iterative Preference Learning from Human Feedback." ICML. arXiv:2312.11456
17. Guo et al. (2024). "Direct Language Model Alignment from Online AI Feedback." arXiv:2402.04792 (Online DPO)
