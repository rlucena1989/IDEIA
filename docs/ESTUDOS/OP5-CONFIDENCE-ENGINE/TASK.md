# TASK-ESTUDO-OP5: Criar packages/confidence/

**Prioridade:** 🔴 Alta (score 4.1)  
**Esforço:** ~25h  
**Criada em:** 2026-07-22  
**Origem:** OP5-CONFIDENCE-ENGINE/README.md (análise vs código real)

## Descrição

Centralizar confidence scoring em packages/confidence/ com SemanticClassifier, ConsensusEngine, Advanced Guardrails, integrando components existentes (acceleration/consensus, classifier, context-builder/scorer)

## Critérios de Aceite

1. Pacote criado em packages/ com estrutura src/ + __tests__/
2. Testes unitários passando (mín. 80% cobertura)
3. Documentação README.md no pacote
4. Integração com EventBus via NATS

## Dependências

- Nenhuma (pacote standalone)
