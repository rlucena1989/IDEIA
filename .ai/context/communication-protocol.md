# Communication Protocol — Human ↔ AI

## Objetivo

Aumentar a capacidade dos modelos de IA de interpretar corretamente pedidos humanos, reduzir ambiguidade e transformar intenção vaga em plano executável.

O ai-devkit deve ajudar a IA a entender não apenas o que foi escrito, mas o que provavelmente foi pretendido.

---

## Princípios

1. A IA deve entender intenção, não apenas texto literal.
2. A IA deve identificar lacunas antes de implementar.
3. A IA deve perguntar apenas quando a falta de informação bloquear a execução.
4. Quando possível, a IA deve propor hipóteses explícitas e seguir.
5. A IA deve traduzir pedidos humanos em requisitos verificáveis.
6. A IA deve adaptar o nível de detalhe ao tamanho da tarefa.
7. A IA deve distinguir pedido simples, feature completa, mudança arquitetural e decisão de produto.
8. A IA deve reduzir perguntas desnecessárias inferindo padrões seguros do projeto.

---

## Protocolo de interpretação

Para cada pedido, a IA deve extrair:

```yaml
intent:
  goal: ""
  user_type: ""
  target_area: ""
  feature_type: ""
  business_value: ""
  constraints: []
  assumptions: []
  missing_information: []
  risks: []
  acceptance_criteria: []
```

---

## Classificação de ambiguidade

| Nível | Descrição | Ação |
|---|---|---|
| Baixo | Pedido claro | Executar com plano curto |
| Médio | Existem lacunas não críticas | Declarar hipóteses e executar |
| Alto | Falta informação que muda arquitetura/UX | Perguntar antes |
| Crítico | Pode causar dano, quebra de segurança ou retrabalho grande | Bloquear e pedir decisão |

---

## Perguntas internas obrigatórias

Antes de implementar, a IA deve se perguntar:

- O que o usuário realmente quer alcançar?
- Quem vai usar isso?
- Qual é o fluxo feliz?
- Quais são os fluxos de erro?
- Que dados entram e saem?
- Onde isso se encaixa no sistema?
- Que permissões são necessárias?
- Que partes do sistema podem quebrar?
- Como vou provar que funciona?
- Como isso deve parecer e se comportar para o usuário final?
- Existe padrão semelhante no projeto?
- Existe decisão anterior que impede essa abordagem?
- Existe risco de segurança, privacidade ou perda de dados?

---

## Resposta padrão para pedido de feature

A IA deve estruturar a resposta inicial assim:

```markdown
## Entendimento

Explique em 3–5 linhas o que será feito.

## Hipóteses

Liste hipóteses, se houver.

## Plano

Liste etapas.

## Critérios de aceite

Liste critérios testáveis.

## Arquivos prováveis

Liste arquivos que devem ser criados/alterados.

## Validação

Liste comandos de teste/verificação.
```

---

## Regra de economia de perguntas

A IA não deve perguntar por detalhes que podem ser inferidos com segurança pelo ai-devkit.

Exemplo:

Pedido:

> Crie cadastro de usuário

A IA não deve perguntar imediatamente:

> Devo colocar nome e email?

Deve inferir:

- Nome, email, senha e confirmação são campos esperados.
- Validação de email é esperada.
- Confirmação visual é esperada.
- Tratamento de erro é esperado.
- Fluxo de login relacionado deve ser considerado.

Depois, deve permitir ajuste pelo humano.