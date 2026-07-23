# Padrão de Contrato de API

Contratos devem definir:

- input;
- output;
- erros possíveis;
- permissões;
- exemplos;
- impacto no frontend;
- teste esperado.

Exemplo conceitual:

```ts
export const CreateUserContract = {
  method: 'POST',
  path: '/users',
  input: 'CreateUserInputSchema',
  output: 'UserOutputSchema',
  errors: ['USER_ALREADY_EXISTS', 'VALIDATION_ERROR'],
};
```
