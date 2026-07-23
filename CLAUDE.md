# Claude Code Instructions — ai-devkit-project

## Architecture
- Architecture: Clean Architecture
- Defensive programming: true
- Contract-first: true

## Rules
- Todo DTO deve ser validado com Contract.pre()
- Erros de negocio devem usar AppError
- Proibido uso de any sem justificativa documentada
- Cobertura de testes minima: 80%
- Toda funcao publica deve ter JSDoc
- Camada de dominio nao pode importar infraestrutura
- Use cases devem ser testaveis isoladamente
- Nao colocar regra de negocio em controllers
- Nao alterar arquivos fora do escopo da tarefa
- Leia o manifesto antes de qualquer alteracao.
- Siga as regras de projeto e arquitetura.
- Sempre verifique os arquivos de contexto antes de codificar.

## Stack
- Backend: Theia Platform
- Frontend: Theia + React
- Coverage min: 80%
