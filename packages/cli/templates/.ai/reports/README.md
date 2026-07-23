# AI-DevKit Reports

Este diretório armazena relatórios gerados por máquina a partir dos checks do DevKit.

## Relatórios gerados

- `latest-sync-report.json`: gerado por `ai-devkit sync`.
- `ph-policy-report.json`: gerado por `check-ph-policy.js`.
- `artifact-manifest-report.json`: gerado por `check-artifact-manifest.js`.
- `template-consistency-report.json`: gerado por `check-template-consistency.js`.
- `health-consistency-report.json`: gerado por `check-health-consistency.js`.

## Regras

- Relatórios devem ser reprodutíveis (rodar o check de novo gera o mesmo resultado
  para o mesmo estado de projeto).
- Cada relatório deve incluir o campo `generatedAt`.
- Relatórios não podem conter segredos ou tokens.
- Relatórios são staged/commitados apenas se `.gitignore` permitir; caso contrário
  ficam disponíveis localmente para debug.
