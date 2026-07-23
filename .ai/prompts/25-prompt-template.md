# Prompt -- Template de Prompt

Use este arquivo para construir prompts curtos e diretos.

## Estrutura
- Objetivo: [claro e direto]
- Arquivos permitidos: [lista]
- Regra principal: [ex: nao alterar contratos, nao reescrever codigo nao relacionado]
- Saida esperada: [patch / arquivo / resumo curto]

### Exemplo
Objetivo: implementar CreateUserUseCase sem alterar contrato existente.
Arquivos permitidos: src/modules/users/application/use-cases/CreateUserUseCase.ts, src/modules/users/application/dtos/CreateUserDTO.ts
Regra principal: usar Contract.pre() em cada DTO
Saida esperada: codigo completo do UseCase e DTOs.
