# Template de Análise Permanente — IDEIA

> **Propósito:** Template obrigatório para TODO estudo de tecnologia, pesquisa ou feature.
> **Metodologia:** 4 fases (Pesquisa → Matriz de Viabilidade → Artefatos → Ciclo de Vida)
> **Pontuação:** 5 dimensões ponderadas

---

## Fase 1: Pesquisa

### 1.1 Contexto
- **Problema:** [O que estamos tentando resolver?]
- **Público:** [Quem será impactado?]
- **Restrições:** [Orçamento, tempo, compatibilidade, stack atual]

### 1.2 Tecnologias/Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| [Nome] | [Framework/DB/Tool] | [Breve descrição] | [Madura/Emergente/Experimental] | [Licença] |

### 1.3 Pesquisa Realizada
- [Artigos, papers, benchmarks consultados]
- [Projetos similares que usam a tecnologia]

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3× | | | Resolve o problema central? |
| **Diferenciação** | 2× | | | Nos diferencia da concorrência? |
| **Sinergia** | 2× | | | Compatível com stack existente? |
| **Custo-Benefício** | 2× | | | Custo de implementação vs benefício? |
| **Maturidade** | 1× | | | Estável para produção? |
| **Total** | 10× | | **/50** | |

**Score ≥ 3.5 → gera TASK-IDEIA-* obrigatoriamente**
**Score < 3.5 → arquivar em DECISAO.md com justificativa**

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| [Risco] | [Alta/Média/Baixa] | [Alto/Médio/Baixo] | [Mitigação] |

---

## Fase 3: Artefatos

### 3.1 Documentos Gerados
- [ ] Estudo técnico completo (`docs/ESTUDOS/`)
- [ ] ADR se aplicável (`docs/adr/ADR-xxx.md`)
- [ ] Gap documentado no `GAPS-PRODUCAO-IDE.md`
- [ ] Tasks geradas (`TASK-IDEIA-xxx`)

### 3.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| [S1-S22] | [Como se conecta] | [Alto/Médio/Baixo] |

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap
- **Fase de adoção:** [Fase 0-9]
- **Dependências:** [O que precisa existir antes]
- **Esforço estimado:** [Xh / Xd / Xsem]

### 4.2 Revisão Periódica
- **Próxima revisão:** [Data, 3 meses]
- **Critérios para arquivamento:** [Quando considerar obsoleto]
- **Critérios para reavaliação:** [Quando reabrir o estudo]

### 4.3 Decisão Final
- **Aprovado:** [Sim/Não]
- **Justificativa:** [Resumo da decisão]
- **Data:** [Data]
- **Responsável:** [Quem decidiu]

---

> **Template v1.0 — 2026-07-18**
> Este template DEVE ser seguido para todo novo estudo de tecnologia.
> Estudos já concluídos: S1-S23, E1-E5, M1.
