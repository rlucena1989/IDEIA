export type Locale = 'pt-BR' | 'en-US' | 'es';

export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

const TRANSLATIONS: Record<Locale, TranslationMap> = {
  'pt-BR': {
    common: { loading: 'Carregando...', error: 'Erro', success: 'Sucesso', warning: 'Aviso', info: 'Informação', save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', edit: 'Editar', search: 'Buscar', noResults: 'Nenhum resultado encontrado', retry: 'Tentar novamente', close: 'Fechar', back: 'Voltar', next: 'Avançar', finish: 'Concluir', reset: 'Redefinir', confirm: 'Confirmar', dismiss: 'Dispensar' },
    dashboard: { title: 'Painel', tasksCompleted: 'Tarefas Concluídas', failed: 'Falhas', activeAgents: 'Agentes Ativos', tokensUsed: 'Tokens Usados', avgScore: 'Pontuação Média', violations: 'Violações', coverage: 'Cobertura', services: 'Serviços', agents: 'Agentes', recentTasks: 'Tarefas Recentes', noAgents: 'Nenhum agente registrado', noTasks: 'Nenhuma tarefa recente' },
    notifications: { title: 'Notificações', all: 'Todas', unread: 'Não lidas', clear: 'Limpar', noNotifications: 'Nenhuma notificação', now: 'agora', minAgo: 'min atrás', hAgo: 'h atrás' },
    help: { title: 'Ajuda', glossary: 'Glossário', contexts: 'Contextos', search: 'Pesquisar ajuda...', noTerms: 'Nenhum termo encontrado.', noContexts: 'Nenhum contexto encontrado.' },
    controlTower: { title: 'Torre de Controle', autonomyLevel: 'Nível de Autonomia', current: 'Atual', systemHealth: 'Saúde do Sistema', activeAgents: 'Agentes Ativos', tasksInQueue: 'Tarefas na Fila', recentErrors: 'Erros Recentes', emergencyBrake: 'FREIO DE EMERGÊNCIA (E-Stop)', estopActive: 'E-STOP ATIVO — Clique para liberar', release: 'Liberar freio de emergência', activate: 'Ativar freio de emergência' },
    selfOpt: { title: 'Auto-Otimização', runOptimization: 'Executar Auto-Otimização', running: 'Executando...', viewBottlenecks: 'Ver Gargalos', resetMetrics: 'Redefinir Métricas', throughput: 'Taxa de Transferência' },
  },
  'en-US': {
    common: { loading: 'Loading...', error: 'Error', success: 'Success', warning: 'Warning', info: 'Information', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', search: 'Search', noResults: 'No results found', retry: 'Retry', close: 'Close', back: 'Back', next: 'Next', finish: 'Finish', reset: 'Reset', confirm: 'Confirm', dismiss: 'Dismiss' },
    dashboard: { title: 'Dashboard', tasksCompleted: 'Tasks Completed', failed: 'Failed', activeAgents: 'Active Agents', tokensUsed: 'Tokens Used', avgScore: 'Average Score', violations: 'Violations', coverage: 'Coverage', services: 'Services', agents: 'Agents', recentTasks: 'Recent Tasks', noAgents: 'No agents registered', noTasks: 'No recent tasks' },
    notifications: { title: 'Notifications', all: 'All', unread: 'Unread', clear: 'Clear', noNotifications: 'No notifications', now: 'now', minAgo: 'min ago', hAgo: 'h ago' },
    help: { title: 'Help', glossary: 'Glossary', contexts: 'Contexts', search: 'Search help...', noTerms: 'No terms found.', noContexts: 'No contexts found.' },
    controlTower: { title: 'Control Tower', autonomyLevel: 'Autonomy Level', current: 'Current', systemHealth: 'System Health', activeAgents: 'Active Agents', tasksInQueue: 'Tasks in Queue', recentErrors: 'Recent Errors', emergencyBrake: 'EMERGENCY BRAKE (E-Stop)', estopActive: 'E-STOP ACTIVE — Click to release', release: 'Release emergency brake', activate: 'Activate emergency brake' },
    selfOpt: { title: 'Self-Optimization', runOptimization: 'Run Auto-Optimization', running: 'Running...', viewBottlenecks: 'View Bottlenecks', resetMetrics: 'Reset Metrics', throughput: 'Throughput' },
  },
  'es': {
    common: { loading: 'Cargando...', error: 'Error', success: 'Éxito', warning: 'Advertencia', info: 'Información', save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', search: 'Buscar', noResults: 'Sin resultados', retry: 'Reintentar', close: 'Cerrar', back: 'Volver', next: 'Siguiente', finish: 'Finalizar', reset: 'Restablecer', confirm: 'Confirmar', dismiss: 'Descartar' },
    dashboard: { title: 'Panel', tasksCompleted: 'Tareas Completadas', failed: 'Fallos', activeAgents: 'Agentes Activos', tokensUsed: 'Tokens Usados', avgScore: 'Puntuación Media', violations: 'Violaciones', coverage: 'Cobertura', services: 'Servicios', agents: 'Agentes', recentTasks: 'Tareas Recientes', noAgents: 'No hay agentes registrados', noTasks: 'No hay tareas recientes' },
    notifications: { title: 'Notificaciones', all: 'Todas', unread: 'No leídas', clear: 'Limpiar', noNotifications: 'Sin notificaciones', now: 'ahora', minAgo: 'min atrás', hAgo: 'h atrás' },
    help: { title: 'Ayuda', glossary: 'Glosario', contexts: 'Contextos', search: 'Buscar ayuda...', noTerms: 'No se encontraron términos.', noContexts: 'No se encontraron contextos.' },
    controlTower: { title: 'Torre de Control', autonomyLevel: 'Nivel de Autonomía', current: 'Actual', systemHealth: 'Salud del Sistema', activeAgents: 'Agentes Activos', tasksInQueue: 'Tareas en Cola', recentErrors: 'Errores Recientes', emergencyBrake: 'FRENO DE EMERGENCIA (E-Stop)', estopActive: 'E-STOP ACTIVO — Click para liberar', release: 'Liberar freno de emergencia', activate: 'Activar freno de emergencia' },
  },
};

export class I18n {
  private locale: Locale = 'pt-BR';
  private translations: TranslationMap;

  constructor(locale?: Locale) {
    this.locale = locale ?? this.detectLocale();
    this.translations = TRANSLATIONS[this.locale] ?? TRANSLATIONS['pt-BR'];
  }

  t(path: string, fallback?: string): string {
    const parts = path.split('.');
    let current: unknown = this.translations;
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return fallback ?? path;
      current = (current as Record<string, unknown>)[part];
    }
    return (typeof current === 'string') ? current : (fallback ?? path);
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
    this.translations = TRANSLATIONS[locale] ?? TRANSLATIONS['pt-BR'];
  }

  getLocale(): Locale { return this.locale; }

  getAvailableLocales(): Array<{ code: Locale; name: string }> {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'es', name: 'Español' },
    ];
  }

  private detectLocale(): Locale {
    try {
      const env = process.env.LANG ?? process.env.LC_ALL ?? '';
      if (env.includes('pt_BR')) return 'pt-BR';
      if (env.includes('es')) return 'es';
      return 'en-US';
    } catch { return 'en-US'; }
  }
}

export const i18n = new I18n();

export function t(path: string, fallback?: string): string {
  return i18n.t(path, fallback);
}
