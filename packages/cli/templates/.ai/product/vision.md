# Visao do Produto

## Nome

ai-devkit

## Problema que resolve

Times que usam IA no desenvolvimento perdem contexto entre sessões, geram código inconsistente entre diferentes modelos/agentes e retrabalham arquitetura ao escalar de MVP para sistemas maiores. Falta um "sistema operacional" que governe como a IA cria, documenta e evolui o software.

## Para quem

- Desenvolvedores e squads que usam IA (Claude, GPT, Copilot, Cursor, Cline etc.) como parte ativa do fluxo de desenvolvimento.
- Times que precisam manter consistência arquitetural entre múltiplas sessões, modelos ou até desenvolvedores diferentes.
- Projetos que nascem como MVP mas têm ambição de crescer para arquitetura enterprise/industrial sem reescrever a base.
- Freelancers e consultorias que reaproveitam a mesma estrutura de governança em vários projetos/clientes.

## Como resolve

- Gera, via setup.js, uma estrutura .ai/ completa: regras (laws.yaml), contratos, prompts padronizados, checklists, ADRs e catálogo de erros.
- Fornece um "handoff" (ai-handoff.md) que permite qualquer IA continuar exatamente de onde a última sessão parou, sem perda de contexto.
- Define arquitetura de referência (Clean Architecture + Modular Monolith) já com código funcional (Contract.ts, AppError.ts) para validação e tratamento de erro padronizados.
- Oferece prompts prontos para cada fase do ciclo de vida (discovery, planejamento, implementação, review, debug, segurança, performance).
- Documenta a evolução da stack (MVP → Médio Porte → Enterprise/Industrial) para crescer sem retrabalho estrutural.

## Diferencial

- Model-agnostic: funciona com qualquer LLM/agente, sem depender de recursos proprietários de uma ferramenta específica.
- Setup idempotente: pode ser executado múltiplas vezes sem sobrescrever trabalho manual já feito (preserva arquivos alterados).
- Governança embutida: leis arquiteturais, quality gates e ADRs vivem junto do código, não em documentação separada e desatualizada.
- Cobertura de ciclo completo: da visão de produto ao deploy em produção, passando por segurança, observabilidade e testes.
- Pronto para escalar: caminho documentado até DDD, CQRS, event sourcing, microsserviços e integrações industriais (IoT/edge).
- **Servidor MCP Nativo:** Integra-se cirurgicamente a IAs modernas (Claude Desktop, Cursor) permitindo que o modelo consuma relatórios de qualidade e resolva bugs diretamente através da nossa API local, sem o dev copiar/colar logs.
- **Agência Autônoma Controlada:** Capacidade de o AI-Devkit assumir o teclado via ambiente isolado, codificar features baseando-se em tickets e rodar o fluxo iterativo de testes de forma ininterrupta.
- **Autocura (Self-healing)**: Ferramentas de CI (como `ai:heal` e `ai:quality-gates`) que verificam e propõem correções imediatas a qualquer quebra arquitetural gerada pela IA, reduzindo o acúmulo de dívida técnica.
- **Memória de Longo Prazo Local**: Decisões passadas não morrem no fim da janela do chat. A documentação interativa em `.ai/memory/` garante a rastreabilidade cognitiva do projeto inteiro.

## Metricas de sucesso

- Tempo de onboarding de uma nova sessão/IA no projeto: menor que 2 minutos usando apenas o ai-handoff.md.
- Redução perceptível de retrabalho causado por inconsistência arquitetural entre módulos gerados por IA.
- Percentual de módulos novos que seguem os padrões definidos em .ai/patterns/ sem necessidade de correção manual.
- Número de decisões arquiteturais relevantes registradas como ADR versus decisões tomadas informalmente (meta: 100% registradas).
- Cobertura de testes mantida igual ou superior a 80%, conforme laws.yaml.
- Garantir o menor trabalho possível por parte da IA e a maior agilidade e qualidade possível para o desenvolvimento de sistemas.
- **Taxa de "Zero Hallucination" Arquitetural**: Porcentagem de código gerado que passa limpo nos quality gates locais antes de ser aceito no repositório.
- **Índice de Sobrecarga de Contexto**: A quantidade de tokens necessária para situar a IA (handoff) consumindo < 10% da janela do LLM, sobrando mais espaço para processar a tarefa em si.

## Fora do escopo

- Não é um framework de aplicação — não substitui NestJS, Express, Fastify etc.; apenas recomenda e documenta a escolha.
- Não gera regras de negócio automaticamente sem input humano — a IA implementa, mas a decisão de produto continua sendo humana.
- Não realiza deploy, hospedagem ou operação da infraestrutura.
- Não é uma IDE, plugin ou extensão — é uma estrutura de arquivos e convenções que qualquer IDE/IA pode ler.
- Não impõe uma stack fixa — é adaptável, mas recomenda boas práticas por estágio de maturidade (.ai/technologies/stack-evolution.md).
