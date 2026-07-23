# Handoff — ai-devkit (Compacto)

> Projeto: AI-Devkit — CLI de governança p/ desenvolvimento assistido por IA
> Stack: Node.js 18+, TypeScript 5.4, npm workspaces, Jest, ESLint
> Arquivo completo: `ai-handoff.md`

## O que faz

CLI com 35+ comandos (init, generate, audit, prove, compile, security, compliance, gate, etc), 87 scripts de governança em `.ai/bin/`, 33 generators, suporte multi-provider IA (Ollama/OpenAI/Anthropic/Google/AWS), VSCode extension, quality gates progressivos, supply chain scanning, SBOM, compliance mapping (SOC2/PCI/GDPR/LGPD/ISO27001), knowledge base (46 entradas), plugin architecture, attestation chain HMAC-SHA256, drift detection, scorecard de maturidade, MCP server nativo.

## Estrutura

`packages/{cli,core,adapter-fastapi,adapter-go,adapter-nestjs}` + `vscode-extension/` + `.ai/bin/` (87 scripts)

## Estado

- Épicos 1-15 concluídos (~100 tasks)
- Pendentes: Visual Workflow Builder (GAP-16), RAG Pipeline (GAP-17), Multi-Agent (GAP-18), Autonomous Engineer (GAP-19), PR Review (GAP-20)
- 461 arquivos indexados, 33 generators, 5 providers IA

## Regras

1. Não alterar arquivos fora do escopo
2. Propor plano antes de implementar
3. Rodar `npm run ai:quality:gate` antes de concluir
4. Cobertura ≥20% (real: ~20%)
5. Seguir `.ai/laws.yaml`
