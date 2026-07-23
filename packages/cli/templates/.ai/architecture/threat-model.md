# Modelo de Ameaças (Threat Model)

> Versão: 1.0 | Atualizado em: 04/07/2026

## Ameaças Focadas no Ciclo de IA

1. **Injeção de Prompt via Dados Externos (Prompt Injection):** Se a aplicação processa texto livre não confiável e repassa diretamente para LLMs sem sanitização.
2. **Alucinação Arquitetural:** O LLM gerar dependências circulares ou código que introduz vulnerabilidades conhecidas por tentar "encurtar caminhos". (_Mitigado pelos Quality Gates e static-rule-scan_).
3. **Vazamento de Segredos (Secret Leakage):** A IA incluir chaves de API, tokens de acesso ou senhas fixadas (hardcoded) no código-fonte durante a geração de exemplos ou mocks.

## Políticas

- Cada input deve ser estritamente validado usando o padrão `Contract.pre()`.
- O código gerado deve passar por verificadores de secrets no hook de pre-commit.
- Credenciais só devem ser lidas a partir de variáveis de ambiente (`.env` ou Secrets Manager).
