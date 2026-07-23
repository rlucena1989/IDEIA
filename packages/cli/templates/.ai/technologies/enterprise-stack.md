# Enterprise & Industrial AI Stack

## Arquitetura proposta

- Modular Monolith ou microsserviços com domínios claros
- Backbone de contratos: OpenAPI, JSON Schema, Zod, GraphQL schema-first
- Observabilidade: Prometheus, Grafana, Elastic, Loki, OpenTelemetry
- Automação de infra: Docker, Kubernetes, Terraform, Pulumi, GitOps
- Segurança: OAuth2, OIDC, Vault, secrets manager, SAST, DAST
- Deploy: CI/CD com pipelines triviais e canary/blue-green
- Testes: unitários, integração, contract testing, mutation testing, property-based testing

## Recursos IA específicos

- Prompt repositories e templates em ".ai/prompts/"
- Contexto persistente em ".ai/context/" e ".ai/memory/"
- Knowledge base de decisões e lições aprendidas
- Documentação de contrato entre módulos em ".ai/contracts/"
- Pipelines de subtarefas em ".ai/pipelines/"
- Relatórios de qualidade e revisões em ".ai/reports/"

## Tecnologias recomendadas

- Orquestração: Kubernetes, Helm, Argo CD/GitOps
- Rede e segurança: Istio/Linkerd, mTLS, API gateway, WAF
- Dados: PostgreSQL, MongoDB, Kafka, Redis, TimescaleDB, InfluxDB
- Integrações industriais: MQTT, OPC UA, IIoT gateways, digital twin
- Plataforma IA: model registry, audit logs, prompt/version governance, evaluation metrics

## Como garantir continuidade para IA

- Padronize o estado do projeto em ".ai/project-manifest.yaml"
- Use ".ai/tasks/current-task.md" para foco claro
- Versione decisões via ADR na ".ai/architecture/adr/"
- Documente contratos e casos de uso antes da implementação
- Evite dependências não documentadas entre módulos
