import { Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { MenuPath, MenuAction, MenuNode, MenuModelRegistry, HelpTopic, HelpProvider } from './types';

export const MENU_PATHS = {
  FILE: ['file'],
  EDIT: ['edit'],
  SELECTION: ['selection'],
  VIEW: ['view'],
  GO: ['go'],
  RUN: ['run'],
  TERMINAL: ['terminal'],
  HELP: ['help'],
  PREFERENCES: ['preferences'],
  PANEL: ['panel'],
} as const;

export const MENU_GROUPS = {
  NAVIGATION: 'navigation',
  Z_OPEN: '1_open',
  Z_CLOSE: '9_close',
  Z_UNDO: '1_undo',
  Z_CUT: '3_cut',
  Z_MODIFICATION: '2_modification',
  Z_WORKSPACE: '1_workspace',
  Z_TOOLS: '3_tools',
} as const;

export class DefaultMenuModelRegistry implements MenuModelRegistry {
  private roots = new Map<string, MenuNode>();

  private getOrCreateRoot(path: MenuPath): MenuNode {
    const key = path[0];
    if (!this.roots.has(key)) {
      this.roots.set(key, {
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        order: 0,
        group: '',
        children: [],
      });
    }
    return this.roots.get(key) as MenuNode;
  }

  registerMenuAction(path: MenuPath, action: MenuAction): Disposable {
    const root = this.getOrCreateRoot(path);
    const node: MenuNode = {
      id: action.commandId,
      label: action.label,
      icon: action.icon,
      order: action.order ?? 100,
      group: action.group ?? '',
      children: [],
      action,
    };
    root.children.push(node);
    return { dispose: () => this.removeMenuAction(path, action.commandId) };
  }

  registerSubmenu(path: MenuPath, label: string, icon?: string): Disposable {
    const root = this.getOrCreateRoot(path);
    const existing = root.children.find(c => c.id === path.join('.'));
    if (existing) return { dispose: () => {} };
    const node: MenuNode = {
      id: path.join('.'),
      label,
      icon,
      order: 0,
      group: '',
      children: [],
    };
    root.children.push(node);
    return { dispose: () => { root.children = root.children.filter(c => c.id !== node.id); } };
  }

  getMenuNode(path: MenuPath): MenuNode | undefined {
    return this.roots.get(path[0]);
  }

  getMenuNodes(): Map<string, MenuNode> {
    return this.roots;
  }

  removeMenuAction(path: MenuPath, commandId: string): void {
    const root = this.roots.get(path[0]);
    if (!root) return;
    root.children = root.children.filter(c => c.id !== commandId);
  }

  getActionsForPath(path: MenuPath): MenuAction[] {
    const root = this.roots.get(path[0]);
    if (!root) return [];
    return root.children
      .filter((c): c is MenuNode & { action: MenuAction } => !!c.action)
      .map(c => c.action);
  }
}

const BUILT_IN_HELP_TOPICS: HelpTopic[] = [
  { id: 'profiles', title: 'User Profiles', description: 'Understanding IDEIA user profiles and presets', keywords: ['profile', 'preset', 'config', 'setup'], content: 'IDEIA offers five profiles: Solo Dev, Tech Lead, Automator, Enterprise, and Custom. Each profile pre-configures autonomy, security, and workflow settings.', category: 'getting-started', relatedTopics: ['config', 'autonomy'] },
  { id: 'config', title: 'Configuration Management', description: 'How to configure IDEIA settings', keywords: ['config', 'settings', 'preferences', 'options'], content: 'Use `ideia config set` to change settings, `ideia config show` to view current config, and `ideia config validate` to check validity.', category: 'getting-started', relatedTopics: ['profiles', 'security'] },
  { id: 'agents', title: 'AI Agents', description: 'Understanding IDEIA agent system', keywords: ['agent', 'ai', 'assistant', 'automation'], content: 'IDEIA uses specialized agents: Analyst, Architect, Programmer, Reviewer, Tester, and DevOps. Each agent has specific capabilities and autonomy levels.', category: 'core-concepts', relatedTopics: ['autonomy', 'security'] },
  { id: 'security', title: 'Security & Compliance', description: 'Security features and compliance checks', keywords: ['security', 'compliance', 'audit', 'policy', 'sandbox'], content: 'IDEIA includes sandbox execution, output validation, audit trails, policy enforcement, and automated red teaming for comprehensive security.', category: 'core-concepts', relatedTopics: ['policies', 'compliance'] },
  { id: 'radars', title: 'Technology Radars', description: 'Technology recommendation system', keywords: ['radar', 'technology', 'recommendation', 'stack'], content: 'Technology radars help you discover and evaluate new technologies for your stack. They provide scores, effort estimates, and rationales.', category: 'features', relatedTopics: ['evolution', 'dashboard'] },
  { id: 'adrs', title: 'Architecture Decision Records', description: 'Documenting architectural decisions', keywords: ['adr', 'architecture', 'decision', 'record', 'documentation'], content: 'ADRs capture architectural decisions with context, options considered, and rationales. IDEIA auto-generates ADRs for significant changes.', category: 'features', relatedTopics: ['evolution', 'config'] },
  { id: 'cli', title: 'CLI Commands', description: 'IDEIA command-line interface reference', keywords: ['cli', 'command', 'terminal', 'console'], content: 'IDEIA provides 150+ CLI commands organized by category. Use `ideia --help` to list all commands or `ideia <command> --help` for details.', category: 'reference', relatedTopics: ['config', 'profiles'] },
  { id: 'editors', title: 'Editor Integration', description: 'Using IDEIA with code editors', keywords: ['editor', 'theia', 'monaco', 'lsp', 'dap'], content: 'IDEIA integrates with Theia IDE via widgets, LSP providers, and DAP debugger. Monaco editor provides code editing with syntax highlighting.', category: 'features', relatedTopics: ['shortcuts', 'notifications'] },
  { id: 'notifications', title: 'Notification System', description: 'Understanding notifications and alerts', keywords: ['notification', 'alert', 'toast', 'badge', 'channel'], content: 'Notifications are delivered through 6 channels: Toast, Banner, Badge, Desktop, Webhook, and CLI. Each channel has configurable behavior.', category: 'features', relatedTopics: ['shortcuts', 'dashboard'] },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', description: 'IDEIA keyboard shortcut reference', keywords: ['shortcut', 'key', 'keyboard', 'hotkey', 'binding'], content: 'Press Ctrl+Shift+P for command palette, Ctrl+K for quick actions, F1 for contextual help. All shortcuts can be customized in settings.', category: 'reference', relatedTopics: ['editors', 'cli'] },
  { id: 'onboarding', title: 'Onboarding Wizard', description: 'Getting started with IDEIA setup wizard', keywords: ['onboarding', 'wizard', 'setup', 'first-time', 'guide'], content: 'The onboarding wizard guides you through profile selection, autonomy configuration, and initial workspace setup in just a few steps.', category: 'getting-started', relatedTopics: ['profiles', 'config'] },
  { id: 'dashboard', title: 'Dashboard & Metrics', description: 'Monitoring project health and metrics', keywords: ['dashboard', 'metrics', 'health', 'monitor', 'analytics'], content: 'The dashboard displays system health, project metrics, evolution charts, and recent activity. Use it to monitor the overall state of your IDEIA instance.', category: 'features', relatedTopics: ['radars', 'notifications'] },
  { id: 'context', title: 'Context Management', description: 'Managing config contexts for different environments', keywords: ['context', 'environment', 'production', 'development', 'switch'], content: 'IDEIA supports multiple contexts (production, development, emergency, learning) with automatic detection and switching based on workspace state.', category: 'core-concepts', relatedTopics: ['config', 'profiles'] },
  { id: 'evolution', title: 'Autonomous Evolution', description: 'How IDEIA evolves and optimizes itself', keywords: ['evolution', 'optimization', 'self-heal', 'autonomous', 'learning'], content: 'IDEIA continuously scans, analyzes, and optimizes itself through autonomous evolution. It detects gaps, proposes improvements, and applies changes with approval.', category: 'core-concepts', relatedTopics: ['agents', 'radars'] },
  { id: 'autonomy', title: 'Autonomy Levels', description: 'Understanding autonomy level system', keywords: ['autonomy', 'level', 'n0', 'n1', 'n2', 'n3', 'n4'], content: 'Autonomy levels range from N0 (manual) to N4 (fully autonomous). Each level controls what IDEIA can do without human approval, from suggesting to executing.', category: 'core-concepts', relatedTopics: ['agents', 'security'] },
  { id: 'isolation', title: 'Execution Isolation', description: 'Sandbox and execution isolation features', keywords: ['isolation', 'sandbox', 'execution', 'secure', 'container'], content: 'IDEIA runs code in a sandboxed environment with rule-based access control. Destructive commands are blocked, and suspicious operations require approval.', category: 'security', relatedTopics: ['security', 'policies'] },
  { id: 'policies', title: 'Policy Engine', description: 'Security and compliance policies', keywords: ['policy', 'rule', 'compliance', 'governance', 'cedar'], content: 'The policy engine enforces 27+ security patterns across Linux, Windows, and PowerShell. Policies control access, execution, and data handling.', category: 'security', relatedTopics: ['security', 'compliance'] },
  { id: 'compliance', title: 'Compliance Framework', description: 'Regulatory compliance and audit', keywords: ['compliance', 'lgpd', 'gdpr', 'audit', 'regulation'], content: 'IDEIA provides compliance checking for LGPD/GDPR, SOC 2, and ISO 27001. Automated audits generate reports with SHA-256 verified trails.', category: 'security', relatedTopics: ['policies', 'security'] },
  { id: 'memory', title: 'Memory & Knowledge', description: 'How IDEIA stores and retrieves knowledge', keywords: ['memory', 'knowledge', 'rag', 'vector', 'embedding', 'sqlite'], content: 'IDEIA uses a multi-tier memory system: SQLite+FTS5 for structured data, DuckDB for analytics, and vector embeddings for semantic search.', category: 'core-concepts', relatedTopics: ['context', 'learning'] },
  { id: 'learning', title: 'Learning Engine', description: 'How IDEIA learns from interactions', keywords: ['learning', 'training', 'pattern', 'adaption', 'feedback'], content: 'The learning engine captures interaction patterns, user preferences, and success metrics to continuously improve IDEIA behavior and recommendations.', category: 'core-concepts', relatedTopics: ['memory', 'evolution'] },
];

export class HelpRegistry {
  private topics: Map<string, HelpTopic> = new Map();
  private providers: HelpProvider[] = [];

  constructor() {
    for (const topic of BUILT_IN_HELP_TOPICS) {
      this.topics.set(topic.id, topic);
    }
  }

  registerHelpTopic(topic: HelpTopic): Disposable {
    this.topics.set(topic.id, topic);
    return { dispose: () => this.topics.delete(topic.id) };
  }

  registerHelpProvider(provider: HelpProvider): Disposable {
    this.providers.push(provider);
    return { dispose: () => { this.providers = this.providers.filter(p => p !== provider); } };
  }

  getTopic(id: string): HelpTopic | undefined {
    return this.topics.get(id);
  }

  getHelp(topicId: string): HelpTopic | undefined {
    const builtIn = this.topics.get(topicId);
    if (builtIn) return builtIn;
    for (const provider of this.providers) {
      const result = provider.getHelp(topicId);
      if (result) return result;
    }
    return undefined;
  }

  searchHelp(query: string): HelpTopic[] {
    const q = query.toLowerCase();
    const results: HelpTopic[] = [];
    for (const topic of this.topics.values()) {
      if (topic.title.toLowerCase().includes(q) ||
          topic.description.toLowerCase().includes(q) ||
          topic.keywords.some(k => k.includes(q)) ||
          topic.content.toLowerCase().includes(q)) {
        results.push(topic);
      }
    }
    for (const provider of this.providers) {
      results.push(...provider.searchHelp(query));
    }
    return results;
  }

  getTopicsByCategory(category: string): HelpTopic[] {
    const results = Array.from(this.topics.values()).filter(t => t.category === category);
    for (const provider of this.providers) {
      results.push(...provider.getTopicsByCategory(category));
    }
    return results;
  }

  getAllTopics(): HelpTopic[] {
    return Array.from(this.topics.values());
  }
}
