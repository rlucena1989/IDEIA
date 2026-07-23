# Handoff -- ai-devkit

> Cole este arquivo no inicio de qualquer conversa com a IA.
> Gerado em: 03/07/2026

## O que e este projeto

Times que usam IA no desenvolvimento perdem contexto entre sessões, geram código inconsistente entre diferentes modelos/agentes e retrabalham arquitetura ao escalar de MVP para sistemas maiores. Falta um "sistema operacional" que governe como a IA cria, documenta e evolui o software.

## Stack

- Instalador: Node.js (>=14) + JavaScript puro (CommonJS), sem dependências externas.
- Código gerado (src/): TypeScript +

_Dependências Atuais:_ 1 prod, 11 dev.Zod (Contract.ts) + Jest.

- Framework recomendado para projetos gerados: NestJS (com adapter Fastify opcional para performance), Prisma + PostgreSQL, @nestjs/swagger para OpenAPI, @nestjs/cqrs e @nestjs/microservices para evolução enterprise.

## Arquitetura

Modular Monolith com Clean Architecture.
Controllers -> Use Cases -> Repositories (interfaces) -> Infraestrutura

## Regras obrigatorias

1. Nao colocar regra de negocio em controllers
2. Cada use case deve ter teste unitario
3. Nao alterar arquivos fora do escopo da tarefa
4. Nao instalar dependencias sem aprovacao
5. Propor plano antes de implementar tarefas complexas
6. Usar os erros de .ai/errors/error-catalog.md
7. Seguir padroes de .ai/patterns/
8. Verificar .ai/knowledge/ antes de implementar
9. Cada DTO validado com Contract.pre()

## Modulos existentes

_Nenhum módulo de negócio criado ainda — o projeto está na fase de consolidação do próprio instalador/estrutura .ai/._

## Tarefa atual

Implementar os 4 Grandes Pilares de Maturidade do ai-devkit:

1. **Refinamento Estrutural:** AST Parsing (jscodeshift/ts-morph) para autocura cirúrgica e suporte a monorepo.
2. **Interface M2M:** Outputs JSON obrigatórios para logs, vector RAG em memória e Servidor MCP nativo.
3. **Agência Autônoma:** Loop ReAct rodando em Docker Sandbox para a IA escrever, testar e se corrigir sozinha.
4. **Prompt as Code:** Engine Handlebars compilando prompts baseados em git-diff e Máquina de Estados (XState).
