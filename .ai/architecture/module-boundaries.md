# Limites de Módulo (Module Boundaries)
> Versão: 1.0 | Atualizado em: 04/07/2026

## Arquitetura de Módulos
Este projeto adota o padrão **Modular Monolith**. Cada módulo representa uma capacidade funcional independente, seguindo princípios de Clean Architecture.

## Regras de Fronteira (Fitness Functions)
1. **Comunicação Inter-módulos:** Um módulo NUNCA deve importar arquivos internos de outro módulo. O acesso deve ser feito EXCLUSIVAMENTE pela API pública (`index.ts` ou Facade) do módulo alvo.
2. **Independência de Banco de Dados:** Módulos não devem fazer JOINs diretos nas tabelas de outros módulos. Dados compartilhados devem trafegar através de interfaces ou eventos assíncronos (CQRS/Event Emitters).
3. **Isolamento de Domínio:** A pasta `domain/` de um módulo só pode depender de ferramentas padrão da linguagem, nunca de frameworks externos ou de outros módulos.

Essas regras são validadas automaticamente no CI via `ai:boundaries`.
