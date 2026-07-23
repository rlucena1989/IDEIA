# Catálogo de Erros — ai-devkit

> Última atualização: 2026-07-03

Catálogo centralizado de erros, códigos e padrões de tratamento para o ecossistema ai-devkit.

## Convenções

- Prefixo de código: `AIDK-{categoria}-{numero}`
- Categorias: `CFG` (configuração), `CTR` (contrato), `API` (OpenAPI), `SEC` (segurança), `GEN` (geral)
- Cada erro deve ser registrado neste catálogo antes de ser usado em produção.

## Códigos de Erro

### AIDK-CFG-001 — Configuração ausente
- **Descrição**: Arquivo de configuração obrigatório não encontrado.
- **Severidade**: error
- **Ação**: Verificar se o arquivo existe no caminho esperado.

### AIDK-CFG-002 — Configuração inválida
- **Descrição**: Arquivo de configuração com formato ou valores inválidos.
- **Severidade**: error
- **Ação**: Validar o conteúdo do arquivo contra o schema esperado.

### AIDK-CTR-001 — Contrato não encontrado
- **Descrição**: Módulo referenciado em contrato não existe.
- **Severidade**: error
- **Ação**: Verificar se o caminho do módulo está correto.

### AIDK-CTR-002 — Exportação ausente
- **Descrição**: Função/mécada esperado por contrato não está sendo exportado.
- **Severidade**: error
- **Ação**: Adicionar a exportação faltante no módulo.

### AIDK-API-001 — OpenAPI sem paths
- **Descrição**: Especificação OpenAPI não define nenhum endpoint.
- **Severidade**: warning
- **Ação**: Adicionar paths à especificação.

### AIDK-API-002 — Operação sem operationId
- **Descrição**: Endpoint sem identificador único de operação.
- **Severidade**: warning
- **Ação**: Adicionar `operationId` a cada operação.

### AIDK-API-003 — Operação sem respostas
- **Descrição**: Endpoint sem respostas HTTP definidas.
- **Severidade**: error
- **Ação**: Definir ao menos uma resposta para cada operação.

### AIDK-SEC-001 — Segredo exposto
- **Descrição**: Possível segredo ou credencial detectado em código fonte.
- **Severidade**: critical
- **Ação**: Remover o segredo e utilizar variáveis de ambiente ou secrets do GitHub.

### AIDK-GEN-001 — Erro inesperado
- **Descrição**: Erro não categorizado ocorreu durante a execução.
- **Severidade**: error
- **Ação**: Investigar logs e reportar ao time de plataforma.

## Padrões de Tratamento

### Em scripts Node.js
```javascript
const errorCatalog = {
  'AIDK-CFG-001': { message: 'Configuração ausente', severity: 'error' },
  'AIDK-CTR-001': { message: 'Contrato não encontrado', severity: 'error' },
};

function reportError(code, details = {}) {
  const entry = errorCatalog[code];
  if (!entry) return console.error(`[ERRO] Código desconhecido: ${code}`);
  console.error(`[${entry.severity.toUpperCase()}] ${code}: ${entry.message}`, details);
}
```

### Em CI (GitHub Actions)
```yaml
- name: Verificar erros
  run: |
    if grep -r "AIDK-" . --include="*.log" 2>/dev/null; then
      echo "Erros do catálogo encontrados nos logs"
      exit 1
    fi
```

## Manutenção

- Novos códigos devem ser adicionados em ordem sequencial dentro da categoria.
- Códigos obsoletos devem ser movidos para seção "Depreciados" com data de desativação.
- Revisão do catálogo deve ocorrer a cada release.
