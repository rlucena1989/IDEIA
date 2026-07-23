# Estudo: Policy Risk & Approval Matrix

> **Cluster 7** — Capítulos de referência: 11, 20, 62
> Data: 2026-07-22

## Problema

Policy-engine tem 27 patterns mas sem classificação de risco formal, matriz impacto × probabilidade, ou fluxo de aprovação integrado.

## Abordagem

Criar `packages/risk-approval` com:
- **RiskClassifier**: classifica risco por impacto × probabilidade com matriz 4×4
- **ApprovalMatrix**: define fluxo de aprovação por nível de risco
- **PolicyManager**: fachada que integra classificação + aprovação
