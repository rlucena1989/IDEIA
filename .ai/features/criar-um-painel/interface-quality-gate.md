# Interface Quality Gate — Feature: Criar um Painel

Checklist de qualidade visual/UX específico desta feature, derivado de
`.ai/quality/interface-quality-gate.md` (gate genérico do projeto).

- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessibilidade WCAG 2.1 AA verificada
- [ ] Lighthouse score > 90 na página do painel
- [ ] Estados visuais consistentes com `ux-pattern-catalog.yaml`

## Como validar
```bash
npx lighthouse <url-do-painel> --view
```
Anexar o resultado real do Lighthouse antes de marcar qualquer item acima.
