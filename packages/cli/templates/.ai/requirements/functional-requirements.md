# Requisitos Funcionais do Instalador (setup.js)

## 1. Gestão de Estrutura

- **FR01:** O instalador deve criar a árvore de diretórios padrão `.ai/` e suas subpastas.
- **FR02:** O instalador deve ser idempotente: rodar o script em um projeto já existente não deve corromper arquivos customizados.
- **FR03:** O instalador deve suportar atualização de arquivos de template sem sobrescrever alterações manuais críticas usando merge, backup ou `--force`.

## 2. Automação de Configuração

- **FR04:** Injeção automática de scripts no `package.json`.
- **FR05:** Verificação de pré-requisitos: versão do Node.js e arquivos essenciais.
- **FR06:** Geração de binários em `.ai/bin/` para processamento de templates.

## 3. Governança e Documentação

- **FR07:** Criação/sincronização do `ai-handoff.md`.
- **FR08:** Geração de placeholders para ADRs, logs de decisão e rollback.
- **FR09:** Validação de integridade: identificar arquivos duplicados, ausentes ou divergentes.

## 4. Evolução da Stack

- **FR10:** Suporte a flavors de instalação como NestJS, Express, Next.js e fullstack.

## 5. Context Engineering

- **FR11:** Gerar índice do projeto em `.ai/context/project-index.json`.
- **FR12:** Gerar context packs por tipo de tarefa.
- **FR13:** Selecionar automaticamente arquivos relevantes para cada tarefa.

## 6. Verificação Anti-Falso-Positivo

- **FR14:** Manter manifesto de artefatos criados/alterados.
- **FR15:** Exigir validação por hash, existência de arquivos e comandos executáveis.
- **FR16:** Bloquear conclusão se quality gate falhar.
