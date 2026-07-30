import { IntentClassification } from './pipeline-types';

const INTENT_PATTERNS: Array<{ pattern: RegExp; category: IntentClassification['category']; confidence: number }> = [
  { pattern: /\b(bug|erro|falha|quebr|corrig|arruma|conserta|fix|issue|defeito|crash|exception)\b/i, category: 'bugfix', confidence: 0.85 },
  { pattern: /\b(implementa|cria|adiciona|novo|feature|criar|create|add|new|funcionalidade|melhoria|implementar|criacao|adicional)\b/i, category: 'feature', confidence: 0.8 },
  { pattern: /\b(refatora|refactor|refatorar|melhora|simplifica|otimiza|organiza|clean|rewrite|reestrutura|modulariza)\b/i, category: 'refactor', confidence: 0.85 },
  { pattern: /\b(como|what|how|qual|explique|explain|significa|mean|dúvida|doubt|help|ajuda|entender|understand)\b/i, category: 'question', confidence: 0.9 },
  { pattern: /\b(doc|documenta|readme|manual|tutorial|guia|guide|wiki|changelog|instrução|instruction)\b/i, category: 'documentation', confidence: 0.85 },
  { pattern: /\b(deploy|devops|ci|cd|docker|container|kubernetes|k8s|pipeline|infra|nuvem|cloud|monitoração|monitoring)\b/i, category: 'devops', confidence: 0.85 },
  { pattern: /\b(test|teste|spec|assert|expect|mock|cobertura|coverage|unit|integration|e2e)\b/i, category: 'test', confidence: 0.85 },
  { pattern: /\b(revisa|review|audita|codereview|code review|qualidade|quality|code quality|padrão|pattern)\b/i, category: 'review', confidence: 0.85 },
];

const SCOPE_PATTERNS: Array<{ pattern: RegExp; scope: IntentClassification['scope'] }> = [
  { pattern: /\b(arquivo|file|função|function|classe|class|método|method)\b/i, scope: 'single_file' },
  { pattern: /\b(módulo|module|pacote|package|componente|component|serviço|service)\b/i, scope: 'module' },
  { pattern: /\b(multi|vários|several|multiple|cross|entidade|entity|integrado|integrated)\b/i, scope: 'cross_module' },
  { pattern: /\b(projeto|project|sistema|system|workspace|completo|full|inteiro|whole|entire|global)\b/i, scope: 'project' },
  { pattern: /\b(arquivo|file|função|function|classe|class)\b/i, scope: 'single_file' },
];

export class IntentClassifier {
  classify(prompt: string): IntentClassification {
    const category = this._classifyCategory(prompt);
    const scope = this._classifyScope(prompt);
    const urgency = this._classifyUrgency(prompt);
    const language = this._detectLanguage(prompt);
    return { category, scope, urgency, language, confidence: category === 'unknown' ? 0.3 : 0.85 };
  }

  private _classifyCategory(prompt: string): IntentClassification['category'] {
    for (const { pattern, category, confidence } of INTENT_PATTERNS) {
      if (pattern.test(prompt) && confidence >= 0.8) return category;
    }
    return 'unknown';
  }

  private _classifyScope(prompt: string): IntentClassification['scope'] {
    for (const { pattern, scope } of SCOPE_PATTERNS) {
      if (pattern.test(prompt)) return scope;
    }
    return 'multi_file';
  }

  private _classifyUrgency(prompt: string): IntentClassification['urgency'] {
    if (/\b(urgent|crític|crash|emergency|bloquead|blocker|produção|production|down|imediato|immediate|ASAP|asap)\b/i.test(prompt)) return 'critical';
    if (/\b(logo|soon|importante|important|high priority|alta|depressa|quick|rapid)\b/i.test(prompt)) return 'high';
    if (/\b(pode|can you|maybe|talvez|eventual|quando|when|sugestão|suggestion)\b/i.test(prompt)) return 'low';
    return 'medium';
  }

  private _detectLanguage(prompt: string): string | undefined {
    const langs: Array<{ pattern: RegExp; lang: string }> = [
      { pattern: /\b(python|django|flask|pytest)\b/i, lang: 'python' },
      { pattern: /\b(java|spring|jvm|kotlin|android)\b/i, lang: 'java' },
      { pattern: /\b(javascript|typescript|node|react|angular|vue|next|nest|express|tsx|jsx)\b/i, lang: 'typescript' },
      { pattern: /\b(golang|go\s|goroutine)\b/i, lang: 'go' },
      { pattern: /\b(rust|cargo|crates)\b/i, lang: 'rust' },
      { pattern: /\b(ruby|rails|gem|bundler)\b/i, lang: 'ruby' },
      { pattern: /\b(php|laravel|symfony|composer)\b/i, lang: 'php' },
      { pattern: /\b(c#|csharp|dotnet|\\.net|blazor)\b/i, lang: 'csharp' },
    ];
    for (const { pattern, lang } of langs) {
      if (pattern.test(prompt)) return lang;
    }
    return undefined;
  }
}
