import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { LangGraphNodeFunction } from '../langgraph-graph';

export function createSupervisorNode(): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const hasErrors = state.errors.length > 0;
    const decision = hasErrors 
      ? `Erros detectados: ${state.errors.length}` 
      : 'Fluxo normal, sem erros';
    
    return {
      decisions: [
        ...state.decisions,
        decision,
      ],
      completed: true,
      currentRole: 'supervisor' as LangGraphAgentRole,
    };
  };
}
