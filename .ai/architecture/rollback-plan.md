# Plano de Rollback e Autocura
> Versão: 1.0 | Atualizado em: 04/07/2026

## Procedimento de Emergência
Se um commit ou PR gerado por IA quebrar a pipeline de produção ou corromper a estabilidade do sistema, o seguinte fluxo deve ser adotado:

1. **Reversão Imediata (Git Revert):** O PR que causou a regressão deve ser revertido imediatamente no repositório.
2. **Análise Pós-Morte Assistida (Post-Mortem):** A falha deve ser repassada ao LLM com a flag estruturada detalhando a mensagem de erro do CI ou log de produção.
3. **Atualização da Governança:** Antes de tentar recriar a feature, a IA deve atualizar o `error-catalog.md` e os arquivos `.ai/patterns/` (ou `decisions-log.md`) com a lição aprendida, para que não cometa o mesmo erro em sessões futuras.
4. **Self-Heal:** Quando disponível, acionar `npm run ai:heal` para tentar re-estabelecer o alinhamento arquitetural do projeto antes de nova iteração.
