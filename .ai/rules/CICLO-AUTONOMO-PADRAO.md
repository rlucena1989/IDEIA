# Ciclo Autônomo Padrão — IDEIA

> **Versão:** 1.0 — 2026-07-24
> **Status:** ⚡ Regra Universal — TODO modelo de IA DEVE seguir este ciclo.
> **Propósito:** Pipeline completo e autônomo que transforma qualquer entrada (ideia, problema, tarefa, feature request) em implementação validada, sem necessidade de intervenção humana para decidir o próximo passo.
> **Integração:** Reality-Sync, Quality Gates, Gap Analysis, Agent Runtime, CLI

---

## 1. O Ciclo Completo (Visão Geral)

```
ENTRADA (humano ou plataforma)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO AUTÔNOMO PADRÃO (CAP)                    │
│                                                                   │
│  F1 ──→ F2 ──→ F3 ──→ F4 ──→ F5 ──→ F6 ──→ F7 ──→ F8 ──→ F9  │
│  │      │      │      │      │      │      │      │      │      │
│  │      │      │      │      │      │      │      │      │      │
│  Coleta  Triagem  Estudo  Aprof.  Score  Impl.  Plano  Ciclo  │
│  Info    Viabil.         Intens.  Qualif. Estudo  Real   Valid. │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
SAÍDA (código implementado, testado, documentado, revisado)
```

### Fluxo Resumido (para IAs — formato compacto)

```
<CAP-PROMPT>
ENTRADA: {descrição}
FASE_ATUAL: {fase}
PROXIMA_FASE: {calculada automaticamente}
CONTEXTO: {estudos relacionados, gaps, codebase status}
</CAP-PROMPT>
```

---

## 2. Fases do Ciclo

### F1: Coleta de Informações
**Objetivo:** Reunir TODAS as informações disponíveis sobre o tópico.

```
Trigger: Nova task, feature request, ideia, bug report, ou descoberta de gap

Ações:
[ ] Buscar fontes: documentação oficial, papers, fóruns, código existente
[ ] Identificar estudos IDEIA relacionados (grep em `docs/ESTUDOS/`)
[ ] Verificar gaps existentes (grep em `GAPS-PRODUCAO-IDE.md`)
[ ] Verificar código existente (grep em `packages/`)
[ ] Coletar métricas: maturidade, adoção, performance, segurança
[ ] Registrar descobertas em `docs/governance/CAP-COLETA-{id}.md`

Critério de saída: Mínimo 3 fontes de qualidade consultadas
Responsável: IA (modo exploratório)
```

### F2: Triagem e Análise de Viabilidade
**Objetivo:** Decidir se vale a pena investir no estudo/implementação.

```
Ações:
[ ] Aplicar Matriz de Viabilidade (6 dimensões ponderadas)
[ ] Calcular Score de Viabilidade (0-5)
[ ] Se score ≥ 3.5: gerar TASK de implementação
[ ] Se score ≥ 4.0: gerar TASK + ADR
[ ] Se score < 3.5: arquivar em DECISAO.md com justificativa
[ ] Registrar decisão em `docs/adr/CAP-VIABILIDADE-{id}.md`

Matriz de Viabilidade (6 dimensões):
| Dimensão                     | Peso | Score (0-5) |
|------------------------------|------|-------------|
| Valor de Negócio             | 3×   |             |
| Diferenciação Competitiva    | 2×   |             |
| Sinergia com Stack Existente | 2×   |             |
| Custo-Benefício              | 2×   |             |
| Maturidade Técnica           | 1×   |             |
| Aderência à Visão IDEIA      | 1×   |             |

Critério de saída: Decisão documentada (continuar ou arquivar)
Responsável: IA (modo analista)
```

### F3: Realização do Estudo
**Objetivo:** Criar estudo completo seguindo template v3.0.

```
Ações:
[ ] Criar documento em `docs/ESTUDOS/ESTUDO-{ID}-{TITULO}.md`
[ ] Seguir template v3.0 (8 seções obrigatórias)
[ ] Atingir nível mínimo de profundidade (mínimo 4/12 para aprovação)
[ ] Incluir: código, diagramas, comparações, referências
[ ] Conectar com estudos existentes (seção de conexões)
[ ] Submeter a revisão entre pares (simulada pela IA)

Template mínimo por nível:
| Nível | Seções Obrigatórias | Linhas Mín | Código Mín |
|-------|--------------------|-----------|-------------|
| 1-3   | Fundamentos + Técnico | 150 | 3 snippets |
| 4-6   | + Engenharia        | 400 | 3 classes  |
| 7-9   | + Inovação + Pesquisa | 850 | 10 classes |
| 10-12 | + Fronteiras        | 1400 | 18 classes |

Critério de saída: Estudo criado e registrado no document-registry.md
Responsável: IA (modo pesquisador/arquiteto)
```

### F4: Intensificação e Aprofundamento
**Objetivo:** Expandir o estudo além do mínimo, adicionando inovação e pesquisa.

```
Ações:
[ ] Verificar se há tópicos dentro do estudo que podem ser extraídos como NOVOS estudos
[ ] Se sim: extrair e adicionar ao backlog (voltar para F1)
[ ] Aprofundar níveis 7-12: adicionar inovação, experimentos, fronteiras
[ ] Adicionar referências acadêmicas (mínimo: 2 × nível do estudo)
[ ] Realizar experimentos/PoCs quando aplicável
[ ] Aplicar Matriz de Originalidade:
     ┌─────────────────┬─────────────────┐
     │                 │ Convencional    │ Nova             │
     ├─────────────────┼─────────────────┼─────────────────┤
     │ Problema Conhec │ Melhoria (+++)  │ Aplicação (++++ │
     │ Problema Novo   │ Extensão (+++++ │ Inovação (+++++ │
     └─────────────────┴─────────────────┴─────────────────┘

Critério de saída: Estudo atinge nível 7+ OU identificação de extrações
Responsável: IA (modo intensificador/pesquisador)
```

### F5: Score de Qualidade e Maturidade
**Objetivo:** Avaliar objetivamente a qualidade do estudo.

```
Ações:
[ ] Calcular Score de Maturidade (0-100):
     coverage (20%) + depth (25%) + code (15%) + 
     references (10%) + integration (10%) + 
     innovation (10%) + applicability (10%)

[ ] Gatilhos automáticos:
     score ≥ 90: ✅ AVALIAR IMPLEMENTAÇÃO → F6
     score ≥ 75: ✅ Publicar como referência
     score ≥ 50: ✅ Aprovado (mínimo aceitável)
     score < 50: ❌ Retornar para F4 (intensificar)

[ ] Se score ≥ 90: avaliar viabilidade de implementação (F6)

Critério de saída: Score documentado e decisão tomada
Responsável: IA (modo auditor)
```

### F6: Estudo de Implementação Direcionado para IDEIA
**Objetivo:** Criar estudo focado em COMO implementar no ecossistema IDEIA.

```
Ações:
[ ] Mapear packages e arquivos que serão afetados
[ ] Definir interfaces e contratos (Zod schemas)
[ ] Definir integração com NATS (eventos, subjects, streams)
[ ] Definir contribution points (Theia widgets, comandos CLI)
[ ] Estimar esforço (em horas/dias) por componente
[ ] Identificar dependências entre componentes
[ ] Definir critérios de aceitação para cada componente
[ ] Registrar em `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-{ID}.md`

Estrutura mínima do estudo de implementação:
1. Estado atual (o que existe hoje)
2. Arquitetura alvo (diagrama)
3. Plano de implementação (passo a passo com esforço)
4. Interface e contratos (tipos, schemas, eventos)
5. Dependências e riscos
6. Critérios de aceitação

Critério de saída: Estudo de implementação aprovado pelo arquiteto
Responsável: IA (modo arquiteto/engenheiro)
```

### F7: Plano de Implementação Real
**Objetivo:** Criar plano detalhado e acionável para desenvolvimento.

```
Ações:
[ ] Criar tasks em TASKS-IMPLEMENTACAO-DIRETA.md
[ ] Estimar esforço real (considerando integrações, testes, docs)
[ ] Definir ordem de implementação (dependências entre tasks)
[ ] Identificar riscos e mitigações
[ ] Definir critérios de aceite por task
[ ] Associar a fase do roadmap (Fase 0-9)

Template de task:
| ID | Descrição | Esforço | Dependência | Critério de Aceite | Package | Risco |
|----|-----------|---------|-------------|-------------------|---------|-------|
| T-001 | [desc] | [Xh] | [nenhuma] | [critério] | [package] | [baixo] |

Critério de saída: Tasks registradas e priorizadas
Responsável: IA (modo planner/devops)
```

### F8: Ciclo de Validação e Correção
**Objetivo:** Implementar, testar, corrigir até 100% funcional.

```
Loop até estabilidade total:
  ┌──────────────────────────────────────────────┐
  │  1. IMPLEMENTAR: código completo da task     │
  │  2. TESTAR ISOLADO: testes unitários passam  │
  │  3. TESTAR INTEGRADO: não quebra other tests │
  │  4. REVISAR: código revisado (lint + types)  │
  │  5. AUDITAR: segurança, performance, gaps    │
  │  6. CORRIGIR: se falhou, voltar ao passo 1   │
  │  7. REVALIDAR: loop até 100% passando        │
  └──────────────────────────────────────────────┘

Gates obrigatórios por iteração:
├── G1: tsc --noEmit = 0 errors
├── G2: lint 0 errors, warnings ≤ 5
├── G3: Tests passando (unit + integration)
├── G4: Contract tests (se aplicável)
├── G5: Security scan (secrets, injection)
└── G6: Gap analysis (GAPS-PRODUCAO-IDE.md atualizado)

Critério de saída: Todas as tasks implementadas, testadas, revisadas
Responsável: IA (modo programador/tester/reviewer)
```

### F9: Estabilização Total
**Objetivo:** Garantir que tudo funciona em conjunto e está pronto para produção.

```
Ações:
[ ] tsconfig strict mode habilitado
[ ] ESLint sem erros, warnings < 2000
[ ] All tests passando (npm run test:all)
[ ] Documentação atualizada (README, API, exemplos)
[ ] CHANGELOG atualizado
[ ] GAPS-PRODUCAO-IDE.md atualizado (gaps resolvidos marcados)
[ ] document-registry.md atualizado
[ ] REALITY-MANIFEST.md atualizado
[ ] ADR registrado (se aplicável)
[ ] Quality gates verdes (G1-G4)

Métricas de estabilidade:
- Cobertura ≥ 80% (unit)
- Testes de integração passando (100%)
- Build time ≤ 5min
- Bundle size dentro do budget
- Performance benchmarks dentro do SLO

Critério de saída: Sistema estável e pronto para merge/release
Responsável: IA (modo devops/qualidade)
```

---

## 3. Gatilhos de Transição Automática

| Fase | Gatilho para Avançar | Gatilho para Recuar | 
|------|----------------------|---------------------|
| F1 → F2 | Mínimo 3 fontes consultadas | Fontes insuficientes |
| F2 → F3 | Score ≥ 3.5 | Score < 3.5 → ARQUIVAR |
| F3 → F4 | Estudo criado (nível ≥ 4) | Nível < 4 → F3 |
| F4 → F5 | Estudo atinge nível 7 OU extrações identificadas | Nível < 7 → continuar F4 |
| F5 → F6 | Score ≥ 90 | Score ≥ 75 → PUBLICAR (sem impl) |
| F5 → F3 | Score < 50 | — |
| F6 → F7 | Estudo de implementação aprovado | Incompleto → F6 |
| F7 → F8 | Tasks registradas e priorizadas | Sem tasks → F7 |
| F8 → F9 | Todas as tasks verdes (G1-G6) | Algum gate vermelho → F8 |
| F9 → FIM | Estabilidade total comprovada | Degradação → F8 |

---

## 4. Integração com o Ecossistema IDEIA

### 4.1 Reality-Sync Hook

```typescript
// RealitySyncDaemon detecta mudanças e aciona o ciclo
class CAPOrchestrator {
  async onTrigger(source: 'human' | 'platform' | 'gap_detected', data: any): Promise<void> {
    // Registrar início
    await this.auditTrail.record({ phase: 'F1', source, data });

    // Executar ciclo
    const result = await this.executeCycle(data);

    // Atualizar manifestos
    await this.updateManifests(result);

    // Notificar
    await this.nats.publish('cap.cycle.complete', result);
  }

  async executeCycle(input: any): Promise<CAPResult> {
    let phase = 'F1';
    let result: CAPResult = { phases: {} };

    while (phase !== 'DONE') {
      const phaseResult = await this.executePhase(phase, input);
      result.phases[phase] = phaseResult;
      phase = this.computeNextPhase(phase, phaseResult);
      await this.auditTrail.record({ phase, result: phaseResult });
    }

    return result;
  }
}
```

### 4.2 CLI Integration

```bash
# Gatilho humano
IDEIA cap "implementar cache distribuído"     # Inicia ciclo completo
IDEIA cap status                              # Status do ciclo atual
IDEIA cap advance                             # Força avanço para próxima fase
IDEIA cap rollback                            # Retorna para fase anterior

# Gatilho plataforma (autônomo)
# RealitySyncDaemon detecta gap → CAPOrchestrator.onTrigger('gap_detected')
```

### 4.3 NATS Events

```typescript
// Eventos publicados durante o ciclo
const CAP_EVENTS = {
  'cap.phase.start':     { phase: string, input: any },
  'cap.phase.complete':  { phase: string, result: PhaseResult },
  'cap.cycle.complete':  { result: CAPResult },
  'cap.quality_gate':    { gate: string, passed: boolean },
  'cap.task.created':    { task: Task },
  'cap.study.created':   { study: string },
};
```

---

## 5. Regras para IAs

### 5.1 Regra Universal

> **TODO modelo de IA, ao receber uma tarefa, DEVE:**
> 1. Identificar em qual fase do CAP a tarefa se encontra
> 2. Executar a fase atual completamente
> 3. Calcular a próxima fase baseada nos gatilhos
> 4. Avançar automaticamente — NUNCA perguntar "o que fazer agora"
> 5. Se houver ambiguity, usar a fase mais conservadora (mais pesquisa)

### 5.2 Formato de Comunicação

```markdown
<CAP>
FASE_ATUAL: F3
PROXIMA: F4
PROGRESSO: 60%
SCORE: 78/100
GAPS: ["referências insuficientes", "sem código"]
PRÓXIMA_AÇÃO: "Adicionar 3 referências acadêmicas e expandir seção de código"
</CAP>
```

### 5.3 Níveis de Autonomia

| Nível | Decisão | Ação |
|-------|---------|------|
| **N0 Assistido** | Humano decide | IA executa e reporta |
| **N1 Supervisionado** | Humano aprova | IA propõe, humano confirma |
| **N2 Semi-autônomo** | IA decide com limites | IA avança, reporta ao final |
| **N3 Autônomo** | IA decide | IA executa ciclo completo |
| **N4 Total** | IA define prioridades | IA gerencia backlog e executa |

---

## 6. Métricas de Saúde do Ciclo

| Métrica | Alvo | Monitoramento |
|---------|------|--------------|
| Tempo médio F1→F9 | ≤ 5 dias | Audit trail |
| Taxa de aprovação F2 | ≥ 60% | Decisões de viabilidade |
| Score médio F5 | ≥ 75 | Quality dashboard |
| Taxa de retrabalho F8 | ≤ 20% | Loops de correção |
| Estudos extraídos por ciclo | ≥ 0.5 | Novos estudos gerados |
| Tasks implementadas/semana | ≥ 3 | Velocity tracking |

---

## 7. Referências e Inspiração

| Fonte | Conceito Aplicado |
|-------|------------------|
| **Microsoft SDL** | Security gates em cada fase |
| **Google Testing Maturity** | Quality gates progressivos |
| **Amazon PR/FAQ** | Documentação antes de implementação |
| **Anthropic Constitutional AI** | Auto-regulagem do ciclo |
| **NIST SP 800-37** | Risk management framework |
| **DevOps (Gene Kim)** | Three ways: flow, feedback, learning |
| **IDEIA GAPS** | Ciclo integrado ao reality-sync |

---

> ⚠️ **Esta é uma REGRA UNIVERSAL.**
> Todo modelo de IA, de qualquer ferramenta (Claude Code, Cursor, Copilot, Windsurf),
> DEVE seguir este ciclo ao receber uma tarefa no projeto IDEIA.
> O ciclo substitui a necessidade de perguntar "o que fazer?" — a resposta está explícita aqui.
