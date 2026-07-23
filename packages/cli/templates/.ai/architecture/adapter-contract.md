# Contrato de Adapters (Adapter Contract)

> Versão: 1.0 | Atualizado em: 04/07/2026

## Visão Geral

Para garantir que o `ai-devkit` suporte múltiplas linguagens com a mesma qualidade de governança, todos os adapters da comunidade ou oficiais devem aderir a esta interface mínima.

## Interface Obrigatória

Qualquer pacote de adapter (ex: `ai-devkit-adapter-go`) deve expor os seguintes comandos padronizados em sua API CLI ou módulo exportado:

- `init`: Inicializa os arquivos de configuração básicos da linguagem (se não existirem).
- `lint`: Executa o linter padrão recomendado da linguagem.
- `test`: Executa a suíte de testes unitários padrão.
- `build`: Verifica se a aplicação é compilável/interpretável sem erros sintáticos.
- `quality-gate`: Aciona o verificador de regras de Clean Architecture específico para a linguagem (ex: verificar imports proibidos entre Domain e Infrastructure).

## Estrutura de Retorno

Os comandos de teste e qualidade devem obrigatoriamente retornar códigos de saída POSIX padrão:

- `0`: Sucesso.
- `>0`: Falha. Acompanhado de STDOUT formatado para que os Agentes Ativos do `ai-devkit` consigam ler o erro e injetar de volta no contexto do LLM.
