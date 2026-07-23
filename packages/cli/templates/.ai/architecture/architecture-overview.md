# Visao Geral da Arquitetura

## Padrao: Clean Architecture + Modular Monolith

## Camadas

```
+--------------------------------------+
|  Infrastructure  (Controllers, ORM)  |
+--------------------------------------+
|  Application     (Use Cases, DTOs)   |
+--------------------------------------+
|  Domain          (Entities, IRepos)  |
+--------------------------------------+
```

## Regra de dependencia

Camadas internas NAO conhecem camadas externas.

## Estrutura de modulo

```
src/modules/<nome>/
  domain/entities/
  domain/repositories/
  application/use-cases/
  application/dtos/
  infrastructure/database/
  infrastructure/http/
  tests/
```
