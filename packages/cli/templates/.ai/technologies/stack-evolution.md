# Evolução da Stack

## MVP

- Node.js + TypeScript
- Express/NestJS/Fastify
- PostgreSQL/SQLite/MongoDB
- OpenAPI para documentação
- Testes com Jest
- Docker para ambiente local

## Projeto de médio porte

- Introduzir observabilidade: Prometheus + Grafana
- Definir CI/CD simples: GitHub Actions ou GitLab CI
- Usar contrato de API e especificações OpenAPI
- Agregar testes de integração e contract testing
- Criar ADRs e documentação de módulo

## Grande empresa / sistema industrial

- Domínio explícito: DDD com bounded contexts
- Microsserviços ou arquitetura híbrida
- Event sourcing + CQRS para fluxos complexos
- Malha de serviço (service mesh) e API gateway
- GitOps para infraestrutura e deploys automáticos
- Integrações IIoT: MQTT, OPC UA, Digital Twin
- Governança de IA: versionamento de prompts, monitoramento de modelos e retraining

## Como a IA pode continuar em qualquer estágio

- Preserve o contexto do projeto em ".ai/context/ai-handoff.md"
- Defina tarefas claras em ".ai/tasks/current-task.md"
- Documente decisões em ADRs e ".ai/architecture/"
- Mantenha o catálogo de erros e contratos atualizados
- Use checklists e quality gates para manter consistência
