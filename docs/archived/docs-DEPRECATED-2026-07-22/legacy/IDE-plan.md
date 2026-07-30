# Pacote Mestre — Documentação Consolidada da IDE Local

A seguir está um **único Markdown** contendo:

- **todos os arquivos dos lotes 1 a 7**
- **separados por seções**
- **com nomes reais de arquivo**
- **com prompts para outras IAs organizarem tudo na estrutura correta**
- **com instruções de montagem do repositório**

Você pode salvar este conteúdo como, por exemplo:

`PACOTE-MESTRE-IDE-LOCAL.md`

---

# PACOTE-MESTRE-IDE-LOCAL.md

## Índice

1. [Instruções de organização](#instruções-de-organização)
2. [Estrutura sugerida de pastas](#estrutura-sugerida-de-pastas)
3. [Lote 1 — Fundamentos](#lote-1--fundamentos)
4. [Lote 2 — Arquitetura](#lote-2--arquitetura)
5. [Lote 3 — Roadmap](#lote-3--roadmap)
6. [Lote 4 — Documentação para IAs](#lote-4--documentação-para-ias)
7. [Lote 5 — Fluxos e operação](#lote-5--fluxos-e-operação)
8. [Lote 6 — Execução por IAs](#lote-6--execução-por-ias)
9. [Lote 7 — Consolidação final](#lote-7--consolidação-final)
10. [Prompts para organizar a estrutura](#prompts-para-organizar-a-estrutura)
11. [Prompt mestre para nova IA](#prompt-mestre-para-nova-ia)

---

## Instruções de organização

Este pacote reúne toda a documentação estratégica, arquitetural, operacional e de execução da IDE local com chat central.

### Objetivo deste arquivo
- servir como **pacote único de verdade**
- facilitar a divisão em arquivos reais
- orientar outras IAs a reorganizar os documentos em pastas corretas
- funcionar como base para um repositório técnico inicial

### Uso recomendado
1. Leia o pacote inteiro.
2. Separe por grupos temáticos.
3. Crie as pastas sugeridas.
4. Salve cada bloco em seu arquivo correspondente.
5. Aplique os prompts de organização para validar consistência.
6. Gere o repositório final a partir da estrutura abaixo.

---

## Estrutura sugerida de pastas

```
ai-devkit/
├── README.md
├── docs/
│   ├── 01-fundamentos/
│   │   ├── VISAO-GERAL-IDE-LOCAL.md
│   │   ├── MVP-IDE-LOCAL.md
│   │   ├── ESCOPO-E-FORA-DE-ESCOPO.md
│   │   ├── PRINCIPIOS-DO-PRODUTO.md
│   │   └── CRITERIOS-DE-ACEITE.md
│   ├── 02-arquitetura/
│   │   ├── ARQUITETURA-IDE-LOCAL.md
│   │   ├── CAMADA-DE-INTERFACE.md
│   │   ├── CAMADA-DE-ORQUESTRACAO.md
│   │   ├── CAMADA-DE-WORKSPACE.md
│   │   └── CAMADA-DE-GOVERNANCA.md
│   ├── 03-roadmap/
│   │   ├── ROADMAP-IDE-LOCAL.md
│   │   ├── FASE-0-VERDADE-TECNICA.md
│   │   ├── FASE-1-CHAT-E-EDITOR.md
│   │   ├── FASE-2-ARVORE-E-TERMINAL.md
│   │   └── FASE-3-TAREFAS-MEMORIA-LOGS.md
│   ├── 04-operacao/
│   │   ├── FLUXO-IDEAL-DE-USO.md
│   │   ├── FLUXO-DE-SEGURANCA.md
│   │   ├── POLITICAS-DE-AUTONOMIA.md
│   │   ├── MEMORIA-MINIMA-DO-PROJETO.md
│   │   └── LOGS-E-TRILHA-DE-AUDITORIA.md
│   ├── 05-ias/
│   │   ├── PROMPTS-PARA-IAS.md
│   │   ├── CHECKLIST-DE-VALIDACAO.md
│   │   ├── TEMPLATE-DE-LEITURA-PARA-IAS.md
│   │   ├── MAPA-DE-DECOISOES.md
│   │   └── GLOSSARIO-DO-PROJETO.md
│   ├── 06-execucao/
│   │   ├── ESTRATEGIA-DE-EXECUCAO-POR-IAS.md
│   │   ├── FORMATO-DE-PEDIDO-PARA-IA.md
│   │   ├── FORMATO-DE-RESPOSTA-ESPERADO.md
│   │   ├── CHECKPOINTS-DE-APROVACAO.md
│   │   └── MODELO-DE-ENTREGA-POR-FASE.md
│   └── 07-consolidacao/
│       ├── SUMARIO-MESTRE.md
│       ├── STATUS-DOS-DOCUMENTOS.md
│       ├── LISTA-DE-PENDENCIAS.md
│       ├── MATRIZ-DE-CONFORMIDADE.md
│       └── PACOTE-FINAL-PARA-IAS.md
├── prompts/
│   ├── SYSTEM-PROMPT-BASE.md
│   ├── PROMPT-DE-ANALISE.md
│   ├── PROMPT-DE-ARQUITETURA.md
│   ├── PROMPT-DE-VALIDACAO.md
│   └── PROMPT-DE-EXECUCAO.md
├── contracts/
│   ├── session.schema.json
│   ├── workspace.schema.json
│   ├── task.schema.json
│   └── audit.schema.json
└── memory/
    ├── memory.json
    └── decisions.json
```

---

# Lote 1 — Fundamentos

## `docs/01-fundamentos/VISAO-GERAL-IDE-LOCAL.md`

````markdown
# Visão Geral — IDE Local com Chat Central

## Objetivo
Transformar o ai-devkit em uma IDE local com chat central, capaz de apoiar desenvolvimento e gestão de projetos ponta a ponta.

## Visão do produto
A IDE deve ser um ambiente local de engenharia assistida por IA, com o chat como centro da experiência. O sistema deve permitir que o usuário converse com a ferramenta, edite arquivos, execute comandos em um terminal seguro, aprove ações sensíveis e mantenha memória mínima do projeto.

## Capabilidades centrais
- chat central
- editor embutido
- árvore de arquivos
- terminal sandbox
- aprovações humanas
- execução de tarefas
- políticas de autonomia
- memória mínima do projeto
- logs e trilha de auditoria
- integração com IAs externas

## Direção do produto
O produto deve ser minimalista no início, mas arquitetado para crescimento. A experiência inicial deve ser clara, simples e confiável, sem excesso de painéis ou complexidade visual.

## Estratégia
A evolução do projeto deve seguir a ordem:
1. consolidar a verdade técnica
2. fechar o MVP
3. definir arquitetura em camadas
4. produzir documentação oficial
5. gerar prompts para outras IAs

## Resultado esperado
A visão deve servir como base para:
- alinhamento entre módulos
- tomada de decisão
- organização do roadmap
- consumo por IAs externas
- documentação oficial do projeto
````

## `docs/01-fundamentos/MVP-IDE-LOCAL.md`

````markdown
# MVP — IDE Local com Chat Central

## Objetivo do MVP
Entregar a primeira versão funcional da IDE local com chat central, permitindo que o usuário trabalhe em um projeto local com apoio de IA, edição de arquivos, execução segura e governança mínima.

## Funcionalidades obrigatórias
- chat central
- editor embutido
- árvore de arquivos
- terminal sandbox
- painel de aprovação
- execução de tarefas
- memória mínima do projeto
- logs e trilha de auditoria
- integração com IAs externas
- políticas de autonomia

## O que o MVP deve permitir
- abrir um projeto local
- conversar com a IDE para orientar ações
- visualizar e editar arquivos
- executar comandos com segurança
- aprovar ou bloquear ações sensíveis
- registrar decisões e eventos
- manter contexto mínimo da sessão e do projeto

## O que não entra no MVP
- múltiplos projetos simultâneos
- dashboards ricos
- timeline avançada
- automação complexa
- predição de risco avançada
- documentação viva sofisticada
- multiagente visual completo

## Requisitos funcionais
1. O usuário deve conseguir abrir um workspace local.
2. O chat deve ser o ponto central de interação.
3. O editor deve permitir leitura e escrita de arquivos do projeto.
4. O terminal deve operar em sandbox seguro.
5. A IDE deve solicitar aprovação humana para ações sensíveis.
6. O sistema deve registrar logs e decisões.
7. O sistema deve manter memória mínima do projeto.
8. O sistema deve suportar autonomia configurável.
9. O sistema deve permitir uso de IAs externas.

## Critérios de sucesso do MVP
- a ferramenta consegue conduzir um fluxo simples de desenvolvimento
- o usuário consegue entender o que a IA está fazendo
- ações sensíveis não acontecem sem controle
- o contexto do projeto permanece acessível
- a experiência é funcional sem excesso de complexidade
````

## `docs/01-fundamentos/ESCOPO-E-FORA-DE-ESCOPO.md`

````markdown
# Escopo e Fora de Escopo — IDE Local com Chat Central

## Escopo
O escopo inicial da IDE inclui:
- interface com chat central
- editor embutido
- árvore de arquivos
- terminal sandbox
- aprovações humanas
- tarefas assistidas por IA
- autonomia configurável
- memória mínima do projeto
- logs e auditoria
- integrações com IAs externas

## Fora de escopo
Não devem entrar no núcleo inicial:
- múltiplos projetos simultâneos
- dashboards analíticos avançados
- predição de risco sofisticada
- timeline completa
- documentação viva avançada
- automação irrestrita
- IDE completa em todas as dimensões
- sistemas complexos de multiagente visual

## Diretriz de priorização
Se uma funcionalidade não ajuda diretamente o usuário a:
- entender o projeto
- editar código
- executar ações
- aprovar operações sensíveis
- manter contexto
então ela não deve entrar no MVP.

## Regra de controle de escopo
Toda nova funcionalidade deve responder:
1. ela melhora o núcleo do trabalho?
2. ela reduz atrito real?
3. ela aumenta clareza e segurança?
4. ela pode esperar para uma fase posterior?

Se a resposta não for positiva para os dois primeiros pontos, a funcionalidade deve ser adiada.
````

## `docs/01-fundamentos/PRINCIPIOS-DO-PRODUTO.md`

````markdown
# Princípios do Produto — IDE Local com Chat Central

## 1. Chat como centro
Toda interação relevante deve poder começar no chat.

## 2. Editor embutido
A edição deve acontecer sem quebra de contexto.

## 3. Segurança antes de autonomia total
Autonomia existe, mas sempre sob políticas e aprovações adequadas.

## 4. Simplicidade inicial
O produto deve ser minimalista no começo.

## 5. Evolução por camadas
A ferramenta deve crescer sem perder clareza estrutural.

## 6. Memória útil, não excessiva
O sistema deve lembrar o que é necessário para o projeto andar, sem sobrecarregar.

## 7. Transparência de ação
O usuário deve entender o que a IA pretende fazer e por quê.

## 8. Controle humano sempre disponível
Aprovação manual deve estar disponível por comando e por interface.

## 9. Integração aberta
A IDE deve ser capaz de usar outras IAs como apoio.

## 10. Persistência da verdade
Decisões, logs e contexto precisam ser registrados para evitar perda de conhecimento.
````

## `docs/01-fundamentos/CRITERIOS-DE-ACEITE.md`

````markdown
# Critérios de Aceite — IDE Local com Chat Central

## Critérios gerais
A solução será considerada aderente ao objetivo inicial se:

- o usuário consegue abrir e operar um workspace local;
- o chat central conduz o fluxo principal;
- o editor embutido funciona dentro da mesma experiência;
- a árvore de arquivos é visível e navegável;
- o terminal sandbox executa tarefas com controle;
- ações sensíveis exigem aprovação quando necessário;
- a autonomia é configurável;
- logs e trilha de auditoria são preservados;
- a memória mínima do projeto é mantida;
- integrações com IAs externas funcionam como apoio.

## Critérios de segurança
- ações arriscadas não podem ser executadas sem política apropriada;
- o sistema deve exibir claramente o que pretende fazer;
- o usuário deve conseguir bloquear ações;
- cada decisão importante deve ser registrada.

## Critérios de experiência
- a interface deve permanecer clara e minimalista;
- o usuário deve entender o fluxo sem treinamento pesado;
- o chat deve ser a porta de entrada principal;
- a navegação não deve depender de excesso de painéis.

## Critérios de evolução
- a base deve permitir expansão para fases futuras;
- a arquitetura deve suportar novos módulos sem reescrita total;
- a documentação deve permanecer atualizada e reutilizável.
````

---

# Lote 2 — Arquitetura

## `docs/02-arquitetura/ARQUITETURA-IDE-LOCAL.md`

````markdown
# Arquitetura da IDE Local com Chat Central

## Objetivo
Definir uma arquitetura em camadas para a IDE local, permitindo evolução sem perda de clareza, controle ou consistência.

## Princípio geral
A IDE deve ser organizada em camadas separadas por responsabilidade. Isso evita acoplamento excessivo e facilita crescimento futuro.

## Camadas principais
1. Camada de interface
2. Camada de orquestração
3. Camada de workspace
4. Camada de execução segura
5. Camada de IA e provedores
6. Camada de governança
7. Camada de persistência

## Diretriz
Cada camada deve ter responsabilidades explícitas, entradas claras e limites definidos.

## Resultado esperado
Uma base arquitetural que permita:
- chat central como eixo do produto
- edição e navegação de arquivos
- execução segura de tarefas
- autonomia configurável
- auditoria e memória
- integração com múltiplas IAs
````

## `docs/02-arquitetura/CAMADA-DE-INTERFACE.md`

````markdown
# Camada de Interface

## Objetivo
Concentrar a experiência do usuário em uma interface minimalista, funcional e orientada ao trabalho.

## Componentes
- chat central
- editor embutido
- árvore de arquivos
- terminal sandbox
- painel de aprovações
- painel de tarefas
- área de logs básicos

## Responsabilidades
- apresentar o estado atual do projeto
- permitir interação com a IA
- exibir contexto, arquivos e tarefas
- mostrar aprovações pendentes
- manter a navegação simples e clara

## Regras de design
- chat deve ser o ponto central
- o editor deve estar sempre acessível
- a interface deve evitar poluição visual
- informações críticas devem ser fáceis de encontrar

## Critério de qualidade
A interface é boa se o usuário consegue entender o que está acontecendo sem precisar procurar demais.
````

## `docs/02-arquitetura/CAMADA-DE-ORQUESTRACAO.md`

````markdown
# Camada de Orquestração

## Objetivo
Interpretar intenções do usuário, gerar planos de ação e coordenar a execução de tarefas na IDE.

## Responsabilidades
- interpretar mensagens do chat
- identificar intenção do usuário
- decompor pedidos em etapas
- selecionar ferramentas apropriadas
- pedir aprovação quando necessário
- monitorar execução
- registrar resultado e decisões

## Fluxo básico
1. o usuário envia uma intenção
2. a orquestração interpreta o pedido
3. o sistema monta um plano
4. o sistema verifica políticas de autonomia
5. o sistema executa ou solicita aprovação
6. o resultado é registrado

## Regras
- nenhuma ação sensível deve ser executada sem política adequada
- o plano deve ser visível ao usuário quando relevante
- o sistema deve ser capaz de interromper ou adaptar a execução

## Critério de qualidade
A camada é boa se transforma intenções humanas em ações coordenadas, transparentes e seguras.
````

## `docs/02-arquitetura/CAMADA-DE-WORKSPACE.md`

````markdown
# Camada de Workspace

## Objetivo
Gerenciar o projeto local ativo, seus arquivos, contexto, estado e memória mínima.

## Responsabilidades
- identificar a raiz do projeto
- carregar o contexto do workspace
- ler e escrever arquivos
- manter estado da sessão
- associar tarefas ao projeto atual
- preservar memória mínima útil

## Elementos do workspace
- projeto ativo
- árvore de arquivos
- configurações do projeto
- memória mínima
- tarefas em andamento
- logs associados
- políticas específicas do projeto

## Regras
- o workspace deve ser local e explícito
- o sistema deve saber qual projeto está ativo
- alterações devem estar vinculadas ao contexto do workspace
- o estado não deve se perder entre interações relevantes

## Critério de qualidade
O workspace é bom se o usuário percebe continuidade, contexto e organização ao trabalhar no projeto.
````

## `docs/02-arquitetura/CAMADA-DE-GOVERNANCA.md`

````markdown
# Camada de Governança

## Objetivo
Controlar autonomia, permissões, bloqueios, aprovações e auditoria das ações executadas pela IDE.

## Responsabilidades
- aplicar políticas de autonomia
- validar ações sensíveis
- decidir entre `auto`, `ask` e `block`
- exigir confirmação humana quando necessário
- registrar decisões e justificativas
- manter trilha de auditoria

## Modos de autonomia
- `auto`: ação pode ser executada automaticamente
- `ask`: ação exige aprovação
- `block`: ação é impedida

## Perfis de autonomia
- conservador
- equilibrado
- agressivo
- personalizado

## Escopo da governança
A governança deve atuar:
- globalmente
- por projeto
- por tipo de ação
- por grau de sensibilidade

## Regras
- toda ação sensível deve passar por política
- aprovações devem ser registradas
- bloqueios devem ser explícitos
- o usuário deve poder alterar o nível de autonomia conforme permitido

## Critério de qualidade
A governança é boa se permite autonomia útil sem comprometer segurança ou controle humano.
````

---

# Lote 3 — Roadmap

## `docs/03-roadmap/ROADMAP-IDE-LOCAL.md`

````markdown
# Roadmap — IDE Local com Chat Central

## Objetivo
Organizar a evolução do projeto em fases claras, priorizando entrega de valor, consistência e controle de escopo.

## Direção geral
O roadmap deve avançar do núcleo funcional para capacidades mais amplas, sempre preservando o chat central, a segurança e a clareza da experiência.

## Fases sugeridas
1. Fase 0 — Consolidação da verdade técnica
2. Fase 1 — Chat central e editor embutido
3. Fase 2 — Árvore de arquivos e terminal sandbox
4. Fase 3 — Tarefas, memória mínima e logs
5. Fase 4 — Integrações com IAs externas e automação ampliada

## Regra de evolução
Nenhuma fase posterior deve comprometer a estabilidade, clareza ou controle do núcleo já construído.

## Resultado esperado
Uma sequência de implementação que permita chegar à IDE desejada sem excesso de risco ou dispersão.
````

## `docs/03-roadmap/FASE-0-VERDADE-TECNICA.md`

````markdown
# Fase 0 — Consolidação da Verdade Técnica

## Objetivo
Separar claramente o que está realmente implementado do que existe apenas como intenção, hipótese ou documentação.

## Atividades
- revisar documentação existente
- mapear capacidades reais do projeto
- identificar lacunas entre docs e código
- classificar módulos como completos, parciais ou conceituais
- registrar riscos e inconsistências

## Entregáveis
- mapa de verdade técnica
- lista de gaps prioritários
- visão consolidada do estado atual
- base confiável para decisões futuras

## Critério de conclusão
A fase termina quando a equipe consegue responder com clareza:
- o que existe
- o que falta
- o que está inconsistente
- o que deve ser priorizado
````

## `docs/03-roadmap/FASE-1-CHAT-E-EDITOR.md`

````markdown
# Fase 1 — Chat Central e Editor Embutido

## Objetivo
Entregar o núcleo da experiência da IDE: o chat como centro e o editor embutido como área principal de trabalho.

## Capacidades
- chat central funcional
- editor embutido acessível
- navegação básica entre conversa e edição
- contexto compartilhado entre chat e editor

## Prioridades
- clareza da interação
- baixa fricção
- continuidade de contexto
- interface minimalista

## Resultado esperado
O usuário consegue iniciar o trabalho pela conversa e editar arquivos sem sair da experiência central da IDE.
````

## `docs/03-roadmap/FASE-2-ARVORE-E-TERMINAL.md`

````markdown
# Fase 2 — Árvore de Arquivos e Terminal Sandbox

## Objetivo
Expandir a funcionalidade básica para permitir navegação no projeto e execução segura de comandos.

## Capacidades
- árvore de arquivos visível
- abertura e seleção de arquivos
- terminal sandbox seguro
- execução controlada de comandos
- vínculo entre chat, arquivos e terminal

## Requisitos de segurança
- comandos sensíveis devem ser tratados por política
- o terminal deve operar em ambiente isolado
- ações perigosas devem exigir aprovação quando necessário

## Resultado esperado
O usuário consegue navegar no workspace e executar tarefas técnicas com segurança e controle.
````

## `docs/03-roadmap/FASE-3-TAREFAS-MEMORIA-LOGS.md`

````markdown
# Fase 3 — Tarefas, Memória Mínima e Logs

## Objetivo
Adicionar estrutura operacional para acompanhamento de execução, retenção de contexto e rastreabilidade.

## Capacidades
- criação e acompanhamento de tarefas
- memória mínima do projeto
- registro de decisões
- logs de execução
- trilha de auditoria básica

## Função da memória mínima
A memória deve preservar:
- contexto do projeto
- decisões relevantes
- preferências do usuário
- tarefas em andamento
- estado operacional útil

## Resultado esperado
A IDE passa a manter continuidade entre interações e deixa rastros suficientes para auditoria e recuperação de contexto.
````

---

# Lote 4 — Documentação para IAs

## `docs/05-ias/PROMPTS-PARA-IAS.md`

````markdown
# Prompts para IAs — IDE Local com Chat Central

## Objetivo
Padronizar instruções para outras IAs analisarem, ampliarem ou executarem partes do projeto sem perder contexto.

## Prompt-base geral
Você está ajudando a estruturar uma IDE local com chat central para o projeto ai-devkit. Considere que a prioridade é consolidar visão, MVP, arquitetura, roadmap e governança. Evite expandir escopo sem necessidade. Foque em clareza, coerência e utilidade prática.

## Tipos de tarefa

### 1. Análise de documento
Você deve revisar o documento, apontar lacunas, inconsistências e oportunidades de melhoria, mantendo o foco no MVP.

### 2. Proposição de arquitetura
Você deve propor camadas, módulos e responsabilidades sem criar complexidade desnecessária.

### 3. Definição de escopo
Você deve classificar o que entra no MVP e o que deve ser adiado.

### 4. Validação de consistência
Você deve comparar visões, critérios, roadmap e arquitetura para encontrar conflitos.

### 5. Apoio à execução
Você deve transformar documentação em passos concretos, instruções e blocos de implementação.

## Regra geral
A IA deve sempre priorizar:
- clareza
- consistência
- segurança
- escopo controlado
- utilidade para o usuário final
````

## `docs/05-ias/CHECKLIST-DE-VALIDACAO.md`

````markdown
# Checklist de Validação — IDE Local com Chat Central

## Objetivo
Verificar se documentos, decisões e propostas estão coerentes com a visão do projeto.

## Checklist geral
- [ ] O documento está alinhado com a visão da IDE local?
- [ ] O conteúdo respeita o escopo do MVP?
- [ ] A proposta mantém o chat como centro?
- [ ] O editor embutido está preservado?
- [ ] A segurança e a governança estão contempladas?
- [ ] A autonomia está explicitamente controlada?
- [ ] O texto evita excesso de complexidade?
- [ ] Há clareza sobre o que entra e o que fica de fora?
- [ ] O conteúdo pode ser consumido por outra IA sem ambiguidade?
- [ ] O documento ajuda na evolução do projeto?

## Checklist de risco
- [ ] Há dependência implícita de algo não definido?
- [ ] Existe expansão prematura de escopo?
- [ ] Há termos vagos que precisam de definição?
- [ ] Existe conflito entre fase atual e fase futura?
- [ ] A proposta exige mais contexto do que o documento fornece?

## Resultado
Se qualquer item crítico falhar, o documento deve ser revisado antes de virar base oficial.
````

## `docs/05-ias/TEMPLATE-DE-LEITURA-PARA-IAS.md`

````markdown
# Template de Leitura para IAs

## Objetivo
Fornecer um formato padrão para IAs novas entenderem rapidamente o projeto.

## Estrutura de leitura recomendada
1. Visão geral do projeto
2. Escopo do MVP
3. Arquitetura em camadas
4. Roadmap por fases
5. Regras de governança
6. Checklist de validação
7. Glossário e decisões

## Instrução para a IA
Leia os documentos fornecidos como base de verdade do projeto. Antes de propor qualquer ampliação, identifique:
- o que é prioridade
- o que é dependência
- o que é risco
- o que deve ficar fora do MVP

## Saída esperada
A IA deve responder com:
- resumo do entendimento
- inconsistências encontradas
- melhorias sugeridas
- próximos passos objetivos
````

## `docs/05-ias/MAPA-DE-DECOISOES.md`

````markdown
# Mapa de Decisões — IDE Local com Chat Central

## Objetivo
Registrar as decisões centrais do projeto para facilitar consistência ao longo do tempo.

## Decisões principais
- a IDE será local
- o chat será o centro da experiência
- o editor será embutido
- o terminal será sandbox
- haverá aprovações humanas
- a autonomia será configurável
- a experiência será minimalista no início
- o projeto evoluirá em fases
- haverá memória mínima do projeto
- haverá logs e trilha de auditoria
- haverá integração com IAs externas

## Função do mapa
Esse documento serve como referência rápida para:
- alinhar IAs
- evitar reabertura de decisões
- explicar por que certas escolhas foram feitas
- manter o projeto coerente ao longo do tempo

## Regra de uso
Se uma nova proposta contradizer uma decisão principal, ela deve ser revisada explicitamente antes de ser adotada.
````

## `docs/05-ias/GLOSSARIO-DO-PROJETO.md`

````markdown
# Glossário do Projeto — IDE Local com Chat Central

## Termos principais

### IDE local
Ambiente de desenvolvimento executado localmente, com foco em controle, contexto e integração com IA.

### Chat central
Interface principal de interação com o sistema.

### Editor embutido
Editor integrado à própria IDE, sem necessidade de alternar para outra ferramenta.

### Terminal sandbox
Ambiente controlado para execução de comandos, com limites de segurança.

### Aprovação humana
Validação manual exigida para ações sensíveis.

### Autonomia
Nível de ação que a IA pode executar sem pedir confirmação.

### Memória mínima
Contexto essencial preservado para continuidade do projeto.

### Logs e trilha de auditoria
Registro das ações, decisões e eventos relevantes.

### Workspace
Projeto local atualmente ativo dentro da IDE.

### Orquestração
Camada responsável por interpretar intenções e coordenar ações.

### Governança
Conjunto de regras que controla permissões, aprovações e bloqueios.

### Auto
Modo em que a ação pode ser executada automaticamente.

### Ask
Modo em que a ação exige confirmação humana.

### Block
Modo em que a ação é impedida.
````

---

# Lote 5 — Fluxos e operação

## `docs/04-operacao/FLUXO-IDEAL-DE-USO.md`

````markdown
# Fluxo Ideal de Uso — IDE Local com Chat Central

## Objetivo
Descrever o fluxo principal de uso da IDE, do ponto de entrada até a execução e registro das ações.

## Fluxo básico
1. o usuário abre um projeto local
2. a IDE carrega o contexto do workspace
3. o chat central recebe a intenção do usuário
4. a orquestração interpreta o pedido
5. o sistema monta um plano
6. o sistema verifica a política de autonomia
7. a ação é executada ou enviada para aprovação
8. o resultado é exibido ao usuário
9. o sistema registra o evento
10. a memória mínima é atualizada

## Princípio
O fluxo deve ser simples, transparente e consistente, sem exigir que o usuário pense na estrutura interna da ferramenta.

## Resultado esperado
O usuário consegue iniciar, orientar, aprovar e acompanhar o trabalho com continuidade de contexto.
````

## `docs/04-operacao/FLUXO-DE-SEGURANCA.md`

````markdown
# Fluxo de Segurança — IDE Local com Chat Central

## Objetivo
Estabelecer como ações sensíveis são identificadas, controladas e registradas.

## Fluxo de segurança
1. a IA identifica uma ação potencialmente sensível
2. a política de autonomia é consultada
3. o sistema classifica a ação como `auto`, `ask` ou `block`
4. se for `auto`, a ação pode seguir
5. se for `ask`, o usuário deve aprovar
6. se for `block`, a ação não pode ser executada
7. toda decisão relevante é registrada

## Ações sensíveis
Exemplos de ações sensíveis incluem:
- escrita destrutiva
- execução de comandos arriscados
- alterações que afetam o estado do projeto de forma ampla
- operações fora da política definida

## Princípio
Segurança não deve eliminar autonomia, mas deve garantir controle e rastreabilidade.
````

## `docs/04-operacao/POLITICAS-DE-AUTONOMIA.md`

````markdown
# Políticas de Autonomia — IDE Local com Chat Central

## Objetivo
Definir como a autonomia da IA é configurada e aplicada.

## Modos de autonomia
- `auto`: execução automática
- `ask`: exige confirmação
- `block`: impede a ação

## Perfis de autonomia
- conservador
- equilibrado
- agressivo
- personalizado

## Escopo da política
A política pode ser aplicada:
- globalmente
- por projeto
- por tipo de ação
- por sensibilidade

## Diretriz
A autonomia deve ser útil sem se tornar perigosa ou imprevisível.

## Regra
Se a política não estiver clara, a ação deve cair para o modo mais seguro.
````

## `docs/04-operacao/MEMORIA-MINIMA-DO-PROJETO.md`

````markdown
# Memória Mínima do Projeto

## Objetivo
Definir o conjunto mínimo de informações que a IDE deve preservar para manter continuidade útil.

## Conteúdo da memória mínima
- contexto do projeto
- decisões recentes
- tarefas em andamento
- preferências do usuário
- políticas relevantes
- estado operacional básico

## O que a memória não deve virar
- repositório infinito de tudo
- acúmulo sem curadoria
- substituto de documentação formal

## Princípio
A memória deve ser pequena o suficiente para ser útil e grande o suficiente para preservar continuidade.

## Resultado esperado
A IDE consegue retomar o trabalho com contexto relevante sem depender de reconstrução manual constante.
````

## `docs/04-operacao/LOGS-E-TRILHA-DE-AUDITORIA.md`

````markdown
# Logs e Trilha de Auditoria

## Objetivo
Registrar eventos, decisões e ações relevantes para permitir rastreabilidade do comportamento da IDE.

## O que deve ser registrado
- intenções relevantes do usuário
- planos gerados
- aprovações solicitadas
- ações executadas
- ações bloqueadas
- erros e falhas
- mudanças de política
- atualizações de memória

## Função dos logs
Os logs servem para:
- depuração
- auditoria
- análise de comportamento
- recuperação de decisões
- transparência operacional

## Trilha de auditoria
A trilha deve permitir responder:
- o que foi feito
- quando foi feito
- por qual motivo
- com qual autorização
- qual foi o resultado

## Princípio
Tudo o que afeta o projeto de maneira relevante deve poder ser rastreado.
````

---

# Lote 6 — Execução por IAs

## `docs/06-execucao/ESTRATEGIA-DE-EXECUCAO-POR-IAS.md`

````markdown
# Estratégia de Execução por IAs

## Objetivo
Definir como IAs diferentes devem ser utilizadas ao longo do projeto sem gerar redundância, conflito ou expansão indevida de escopo.

## Estratégia geral
Cada IA deve ter uma função clara:
- uma IA para análise
- uma IA para arquitetura
- uma IA para implementação
- uma IA para revisão
- uma IA para validação de consistência

## Princípios
- não pedir a mesma coisa de forma ambígua para múltiplas IAs
- reutilizar documentos-base como fonte de verdade
- manter rastreabilidade das respostas
- comparar saídas antes de adotar mudanças

## Resultado esperado
As IAs se tornam colaboradoras especializadas, e não fontes concorrentes de verdade.
````

## `docs/06-execucao/FORMATO-DE-PEDIDO-PARA-IA.md`

````markdown
# Formato de Pedido para IA

## Objetivo
Padronizar como solicitar trabalho a outra IA.

## Estrutura do pedido
1. contexto do projeto
2. documento-base a ser considerado
3. objetivo específico
4. restrições de escopo
5. formato da resposta esperada

## Exemplo
Contexto: IDE local com chat central.
Base: visão geral, MVP, arquitetura e governança.
Objetivo: identificar lacunas no módulo de orquestração.
Restrições: não expandir escopo além do MVP.
Saída esperada: lista de problemas, sugestões e prioridade de ação.

## Regra
Quanto mais claro o pedido, menor a chance de respostas divergentes ou excessivas.
````

## `docs/06-execucao/FORMATO-DE-RESPOSTA-ESPERADO.md`

````markdown
# Formato de Resposta Esperado

## Objetivo
Padronizar como as IAs devem devolver análises, propostas e revisões.

## Estrutura recomendada
- resumo do entendimento
- pontos fortes
- lacunas ou riscos
- sugestões objetivas
- prioridade das ações
- observações finais

## Regras
- evitar texto genérico
- evitar expansão fora do escopo
- indicar claramente o nível de confiança da proposta, se necessário
- diferenciar fato, hipótese e recomendação

## Resultado esperado
Respostas comparáveis entre si, fáceis de avaliar e integrar.
````

## `docs/06-execucao/CHECKPOINTS-DE-APROVACAO.md`

````markdown
# Checkpoints de Aprovação

## Objetivo
Definir pontos de controle em que o trabalho deve ser revisado antes de seguir adiante.

## Checkpoints sugeridos
- após definição da visão geral
- após fechamento do MVP
- após definição da arquitetura
- após cada fase do roadmap
- antes de qualquer ampliação de escopo
- antes de automatizar ações sensíveis

## O que deve ser validado
- coerência com a visão
- aderência ao escopo
- viabilidade técnica
- riscos de segurança
- clareza para o usuário

## Regra
Se um checkpoint falhar, a próxima fase não deve começar até o problema ser resolvido.
````

## `docs/06-execucao/MODELO-DE-ENTREGA-POR-FASE.md`

````markdown
# Modelo de Entrega por Fase

## Objetivo
Definir como cada fase deve ser documentada e encerrada.

## Estrutura de entrega
- objetivo da fase
- capacidades entregues
- limites da fase
- dependências
- riscos
- critérios de conclusão
- próximos passos

## Benefícios
- facilita revisão
- facilita validação por IAs
- evita perda de contexto
- mantém disciplina de execução

## Regra
Nenhuma fase deve ser considerada pronta sem documentação mínima consistente.
````

---

# Lote 7 — Consolidação final

## `docs/07-consolidacao/SUMARIO-MESTRE.md`

````markdown
# Sumário Mestre — IDE Local com Chat Central

## Objetivo
Reunir em um único ponto a estrutura conceitual do projeto, facilitando leitura, navegação e uso por outras IAs.

## Estrutura consolidada
### Fundamentos
- visão geral
- MVP
- escopo e fora de escopo
- princípios do produto
- critérios de aceite

### Arquitetura
- arquitetura geral
- camada de interface
- camada de orquestração
- camada de workspace
- camada de governança

### Roadmap
- roadmap geral
- fase 0
- fase 1
- fase 2
- fase 3

### Operação
- fluxos de uso
- fluxos de segurança
- políticas de autonomia
- memória mínima
- logs e auditoria

### Uso por IAs
- prompts para IAs
- checklist de validação
- template de leitura
- mapa de decisões
- glossário

### Execução
- estratégia de execução por IAs
- formato de pedido
- formato de resposta
- checkpoints de aprovação
- modelo de entrega por fase

## Função do sumário
Este documento serve como índice lógico do projeto e como porta de entrada para qualquer nova IA ou colaborador.
````

## `docs/07-consolidacao/STATUS-DOS-DOCUMENTOS.md`

````markdown
# Status dos Documentos

## Objetivo
Acompanhar a maturidade e a função de cada documento do projeto.

## Classificação sugerida
- ativo: documento em uso direto
- base: documento estrutural permanente
- apoio: documento auxiliar
- futuro: documento planejado ou secundário

## Exemplo de classificação
- visão geral: base
- MVP: base
- escopo: base
- arquitetura: base
- roadmap: base
- fluxos operacionais: ativo
- prompts para IAs: ativo
- checklist de validação: ativo
- glossário: apoio
- sumário mestre: base

## Regra
Todo documento novo deve receber status e finalidade explícitos.
````

## `docs/07-consolidacao/LISTA-DE-PENDENCIAS.md`

````markdown
# Lista de Pendências

## Objetivo
Registrar os pontos que ainda precisam ser definidos, refinados ou implementados.

## Categorias de pendência
- conceitual
- arquitetural
- operacional
- de implementação
- de documentação

## Exemplo de itens
- detalhar persistência real de memória
- definir contrato entre orquestração e execução
- especificar modelo de logs estruturados
- descrever comportamento do terminal sandbox
- definir formato final de aprovações
- validar fluxo completo do MVP

## Regra
Pendências devem ser visíveis e priorizadas, não escondidas.
````

## `docs/07-consolidacao/MATRIZ-DE-CONFORMIDADE.md`

````markdown
# Matriz de Conformidade

## Objetivo
Verificar se cada componente do projeto respeita visão, MVP, arquitetura e governança.

## Eixos de avaliação
- aderência à visão
- aderência ao MVP
- clareza arquitetural
- segurança
- rastreabilidade
- utilidade prática
- controle de escopo

## Uso
Cada novo documento, módulo ou proposta deve ser comparado com esses eixos antes de ser aceito.

## Regra
Se um item falhar em segurança ou escopo, ele deve ser revisto antes de avançar.
````

## `docs/07-consolidacao/PACOTE-FINAL-PARA-IAS.md`

````markdown
# Pacote Final para IAs

## Objetivo
Servir como orientação de entrada para qualquer IA que precise trabalhar no projeto.

## Conteúdo mínimo recomendado
1. sumário mestre
2. visão geral
3. MVP
4. arquitetura
5. roadmap
6. governança
7. fluxos operacionais
8. checklist de validação
9. glossário
10. matriz de conformidade

## Instrução
A IA deve usar esses documentos como verdade-base do projeto e não contradizer decisões centrais sem justificar explicitamente.

## Resultado esperado
Redução de ambiguidade, maior consistência e menor risco de expansão indevida de escopo.
````

---

# Prompts para organizar a estrutura

## `prompts/SYSTEM-PROMPT-BASE.md`

````markdown
Você é a IA responsável por organizar a documentação do projeto ai-devkit em uma estrutura de repositório coerente, limpa e escalável. Sua tarefa é separar os documentos por assunto, sugerir nomes de arquivos reais, identificar duplicidades e garantir que a estrutura preserve a visão, o MVP, a arquitetura, o roadmap, a operação e a execução por outras IAs. Priorize clareza, consistência e mínimo acoplamento.
````

## `prompts/PROMPT-DE-ANALISE.md`

````markdown
Analise o pacote documental completo da IDE local com chat central. Identifique inconsistências, lacunas, repetições, trechos muito genéricos e pontos que precisam ser reorganizados. Diga como separar os arquivos em pastas, quais documentos devem ser considerados base, quais devem ser considerados apoio e quais podem ser consolidados. Não expanda escopo além do MVP.
````

## `prompts/PROMPT-DE-ARQUITETURA.md`

````markdown
Proponha uma estrutura de pastas e arquivos para a documentação da IDE local com chat central. A estrutura deve refletir os blocos: fundamentos, arquitetura, roadmap, operação, IAs, execução e consolidação. Preserve nomes reais de arquivos, sugira relações entre documentos e indique a ordem de leitura ideal.
````

## `prompts/PROMPT-DE-VALIDACAO.md`

````markdown
Valide se a organização proposta para os documentos mantém coerência com o projeto ai-devkit. Verifique se a estrutura preserva o chat como centro, o editor embutido, o terminal sandbox, a governança, a memória mínima e a trilha de auditoria. Aponte riscos de desorganização, ambiguidade ou expansão de escopo.
````

## `prompts/PROMPT-DE-EXECUCAO.md`

````markdown
Converta a documentação consolidada da IDE local em um plano de implementação orientado por fases. Produza uma lista de ações práticas, dependências, checkpoints e arquivos que devem ser implementados primeiro. Mantenha o foco no MVP e em uma evolução controlada.
````

---

# Contratos

## `contracts/session.schema.json`

````json
{
  "session_id": "uuid",
  "workspace_root": "/path/to/project",
  "policy": "ask",
  "active_tasks": [],
  "memory": {
    "last_decisions": [],
    "project_context": {}
  }
}
````

## `contracts/workspace.schema.json`

````json
{
  "workspace_id": "uuid",
  "root_path": "/path/to/project",
  "active_file": null,
  "files": [],
  "context": {},
  "policy": "ask"
}
````

## `contracts/task.schema.json`

````json
{
  "task_id": "uuid",
  "title": "string",
  "description": "string",
  "status": "pending",
  "priority": "medium",
  "requires_approval": true,
  "affected_files": [],
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
````

## `contracts/audit.schema.json`

````json
{
  "audit_id": "uuid",
  "timestamp": "timestamp",
  "actor": "ai|user|system",
  "action": "string",
  "target": "string",
  "decision": "auto|ask|block",
  "result": "success|failure|blocked",
  "metadata": {}
}
````

---

# Memória

## `memory/memory.json`

````json
{
  "session_id": "",
  "workspace_root": "",
  "policy": "ask",
  "active_tasks": [],
  "memory": {
    "last_decisions": [],
    "project_context": {}
  }
}
````

## `memory/decisions.json`

````json
{
  "decisions": [
    {
      "id": "",
      "title": "",
      "description": "",
      "date": "",
      "source": "",
      "impact": "low"
    }
  ]
}
````

---

# README inicial

## `README.md`

````markdown
# ai-devkit

IDE local com chat central, editor embutido, terminal sandbox, governança e memória mínima.

## Objetivo
Criar uma IDE local orientada por IA, com foco em segurança, clareza, contexto e evolução controlada.

## Estrutura
- docs/: documentação base do projeto
- prompts/: instruções para outras IAs
- contracts/: esquemas de dados
- memory/: estado persistido da sessão

## Ordem de leitura
1. docs/01-fundamentos/VISAO-GERAL-IDE-LOCAL.md
2. docs/01-fundamentos/MVP-IDE-LOCAL.md
3. docs/01-fundamentos/ESCOPO-E-FORA-DE-ESCOPO.md
4. docs/02-arquitetura/ARQUITETURA-IDE-LOCAL.md
5. docs/03-roadmap/ROADMAP-IDE-LOCAL.md
6. docs/04-operacao/FLUXO-IDEAL-DE-USO.md
7. docs/05-ias/PROMPTS-PARA-IAS.md
8. docs/06-execucao/ESTRATEGIA-DE-EXECUCAO-POR-IAS.md
9. docs/07-consolidacao/SUMARIO-MESTRE.md

## Regra do projeto
Nada sensível deve acontecer sem política, plano e, quando aplicável, aprovação humana.
````

---

# Prompt mestre para nova IA

````text
Você está entrando no projeto ai-devkit, uma IDE local com chat central, editor embutido, terminal sandbox, memória mínima e governança. Sua primeira tarefa é ler a estrutura documental, identificar a hierarquia correta dos arquivos e reorganizar o pacote em pastas coerentes. Depois disso, valide consistência entre visão, MVP, arquitetura, roadmap, operação, execução e consolidação. Não expanda escopo além do que está documentado. Responda de forma técnica, objetiva e orientada à implementação.
````

---

## Próximo passo
Se quiser, eu posso fazer agora uma destas 3 coisas:

1. **converter esse pacote em uma estrutura de arquivos ainda mais detalhada**, pronta para copiar e colar no projeto;
2. **gerar um script Python ou Bash** que cria essa árvore de pastas e grava os arquivos automaticamente;
3. **transformar isso em um único arquivo `.md` mais enxuto**, com apenas títulos e conteúdos essenciais.

Se quiser, eu já posso seguir com a **opção 2** e montar o script gerador do pacote.