# Interface Architecture

## Objetivo

Definir como interfaces devem ser arquitetadas para sistemas escaláveis, consistentes e fáceis de usar.

---

## Camadas

Design tokens
↓
Base components
↓
Composite components
↓
Domain components
↓
Patterns
↓
Screens
↓
Flows

```

---

## Regras

- Telas não devem conter lógica complexa diretamente.
- Componentes visuais devem ser reutilizáveis.
- Componentes de domínio podem compor componentes base.
- Estados assíncronos devem ser padronizados.
- Validação deve ser consistente entre frontend e backend.
- Fluxos devem ter testes E2E.
- Design tokens devem evitar valores mágicos espalhados.
- Componentes devem ter responsabilidade clara.
- Telas devem orquestrar, não concentrar toda a lógica.
- Padrões devem ser reutilizados entre features.

---

## Estrutura recomendada frontend

src/
  app/
  components/
    ui/
    domain/
    layout/
    feedback/
  features/
    users/
      components/
      hooks/
      schemas/
      services/
      pages/
      tests/
  design/
    tokens/
    theme/
```

---

## Componentes por camada

### Base components

- Button
- Input
- Select
- Modal
- Toast
- Table
- Card
- Badge
- Skeleton

### Composite components

- SearchBar
- FilterPanel
- DataTable
- FormSection
- PageHeader
- EmptyState
- ErrorState
- ConfirmDialog

### Domain components

- UserForm
- UserTable
- UserStatusBadge
- UserPermissionSelector

---

## Regra

A IA deve evitar criar componentes isolados que não se encaixam na arquitetura de interface.
