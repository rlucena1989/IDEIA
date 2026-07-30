import { KeybindingRegistry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('tip-display');

export type UserProfile = 'beginner' | 'intermediate' | 'expert';

export interface Tip {
  id: string;
  message: string;
  context?: string;
  profile: UserProfile[];
  category: string;
}

const BUILT_IN_TIPS: Tip[] = [
  { id: 'tip-1', message: 'Pressione Ctrl+K para abrir a paleta de comandos.', profile: ['beginner'], category: 'general' },
  { id: 'tip-2', message: 'Use Ctrl+Shift+P para buscar qualquer comando.', profile: ['beginner'], category: 'general' },
  { id: 'tip-3', message: 'Agentes podem ser invocados com Ctrl+Enter.', profile: ['beginner'], category: 'agents' },
  { id: 'tip-4', message: 'Checkpoints salvam seu progresso automaticamente.', profile: ['beginner', 'intermediate'], category: 'workflow' },
  { id: 'tip-5', message: 'Use F1 para ajuda contextual sensível ao widget atual.', profile: ['beginner'], category: 'general' },
  { id: 'tip-6', message: 'Quality Gates podem ser pulados com --force em emergências.', profile: ['intermediate', 'expert'], category: 'workflow' },
  { id: 'tip-7', message: 'O prompt pipeline reduz custos de token em até 90%.', profile: ['intermediate'], category: 'general' },
  { id: 'tip-8', message: 'Você pode definir perfis de autonomia diferentes por projeto.', profile: ['intermediate'], category: 'agents' },
  { id: 'tip-9', message: 'Use IDEIA audit --ci para verificar compliance sem modificar nada.', profile: ['intermediate', 'expert'], category: 'security' },
  { id: 'tip-10', message: 'Red teaming automatizado roda semanalmente no CI.', profile: ['expert'], category: 'security' },
  { id: 'tip-11', message: 'Contratos entre módulos são validados com Contract.pre().', profile: ['intermediate', 'expert'], category: 'architecture' },
  { id: 'tip-12', message: 'O barramento NATS JetStream garante entrega assíncrona de eventos.', profile: ['expert'], category: 'architecture' },
  { id: 'tip-13', message: 'Use IDEIA status para ver métricas em tempo real.', profile: ['beginner'], category: 'general' },
  { id: 'tip-14', message: 'SBOM é gerado automaticamente a cada release.', profile: ['expert'], category: 'security' },
  { id: 'tip-15', message: 'Deploys canários (10/50/100%) minimizam risco de release.', profile: ['intermediate', 'expert'], category: 'workflow' },
  { id: 'tip-16', message: 'Use Ctrl+Shift+E para abrir o explorador de arquivos.', profile: ['beginner'], category: 'navigation' },
  { id: 'tip-17', message: 'O painel de busca é acessado com Ctrl+Shift+F.', profile: ['beginner'], category: 'navigation' },
  { id: 'tip-18', message: 'Auto-save pode ser configurado em Config > Editor > Auto Save.', profile: ['beginner', 'intermediate'], category: 'editing' },
  { id: 'tip-19', message: 'Undo/Redo (Ctrl+Z/Ctrl+Shift+Z) tem stack ilimitado configurável.', profile: ['beginner'], category: 'editing' },
  { id: 'tip-20', message: 'O terminal embutido é acessado com Ctrl+`.', profile: ['beginner'], category: 'terminal' },
  { id: 'tip-21', message: 'Scrollback search no terminal destaca matches em tempo real.', profile: ['intermediate'], category: 'terminal' },
  { id: 'tip-22', message: 'Streaming chat pode ser cancelado com o botão X durante a resposta.', profile: ['beginner', 'intermediate'], category: 'chat' },
  { id: 'tip-23', message: 'Coachmarks pós-onboarding guiam você por funcionalidades avançadas.', profile: ['beginner', 'intermediate'], category: 'onboarding' },
  { id: 'tip-24', message: 'O schema-aware editor valida JSON em tempo real com sugestões.', profile: ['intermediate', 'expert'], category: 'editing' },
  { id: 'tip-25', message: 'Dashboards com gráficos (pie, bar) mostram distribuição de métricas.', profile: ['intermediate'], category: 'dashboard' },
];

export class TipDisplay {
  private registry: KeybindingRegistry;
  private tips: Tip[];
  private dismissed: Set<string> = new Set();
  private profile: UserProfile;
  private tipIndex = 0;

  constructor(
    registry: KeybindingRegistry,
    options?: {
      tips?: Tip[];
      profile?: UserProfile;
    },
  ) {
    this.registry = registry;
    this.tips = options?.tips ?? BUILT_IN_TIPS;
    this.profile = options?.profile ?? 'beginner';
  }

  showTip(context?: string): Tip | undefined {
    const available = this.getTipsForProfile(context);
    if (available.length === 0) return undefined;
    const index = Math.floor(Math.random() * available.length);
    return available[index];
  }

  getTipOfTheDay(): Tip {
    const dayIndex = new Date().getDate() % this.tips.length;
    return this.tips[dayIndex];
  }

  getTipForContext(context: string): Tip | undefined {
    const ctxTips = this.tips.filter(t => t.category === context && !this.dismissed.has(t.id));
    if (ctxTips.length === 0) return undefined;
    return ctxTips[Math.floor(Math.random() * ctxTips.length)];
  }

  getNextTip(): Tip | undefined {
    const available = this.getTipsForProfile();
    if (available.length === 0) return undefined;
    this.tipIndex = (this.tipIndex + 1) % available.length;
    return available[this.tipIndex];
  }

  getRandomTip(): Tip | undefined {
    const available = this.getTipsForProfile();
    if (available.length === 0) return undefined;
    return available[Math.floor(Math.random() * available.length)];
  }

  dismissTip(id: string): void {
    this.dismissed.add(id);
  }

  setProfile(profile: UserProfile): void {
    this.profile = profile;
  }

  getDismissedTips(): string[] {
    return Array.from(this.dismissed);
  }

  resetDismissed(): void {
    this.dismissed.clear();
  }

  getAllTips(): Tip[] {
    return [...this.tips];
  }

  getTipsByCategory(category: string): Tip[] {
    return this.tips.filter(t => t.category === category);
  }

  private getTipsForProfile(context?: string): Tip[] {
    const profileLevels: Record<UserProfile, number> = {
      beginner: 0,
      intermediate: 1,
      expert: 2,
    };
    const currentLevel = profileLevels[this.profile];

    return this.tips.filter(t => {
      if (this.dismissed.has(t.id)) return false;
      const hasProfile = t.profile.some(p => profileLevels[p] <= currentLevel);
      if (!hasProfile) return false;
      if (context && t.context && t.context !== context) return false;
      return true;
    });
  }
}
