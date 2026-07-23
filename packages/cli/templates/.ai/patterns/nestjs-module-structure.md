# Padrão de Módulo NestJS

Estrutura recomendada:

```txt
src/modules/<feature>/
  application/
    use-cases/
  domain/
    entities/
    repositories/
  infrastructure/
    repositories/
  presentation/
    controllers/
    dto/
  <feature>.module.ts
```

Regras:

- Controller não contém regra de negócio.
- Use case orquestra regra de aplicação.
- Repository é interface no domínio e implementação na infraestrutura.
- DTO valida entrada.
- Erros usam catálogo do projeto.
