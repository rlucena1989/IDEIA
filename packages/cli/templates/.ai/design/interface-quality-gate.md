# Interface Quality Gate

## Objetivo

Bloquear ou sinalizar interfaces que funcionam tecnicamente, mas falham em usabilidade, acessibilidade ou refinamento visual.

---

## Checklist obrigatório

### Estrutura

- [ ] A tela tem objetivo claro.
- [ ] A ação primária é óbvia.
- [ ] A hierarquia visual guia o olhar.
- [ ] Elementos relacionados estão agrupados.
- [ ] Há consistência com o restante do sistema.
- [ ] O usuário entende a tela em até 5 segundos.

---

### Estados

- [ ] Loading.
- [ ] Skeleton.
- [ ] Empty.
- [ ] Error.
- [ ] Success.
- [ ] Disabled.
- [ ] Validation.
- [ ] Permission denied, se aplicável.
- [ ] Offline/degraded, se aplicável.

---

### Formulários

- [ ] Labels claros.
- [ ] Mensagens de erro específicas.
- [ ] Validação no momento adequado.
- [ ] Dados não são perdidos após erro.
- [ ] Campo obrigatório é indicado.
- [ ] Submit possui loading.
- [ ] Duplo submit é prevenido.
- [ ] Campos são agrupados por sentido.

---

### Acessibilidade

- [ ] Contraste adequado.
- [ ] Navegação por teclado.
- [ ] Foco visível.
- [ ] Labels associados.
- [ ] Não depende apenas de cor.
- [ ] Componentes interativos têm tamanho adequado.
- [ ] Ordem de leitura é lógica.
- [ ] Movimento reduzido é respeitado quando possível.

---

### Responsividade

- [ ] Mobile.
- [ ] Tablet.
- [ ] Desktop.
- [ ] Telas largas.
- [ ] Elementos não quebram.
- [ ] Ações continuam acessíveis.
- [ ] Layout mantém hierarquia visual.

---

### Visual refinement

- [ ] Espaçamentos seguem escala.
- [ ] Tipografia é consistente.
- [ ] Cores têm função clara.
- [ ] Ícones ajudam compreensão.
- [ ] Animações são discretas.
- [ ] Layout não parece genérico ou desalinhado.
- [ ] Há ritmo visual.
- [ ] Há respiro entre seções.
- [ ] A tela parece produto final, não protótipo.

---

### Microcopy

- [ ] Textos são humanos.
- [ ] Mensagens são acionáveis.
- [ ] Erros não culpam o usuário.
- [ ] Labels são compreensíveis.
- [ ] Empty states orientam próximo passo.
- [ ] CTAs usam verbos claros.

---

## Score

|  Score | Significado             |
| -----: | ----------------------- |
| 90–100 | Excelente               |
|  75–89 | Bom                     |
|  60–74 | Aceitável com melhorias |
|   < 60 | Não entregar            |

---

## Regra

Nenhuma tela nova deve ser entregue com score abaixo de 75.

Telas críticas devem ter score mínimo de 90.
