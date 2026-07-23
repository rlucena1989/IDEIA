# Prompt 28 — Export Tools

## Propósito
Guiar o agente Documenter na exportação de configurações do AI-DevKit para
ferramentas de IDE externas (Cursor, Windsurf, Aider, GitHub Copilot).

## Quando usar
Ao rodar `ai-devkit adapter validate` ou ao configurar um novo ambiente de
desenvolvimento que precise das regras do `.ai/rules/` traduzidas para o
formato nativo da ferramenta.

## Passos que o agente deve seguir
1. Ler `.ai/rules/global.rules.md`, `.ai/rules/backend.rules.md`,
   `.ai/rules/frontend.rules.md`.
2. Traduzir para o formato da ferramenta alvo:
   - Cursor: `.cursorrules` ou `.cursor/rules/*.mdc`
   - Windsurf: `.windsurfrules`
   - Copilot: `.github/copilot-instructions.md`
3. Nunca duplicar conteúdo integralmente — gerar resumo com referência ao
   arquivo fonte em `.ai/rules/`.
4. Validar que o arquivo exportado não excede o limite de tokens da
   ferramenta alvo (ex: Cursor tem limite prático de ~500 linhas por regra).

## Critério de sucesso
O arquivo exportado deve ser gerado por script (não escrito manualmente) para
garantir que fique sempre sincronizado com `.ai/rules/`. Ver
`packages/cli/templates/copilot-instructions-template.md` como base.
