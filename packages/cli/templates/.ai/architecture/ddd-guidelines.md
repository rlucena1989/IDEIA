# DDD Guidelines

## Entidades e Value Objects

- Regra de negocio deve viver na entidade ou VO, nao em controllers
- Entidades sao responsáveis por invariantes e validacoes internas

## Agregados e Repositories

- Prefira um repositorio por agregado
- Use interfaces para implementar repository patterns

## Limites de modulo

- Modulo deve expor apenas contratos e casos de uso publicos
- Importacoes diretas entre modulos precisam de contrato documentado
