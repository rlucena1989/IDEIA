---

## Integração com UI/UX Intelligence Engine

Quando a feature envolver interface de usuário, o Feature Intelligence Engine deve obrigatoriamente chamar o fluxo de UI/UX:

Feature detectada
  ↓
Detectar tipo de tela
  ↓
Consultar ux-pattern-catalog.yaml
  ↓
Gerar UI Feature Checklist
  ↓
Aplicar design-system.md
  ↓
Aplicar interface-quality-gate.md
  ↓
Gerar testes E2E/acessibilidade
```

---

## Exemplo

Pedido:

> Criar tela de cadastro de usuário

O ai-devkit deve gerar não apenas campos e endpoint, mas também:

- Layout recomendado.
- Hierarquia visual.
- Estados.
- Microcopy.
- Responsividade.
- Acessibilidade.
- Testes E2E.
- Critérios visuais.
- Checklist de qualidade de interface.