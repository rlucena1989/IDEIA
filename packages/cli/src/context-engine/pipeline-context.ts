import { ContextEngine } from './index';

export class ContextInjector {
  async inject(prompt: string, contextEngine: ContextEngine): Promise<{ enriched: string; injected: string[] }> {
    const injected: string[] = [];
    let enriched = prompt;
    if (prompt.length > 20) {
      const context = await contextEngine.getContext();
      if (context) {
        injected.push('project-context');
        enriched = enriched + '\n\n[Contexto do Projeto]\n' + JSON.stringify(context, null, 2).slice(0, 2000);
      }
    }
    return { enriched, injected };
  }
}
