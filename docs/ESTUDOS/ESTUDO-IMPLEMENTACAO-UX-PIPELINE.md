# ESTUDO-IMP-UX — Pipeline de UX: 55→75/100

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 5 (Engenharia)
> **Área:** UX, Interface
> **Dependências:** ESTUDO-UX-EXPERIENCIA-USUARIO, S56 (UX Transformation)
> **Conexões:** ESTUDO-IMP-QUALIDADE, ESTUDO-IMP-i18n, S34-S52 (Theia Platform)
> **Propósito:** Pipeline de melhoria de UX — loading states, empty states, error states, acessibilidade WCAG, onboarding, NPS/SUS, dark mode, e i18n.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

UX score: **55/100**. QUALITY-IMPROVEMENT-PLAN.md lista 10 itens de melhoria:

| Item | Status | Gap |
|------|--------|-----|
| Loading states | ❌ Ausente | Usuário não sabe se algo carrega |
| Empty states | ❌ Ausente | Telas em branco confundem |
| Error states | ❌ Ausente | Erros sem ação de retry |
| Acessibilidade WCAG | ⚠️ Parcial | axe-core não integrado ao CI |
| Onboarding | ✅ Completo | Wizard 5 passos funcional |
| Command palette | ✅ Existente | Melhorias possíveis |
| Shortcuts visíveis | ⚠️ Parcial | Sem shortcut viewer |
| NPS Survey | ❌ Ausente | Sem feedback de usuário |
| i18n | ❌ Ausente | Apenas português |
| Dark mode | ❌ Ausente | Tema único |

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| WCAG | Web Content Accessibility Guidelines |
| NPS | Net Promoter Score — lealdade do usuário |
| SUS | System Usability Scale — usabilidade percebida |
| Loading State | Indicador visual de carregamento (spinner/skeleton) |
| Empty State | Tela informativa quando não há dados |
| Error State | Tela de erro com ação (retry/contact) |
| Skeleton Screen | Placeholder visual durante carregamento |

### 1.3 Pipeline de UX

```
┌──────────────────────────────────────────────────────┐
│                 UX PIPELINE                            │
├──────────────────────────────────────────────────────┤
│                                                       │
│  PR (se afeta UI)                                    │
│  ├─ axe-core check (0 violations)                    │
│  ├─ a11y-scanner                                     │
│  └─ screenshot diff (visual regression)              │
│                                                       │
│  Release                                             │
│  ├─ Lighthouse scores (performance + a11y)           │
│  ├─ NPS survey trigger                               │
│  └─ i18n completeness check                          │
│                                                       │
│  Sprint (trimestral)                                 │
│  ├─ SUS survey                                       │
│  ├─ Usability testing (5 users)                      │
│  ├─ task completion rate ≥ 90%                       │
│  └─ time-to-task < 2min                              │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 2. ENGENHARIA

### 2.1 Plano de Ação

| # | Ação | Esforço | Entregável |
|---|------|---------|------------|
| 1 | Loading states em todos os widgets | 8h | Skeleton/spinner em todo async |
| 2 | Empty states (zero data → útil) | 4h | Empty state em toda lista |
| 3 | Error states com ação (retry/contact) | 4h | Error boundary + retry |
| 4 | Auditoria WCAG + axe-core no CI | 16h | axe-core 0 violations |
| 5 | Shortcut viewer + config | 4h | Ctrl+K → shortcuts panel |
| 6 | NPS survey in-app | 4h | Feedback modal |
| 7 | SUS survey automático | 2h | Survey trimestral |
| 8 | Dark mode + theme switcher | 8h | Theme toggle |
| 9 | Visual regression testing | 8h | Chromatic/Percy |

### 2.2 Componentes UX

```typescript
// Loading State Component (React)
const LoadingSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="skeleton" role="status" aria-label="Loading">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton-line" style={{ animationDelay: `${i * 0.1}s` }} />
    ))}
  </div>
);

// Empty State Component
const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, description, action }) => (
  <div className="empty-state" role="status">
    <span className="empty-icon">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <button onClick={action.onClick}>{action.label}</button>}
  </div>
);

// Error State Component
const ErrorState: React.FC<{
  error: Error;
  onRetry?: () => void;
  onContact?: () => void;
}> = ({ error, onRetry, onContact }) => (
  <div className="error-state" role="alert">
    <span className="error-icon">⚠️</span>
    <h3>Something went wrong</h3>
    <p className="error-message">{error.message}</p>
    <div className="error-actions">
      {onRetry && <button onClick={onRetry}>Retry</button>}
      {onContact && <button onClick={onContact}>Contact Support</button>}
    </div>
  </div>
);
```

### 2.3 NPS/SUS Pipeline

```typescript
// packages/ux-metrics/src/survey.ts
class UXSurvey {
  async triggerNPS(userId: string): Promise<void> {
    // Trigger após 5 ações ou 1h de uso
    await this.notification.send(userId, {
      type: 'nps-survey',
      question: 'How likely are you to recommend IDEIA to a colleague?',
      scale: 0-10,
      followUp: 'What is the main reason for your score?',
    });
  }

  async calculateNPS(period: 'weekly' | 'monthly'): Promise<NPSScore> {
    const responses = await this.getResponses(period);
    const promoters = responses.filter(r => r.score >= 9).length;
    const detractors = responses.filter(r => r.score <= 6).length;
    const total = responses.length;
    
    return {
      score: ((promoters - detractors) / total) * 100,
      promoters: (promoters / total) * 100,
      passives: ((total - promoters - detractors) / total) * 100,
      detractors: (detractors / total) * 100,
      totalResponses: total,
      period,
    };
  }

  async calculateSUS(): Promise<SUSScore> {
    // 10 questions, each 1-5
    const responses = await this.getSUSResponses();
    let total = 0;
    for (const r of responses) {
      // Odd questions: score - 1
      // Even questions: 5 - score
      total += r.questionIndex % 2 === 0 ? r.score - 1 : 5 - r.score;
    }
    const susScore = (total / responses.length) * 2.5; // 0-100
    
    return {
      score: susScore,
      rating: this.rateSUS(susScore),
      percentile: this.getPercentile(susScore),
    };
  }
}
```

---

## 3. MÉTRICAS DE SUCESSO

| Métrica | Atual | Alvo 30d | Alvo 90d |
|---------|-------|----------|----------|
| UX score | 55/100 | 65/100 | 75/100 |
| axe-core violations | — | 0 | 0 |
| Loading states | 0% | 80% | 100% |
| Empty states | 0% | 80% | 100% |
| Error states | 0% | 80% | 100% |
| NPS | — | > 30 | > 50 |
| SUS | — | > 60 | > 70 |
| Time-to-task | — | < 5min | < 2min |
| Dark mode | ❌ | ✅ | ✅ |
| Shortcut viewer | ❌ | ✅ | ✅ |

---

> **Score de Maturidade:** 65/100 ✅
> **Próximo passo:** Implementar loading/empty/error states (16h)
