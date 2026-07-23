# Desenvolvimento Seguro

## Metas

- Integrar segurança ao ciclo de vida do software desde a especificação.
- Garantir que vulnerabilidades sejam evitadas antes de chegar à produção.

## Regras

- Não armazenar secrets no código ou em arquivos de controle de versão.
- Validar todas as entradas com Contract.pre().
- Capturar erros esperados com AppError e retornar mensagens controladas.
- Aplicar princípio do menor privilégio em acessos e permissões.
- Revisar segurança em cada entrega relevante.

## Para IA

- Siga as políticas de segurança definidas em .ai/environments/secrets-policy.md.
- Ao sugerir bibliotecas, prefira options maduras e mantidas.
- Identifique e documente possíveis riscos de segurança nas mudanças.
