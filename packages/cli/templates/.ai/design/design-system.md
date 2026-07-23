# Design System Base

## Objetivo

Fornecer à IA um padrão visual e interativo consistente para gerar interfaces refinadas.

---

## Princípios visuais

- Interface limpa.
- Contraste controlado.
- Hierarquia forte.
- Espaçamento generoso.
- Componentes consistentes.
- Feedback claro.
- Animações discretas.
- Densidade adequada ao contexto.
- Visual com aparência de produto final.
- Cores com função, não decoração aleatória.

---

## Escala de espaçamento

Usar escala baseada em 4px:

| Token      | Valor |
| ---------- | ----: |
| `space-1`  |   4px |
| `space-2`  |   8px |
| `space-3`  |  12px |
| `space-4`  |  16px |
| `space-6`  |  24px |
| `space-8`  |  32px |
| `space-12` |  48px |
| `space-16` |  64px |

---

## Tipografia

| Uso     | Peso | Tamanho sugerido |
| ------- | ---: | ---------------: |
| Display |  700 |          40–56px |
| H1      |  700 |          32–40px |
| H2      |  600 |          24–32px |
| H3      |  600 |          20–24px |
| Body    |  400 |          14–16px |
| Small   |  400 |          12–14px |
| Label   |  500 |          12–14px |

---

## Cores

A IA deve usar cores por função, não por gosto.

| Função     | Uso                  |
| ---------- | -------------------- |
| Primary    | Ação principal       |
| Secondary  | Ações secundárias    |
| Background | Fundo principal      |
| Surface    | Cards, painéis       |
| Border     | Separação            |
| Muted      | Texto secundário     |
| Success    | Confirmação          |
| Warning    | Atenção              |
| Danger     | Erro/ação destrutiva |
| Info       | Informação neutra    |

---

## Regras de cor

- Uma única cor primária dominante.
- Evitar excesso de cores saturadas.
- Usar vermelho apenas para erro/perigo.
- Usar verde apenas para sucesso.
- Garantir contraste adequado.
- Estados devem ter cor + texto/ícone, nunca apenas cor.
- Fundos devem permitir leitura confortável por longos períodos.

---

## Componentes base

- Button.
- Input.
- Select.
- Checkbox.
- Radio.
- Switch.
- Textarea.
- Modal.
- Drawer.
- Toast.
- Alert.
- Card.
- Table.
- Tabs.
- Breadcrumb.
- Pagination.
- Badge.
- Tooltip.
- Skeleton.
- Empty State.
- Error State.
- Page Header.
- Sidebar.
- Topbar.
- Command Palette, quando aplicável.

---

## Botões

Toda tela deve ter:

- Uma ação primária clara.
- Ações secundárias menos destacadas.
- Ações destrutivas visualmente diferenciadas.
- Loading state em ações assíncronas.
- Disabled state com razão compreensível quando necessário.

---

## Formulários

- Agrupar campos relacionados.
- Validar cedo, mas sem interromper o usuário agressivamente.
- Mostrar mensagens específicas.
- Preservar dados após erro.
- Indicar campos obrigatórios.
- Usar máscaras apenas quando ajudam.
- Evitar formulários longos sem seções.
- Explicar requisitos complexos no momento certo.

---

## Tabelas

- Cabeçalho fixo quando necessário.
- Ordenação.
- Filtros.
- Busca.
- Paginação.
- Estado vazio.
- Estado carregando.
- Ações por linha.
- Ações em lote quando aplicável.
- Densidade ajustável em sistemas profissionais.
