# Regras de Dependencia

## Permitido

- Controller -> UseCase
- UseCase -> IRepository (interface)
- Repository concreto -> ORM

## Proibido

- Domain -> Application ou Infrastructure
- Application -> Infrastructure
- Controller -> Repository diretamente
- Modulo A importar Modulo B diretamente
