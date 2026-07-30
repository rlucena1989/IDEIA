# Metodologia de Estudos IDEIA — v3.0

> **Data:** 2026-07-24
> **Versão:** 3.0 (substitui v2.0)
> **Propósito:** Nova metodologia unificada para criação, avaliação e expansão de todos os estudos IDEIA. Define critérios objetivos de profundidade, métodos de pesquisa, padrões de qualidade e métricas de maturidade.
> **Aplicação:** Obrigatória para TODO novo estudo. Estudos existentes devem ser migrados progressivamente.

---

## 1. Níveis de Profundidade (Nova Escala 1-12)

A escala anterior (1-10) é expandida para 1-12 para melhor granularidade nos níveis mais altos:

```
Nível 1-2:   FUNDAMENTOS      — Conceitos básicos, glossário, definições
Nível 3-4:   TÉCNICO          — Arquitetura, exemplos, padrões, anti-patterns
Nível 5-6:   ENGENHARIA       — CI/CD, testes, produção, segurança, performance
Nível 7-8:   INOVAÇÃO         — Estado da arte, experimentos, protótipos
Nível 9-10:  PESQUISA         — Papers, algoritmos, implementações de ponta
Nível 11-12: FRONTEIRAS       — Problemas em aberto, novas fronteiras, gaps de pesquisa
```

### Critérios Objetivos por Nível

| Nível | Critérios Mínimos | Linhas Mínimas | Código Mínimo | Referências |
|-------|-------------------|----------------|---------------|-------------|
| 1 | Definições, contexto, problema | 30 | 0 | 0 |
| 2 | Exemplos simples, diagramas | 80 | 1 snippet | 2 |
| 3 | Arquitetura detalhada, componentes | 150 | 3 snippets | 4 |
| 4 | Padrões de design, comparações | 250 | 5 snippets | 6 |
| 5 | CI/CD, testes, configuração | 400 | 3 classes | 8 |
| 6 | Produção, segurança, performance | 550 | 5 classes | 10 |
| 7 | Experimentos, protótipos | 700 | 8 classes | 12 |
| 8 | Benchmarks, otimizações | 850 | 10 classes | 15 |
| 9 | Algoritmos de pesquisa, papers | 1000 | 12 classes | 20 |
| 10 | Implementações de fronteira | 1200 | 15 classes | 25 |
| 11 | Problemas em aberto | 1400 | 18 classes | 30 |
| 12 | Novas fronteiras, gaps de pesquisa | 1600+ | 20+ classes | 35+ |

---

## 2. Estrutura Obrigatória de Cada Estudo

### 2.1 Template Padrão

```markdown
# ESTUDO-{ID} — {Título Completo}

> **Data:** {data}
> **Versão:** {versão}
> **Nível de Profundidade:** {1-12}
> **Área:** {categoria}
> **Dependências:** {estudos pré-requisito}
> **Conexões:** {estudos relacionados}
> **Propósito:** {resumo executivo}

---

## 1. FUNDAMENTOS (Nível 1-2)

### 1.1 Problema e Contexto
- O que estamos resolvendo?
- Por que isso é importante para IDEIA?
- Quem é impactado?
- Quais as restrições?

### 1.2 Glossário
| Termo | Definição |
|-------|-----------|
| {termo} | {definição precisa} |

### 1.3 Arquitetura de Alto Nível
[Diagrama ASCII ou Mermaid da arquitetura]

---

## 2. TÉCNICO (Nível 3-4)

### 2.1 Arquitetura Detalhada
[Componentes, fluxos, interfaces]

### 2.2 Algoritmos e Estruturas
[Pseudocódigo, TypeScript/Rust]

### 2.3 Padrões de Design
[Padrões utilizados com justificativa]

### 2.4 Anti-Patterns
[O que NÃO fazer]

### 2.5 Comparação com Alternativas
| Abordagem | Prós | Contras | Aplicabilidade |
|-----------|------|---------|----------------|

---

## 3. ENGENHARIA (Nível 5-6)

### 3.1 Implementação para Produção
[Arquitetura de pacotes, interfaces, injeção de dependência]

### 3.2 CI/CD e Qualidade
[Pipeline de build, testes, qualidade gates]

### 3.3 Segurança
[Threat model, validação, audit]

### 3.4 Performance
[Benchmarks, profiling, otimizações]

### 3.5 Observabilidade
[Métricas, tracing, logging, alertas]

### 3.6 Estudos de Caso
[Implementações reais no código IDEIA]

---

## 4. INOVAÇÃO (Nível 7-8)

### 4.1 Estado da Arte
[Últimos 2 anos de pesquisa, ferramentas, tendências]

### 4.2 Experimentos e Protótipos
[Código experimental, PoCs, resultados]

### 4.3 Benchmarks e Métricas
[Dados quantitativos de performance, qualidade]

### 4.4 Integração com Ecossistema IDEIA
[Como se conecta a outros estudos/packages]

### 4.5 Diferenciação Competitiva
[O que nos torna únicos vs concorrentes]

---

## 5. PESQUISA (Nível 9-10)

### 5.1 Revisão Bibliográfica
| Paper | Ano | Contribuição | Relevância para IDEIA |
|-------|-----|-------------|----------------------|
| {título} | {ano} | {resumo} | {aplicação} |

### 5.2 Algoritmos Avançados
[Implementações de ponta, equações, provas]

### 5.3 Trabalhos Correlatos
[O que outros pesquisadores/grupos estão fazendo]

### 5.4 Experimentos Controlados
[Setup, hipóteses, resultados, análise estatística]

---

## 6. FRONTEIRAS (Nível 11-12)

### 6.1 Problemas em Aberto
| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|

### 6.2 Limitações Fundamentais
[O que a tecnologia atual não consegue resolver]

### 6.3 Hipóteses e Novos Paradigmas
[Ideias para romper barreiras atuais]

### 6.4 Roteiro de Pesquisa
| Horizonte | Tópico | Esforço Estimado | Risco |
|-----------|--------|------------------|-------|

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe no Codebase
[Status atual dos packages relevantes]

### 7.2 Plano de Implementação
| Passo | Descrição | Esforço | Dependência | Entregável |
|-------|-----------|---------|-------------|------------|

### 7.3 Integração com Ecossistema
[Diagrama de como se conecta ao sistema maior]

### 7.4 Métricas de Sucesso
| Métrica | Atual | Alvo | Prazo | Ferramenta |
|---------|-------|------|-------|------------|

### 7.5 Riscos e Mitigações
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|

---

## 8. REFERÊNCIAS

### 8.1 Documentação Oficial
- [links]

### 8.2 Artigos Científicos
- [links, DOI]

### 8.3 Fóruns Técnicos e Comunidades
- [Stack Overflow, GitHub Discussions, Reddit, Discord]

### 8.4 Projetos Relacionados
- [GitHub, npm, crates.io]

---

> **Este estudo segue a metodologia v3.0 do projeto IDEIA**
```
```

---

## 3. Métodos de Pesquisa Obrigatórios

### 3.1 Fontes Mínimas por Nível

| Nível | Fontes Obrigatórias |
|-------|---------------------|
| 1-2 | Documentação oficial, 1 artigo |
| 3-4 | Docs oficiais, 2 artigos, 1 comparação |
| 5-6 | Docs, 5 artigos, benchmarks, código |
| 7-8 | Docs, 10 artigos, experimentos, PoCs |
| 9-10 | 20+ artigos, revisão bibliográfica, algoritmos |
| 11-12 | 35+ artigos, frontier analysis, gaps |

### 3.2 Hierarquia de Fontes (Qualidade)

```
Nível 1: Documentação oficial (npm, GitHub, linguagens)
Nível 2: Artigos peer-reviewed (IEEE, ACM, USENIX)
Nível 3: Proceedings de conferências (NeurIPS, ICML, ICSE)
Nível 4: arXiv / preprint servers
Nível 5: Blog posts técnicos (engenharia)
Nível 6: Fóruns (Stack Overflow, Reddit)
Nível 7: Tutorials, cursos, workshops
```

### 3.3 Critérios de Validação de Fontes

| Critério | O que verificar |
|----------|-----------------|
| **Autoridade** | O autor/organização é referência na área? |
| **Atualidade** | A informação tem menos de 2 anos? |
| **Reprodutibilidade** | Os resultados podem ser replicados? |
| **Profundidade** | A fonte trata do assunto em detalhe? |
| **Independência** | A fonte tem viés comercial? |

---

## 4. Métricas de Qualidade do Estudo

### 4.1 Score de Maturidade (0-100)

```typescript
const MATURITY_SCORE = {
  coverage:     weight: 0.20,  // Cobre todos os 6 níveis?
  depth:        weight: 0.25,  // Profundidade média dos níveis
  code:         weight: 0.15,  // Quantidade e qualidade do código
  references:   weight: 0.10,  // Quantidade e qualidade das referências
  integration:  weight: 0.10,  // Conexões com outros estudos
  innovation:   weight: 0.10,  // Contribuições originais
  applicability: weight: 0.10, // Aplicabilidade imediata na IDEIA
};
```

### 4.2 Gatilhos de Qualidade

| Score | Classificação | Ação |
|-------|-------------|------|
| 90-100 | ⭐⭐⭐⭐⭐ Referência | Publicar como referência |
| 75-89 | ⭐⭐⭐⭐ Avançado | Revisão de pares |
| 50-74 | ⭐⭐⭐ Intermediário | Expandir níveis faltantes |
| 25-49 | ⭐⭐ Básico | Necessita expansão |
| 0-24 | ⭐ Esboço | Completar estrutura mínima |

---

## 5. Processo de Revisão Entre Pares

### 5.1 Checklist de Revisão

```
[ ] A estrutura segue o template v3.0?
[ ] Todos os 6 níveis estão presentes?
[ ] O código compila/é válido?
[ ] As referências são de fontes autoritativas?
[ ] Os experimentos são reproduzíveis?
[ ] As fronteiras identificadas são originais?
[ ] O estudo está conectado a outros estudos?
[ ] A análise para IDEIA é acionável?
```

### 5.2 Critérios de Aprovação

| Nível do Estudo | Revisores | Prazo |
|-----------------|-----------|-------|
| 1-4 | 1 revisor técnico | 2 dias |
| 5-8 | 2 revisores (técnico + arquitetura) | 5 dias |
| 9-10 | 3 revisores (técnico + arquitetura + pesquisa) | 10 dias |
| 11-12 | 4+ revisores + consulta externa | 15 dias |

---

## 6. Upgrade dos Estudos Existentes

### 6.1 Priorização para Migração para v3.0

| Prioridade | Critério | Estudos |
|-----------|----------|---------|
| 🔴 Imediata | T4/T5 com alto impacto | 20 estudos (ver catálogo) |
| 🟡 Curto prazo | T3 com conexões fortes | 15 estudos |
| 🟢 Médio prazo | T1/T2 (já maduros, ajustes menores) | 75 estudos |
| ⚪ Longo prazo | T5 de baixo impacto | 30 estudos |

### 6.2 Exemplo de Upgrade Aplicado

```diff
- ESTUDO-D19-NATIVE-FILE-DIALOGS.md (61 linhas, Nível 2)
+ Upgrade para:
+ 1. FUNDAMENTOS: Glossário, contexto, problema (✓)
+ 2. TÉCNICO: Electron+Tauri implementação completa (✓) 
+ 3. ENGENHARIA: CI/CD, cross-platform, acessibilidade (✓)
+ 4. INOVAÇÃO: File System Access API, drag-and-drop (✓)
+ 5. PESQUISA: Performance benchmarks, comparação nativo vs web (✓)
+ 6. FRONTEIRAS: Picker customizado, WebKit limits (✓)
```

---

## 7. Framework de Inovação

### 7.1 Matriz de Originalidade

```
                ABORDAGEM
           Convencional  Nova
     ┌────────────┬────────────┐
 CONHECIDO │  Melhoria  │  Aplicação  │
           │  (+++)     │  (++++)     │
 PROBLEMA  ├────────────┼────────────┤
 NOVO      │  Extensão  │  Inovação   │
           │  (++++)    │  (+++++)    │
           └────────────┴────────────┘
```

Cada estudo deve classificar sua contribuição:
- **Melhoria** (+++): Abordagem conhecida para problema conhecido, mas melhor
- **Aplicação** (++++): Abordagem nova para problema conhecido
- **Extensão** (++++): Abordagem conhecida para problema novo
- **Inovação** (+++++): Abordagem nova para problema novo

### 7.2 Taxonomia de Inovação

| Tipo | Descrição | Exemplo no IDEIA |
|------|-----------|------------------|
| **Arquitetural** | Nova forma de organizar componentes | Camada de abstração IShell |
| **Algorítmica** | Novo algoritmo para problema existente | PPO para planning strategy |
| **Integração** | Combinação inédita de tecnologias | NATS + Event Sourcing + CQRS |
| **Aplicação** | Aplicação de tecnologia em novo domínio | GANs para red teaming de LLMs |
| **Processo** | Novo método/fluxo de trabalho | Quality Gates adaptativos com ML |

---

## 8. Padrões de Código

### 8.1 Linguagens Permitidas

| Linguagem | Uso | Padrão |
|-----------|-----|--------|
| TypeScript | Implementação principal | Strict mode, sem `any` |
| Rust | Performance crítica | 2024 edition, clippy |
| SQL | Queries complexas | ANSI SQL + extensões |
| Python | Scripts de ML/benchmark | Type hints, black |
| Bash/PowerShell | Scripts CI | Cross-platform |

### 8.2 Critérios de Qualidade de Código

```
[ ] Compila sem erros (tsc --noEmit)
[ ] Sem any (strict mode)
[ ] Testes unitários (≥80% cobertura)
[ ] Tratamento de erros (try/catch, Result type)
[ ] Logging estruturado
[ ] Documentação inline (JSDoc)
[ ] Sem secrets hardcoded
```

---

## 9. Template de Upgrade Rápido (para estudos T4/T5)

Para estudos com <200 linhas, o upgrade mínimo para v3.0 requer:

```markdown
## Upgrade para v3.0

### Status atual
- Nível: X/12
- Linhas: Y
- Gaps identificados: [lista]

### Plano de expansão
1. Adicionar seção 2 (Técnico): [escopo]
2. Adicionar seção 3 (Engenharia): [escopo]
3. Adicionar seção 6 (Fronteiras): [escopo]

### Referências a adicionar
- [fonte 1]
- [fonte 2]
```

---

## 10. Referências Metodológicas

1. "Design Science Research in Information Systems" — Hevner et al., 2004
2. "Grounded Theory Methodology" — Glaser & Strauss, 1967
3. "Systematic Literature Reviews" — Kitchenham, 2004
4. "The Structure of Scientific Revolutions" — Kuhn, 1962
5. "Pasteur's Quadrant: Basic Science and Technological Innovation" — Stokes, 1997

---

> **v3.0 — Metodologia oficial de estudos IDEIA**
> **Data de vigência:** 2026-07-24
> **Estudos que já seguem v3.0:** (em migração)
