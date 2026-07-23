# NestJS Adapter

Adapter oficial para projetos NestJS com Clean Architecture.

## Funcionalidades

- **detect**: Detecta projetos NestJS via `@nestjs/core` no `package.json`
- **init**: Gera configs NestJS (`nest-cli.json`, `tsconfig`)
- **generateFeature**: Cria estrutura modular com camadas `application/`, `domain/`, `infrastructure/`
- **runLint / runTests / runBuild**: Orquestra ESLint, Jest e TypeScript build
- **validateContracts**: Valida uso de `Contract.pre()` e Zod nos DTOs via AST (ts-morph)
- **auditSecurity**: Verifica Helmet, CORS e Rate Limit no `main.ts`
- **qualityGate**: Executa todas as validações acima

## Geração de Módulos

O adapter gera automaticamente:

- Módulos NestJS (`@Module`)
- DTOs com validação Zod + Contract pattern
- Controllers, repositories e use-cases
- Estrutura de diretórios Clean Architecture
