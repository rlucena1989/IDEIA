# Feature Development Protocol

## Objetivo

Definir o fluxo obrigatório para transformar um pedido humano em uma funcionalidade funcionando de ponta a ponta.

---

## Fluxo obrigatório

Pedido humano
↓
Clarificação
↓
Classificação da feature
↓
Análise de UX/UI, negócio, arquitetura e segurança
↓
Plano de implementação
↓
Matriz de testes
↓
Context pack
↓
Implementação
↓
Verificação local
↓
Auditoria
↓
Atualização de memória/handoff
↓
Entrega final

````

---

## 1. Clarificação

A IA deve identificar ambiguidades antes de implementar.

Se houver informação suficiente, deve seguir com hipóteses explícitas.

Se faltar informação crítica, deve perguntar.

---

## 2. Classificação

Usar:

```bash
ai-devkit feature analyze "<pedido>"
````

---

## 3. Análise de impacto

Identificar:

- Módulos afetados.
- Contratos afetados.
- Banco afetado.
- Telas afetadas.
- Testes afetados.
- Riscos.
- Dependências.
- Impacto em UX.
- Impacto em acessibilidade.
- Impacto em segurança.

---

## 4. UI/UX

Se houver interface de usuário, aplicar obrigatoriamente:

- `.ai/architecture/ui-ux-intelligence-engine.md`
- `.ai/design/design-system.md`
- `.ai/design/interface-quality-gate.md`
- `.ai/design/ux-pattern-catalog.yaml`
- `.ai/design/interface-architecture.md`
- `.ai/design/visual-excellence-protocol.md`
- `.ai/design/product-ux-principles.md`

---

## 5. Implementação

A IA deve seguir os padrões do adapter detectado.

---

## 6. Verificação

Rodar:

```bash
ai-devkit verify
ai-devkit audit
ai-devkit status
```

---

## 7. Entrega

A funcionalidade só pode ser considerada pronta se cumprir a Definition of Done.
