# Regras de Negócio do ai-devkit

## BR01: Preservação de Trabalho Humano
O `setup.js` nunca deve sobrescrever arquivo existente com alterações manuais, salvo com `--force`.

## BR02: Fonte Única da Verdade
O `project-manifest.yaml` é a autoridade máxima sobre stack, arquitetura e decisões operacionais.

## BR03: Governança Code-First
Toda decisão estrutural deve ser registrada em `.ai/architecture/adr/` antes da implementação.

## BR04: Padrão de Erro
Erros de sistema devem ser mapeados no `error-catalog.md` e tratados via `AppError` no código gerado.

## BR05: Independência de Modelo
O kit não deve conter lógica específica para um único modelo de IA.

## BR06: Evidência Antes de Conclusão
Nenhum agente pode declarar tarefa concluída sem arquivos verificáveis, diff, comandos e quality gate.

## BR07: Contratos Primeiro
Funcionalidade fullstack deve partir de contrato compartilhado antes de backend e frontend.

## BR08: Geração Determinística Antes de IA
Boilerplate deve ser gerado por templates/scripts locais sempre que possível.
