# Kubernetes — Documentacao Inicial

## Objetivo

Documentar o formato esperado de manifests Kubernetes para este projeto, sem aplica-los automaticamente.

## Recursos sugeridos

- `Deployment` para a aplicacao principal.
- `Service` do tipo ClusterIP.
- `ConfigMap`/`Secret` para variaveis de ambiente (nunca commitar segredos reais).
- `Ingress` quando exposicao externa for necessaria.

## Importante

- Esta documentacao NAO aplica manifests automaticamente (sem `kubectl apply` neste kit).
- Toda aplicacao em cluster deve ser feita manualmente ou via pipeline de CD dedicado, revisado por humanos.
