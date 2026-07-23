export interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  reasoning?: string;
}

export type IntentClassifierFn = (input: string) => IntentResult | Promise<IntentResult>;

const KEYWORD_MAP: Array<{ patterns: RegExp[]; intent: string; extract: (m: RegExpMatchArray) => Record<string, string> }> = [
  { patterns: [/criar\s+(?:[\w\s]+?\s+)?(projeto|app|sistema|api|crud)\b/i, /create\s+(?:[\w\s]+?\s+)?(project|app|system|api|crud)\b/i], intent: 'create_project', extract: (m) => ({ type: (m[1] || 'project').toLowerCase() }) },
  { patterns: [/adicionar?\s+(?:um[a]?\s+)?(feature|funcionalidade|modulo|função)/i, /add\s+(?:a\s+)?(feature|functionality|module)/i], intent: 'add_feature', extract: () => ({}) },
  { patterns: [/corrigir?\s+(?:um\s+)?(bug|erro|issue|problema)/i, /fix\s+(?:a\s+)?(bug|error|issue)/i], intent: 'fix_bug', extract: () => ({}) },
  { patterns: [/deploy|publicar|release|implantar/i], intent: 'deploy', extract: () => ({}) },
  { patterns: [/testar|teste|testar?\s*(?:testes|unitarios|integração)/i, /rodar\s+testes/i], intent: 'run_tests', extract: () => ({}) },
  { patterns: [/refatorar|refactor|refatoração/i], intent: 'refactor', extract: () => ({}) },
  { patterns: [/documentar|documentação|docs|gerar\s+docs/i], intent: 'generate_docs', extract: () => ({}) },
  { patterns: [/configurar|config|setup|configuração/i], intent: 'configure', extract: () => ({}) },
  { patterns: [/analisar|analyze|auditar|audit|análise/i], intent: 'analyze', extract: () => ({}) },
  { patterns: [/monitorar|monitor|observabilidade/i], intent: 'monitor', extract: () => ({}) },
  { patterns: [/aprender|learn|treinar|train/i], intent: 'learn', extract: () => ({}) },
  { patterns: [/status|verificar|check|health|diagnóstico/i], intent: 'check_status', extract: () => ({}) },
];

export function keywordClassifier(input: string): IntentResult {
  for (const entry of KEYWORD_MAP) {
    for (const pattern of entry.patterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          intent: entry.intent,
          confidence: 0.6,
          entities: entry.extract(match),
          reasoning: `Matched pattern: ${pattern.source}`,
        };
      }
    }
  }
  return { intent: 'unknown', confidence: 0.1, entities: {}, reasoning: 'No pattern matched' };
}

export async function llmClassifier(input: string, llmCall?: (prompt: string) => Promise<string>): Promise<IntentResult> {
  if (!llmCall) return keywordClassifier(input);

  const prompt = `Classify this user request into exactly one intent. Return JSON with: intent (string), confidence (0-1), entities (object), reasoning (short).

Available intents:
- create_project: Create new project/app/system
- add_feature: Add new feature/module to existing project
- fix_bug: Fix a bug or issue
- deploy: Deploy to environment
- run_tests: Run tests
- refactor: Refactor code
- generate_docs: Generate documentation
- configure: Configuration/setup
- analyze: Analyze code/project
- monitor: Monitoring/observability
- learn: Learning/training
- check_status: Check status/health
- unknown: None of the above

User: "${input}"
JSON:`;

  try {
    const response = await llmCall(prompt);
    const json = JSON.parse(response);
    return {
      intent: json.intent || 'unknown',
      confidence: json.confidence || 0.3,
      entities: json.entities || {},
      reasoning: json.reasoning || 'LLM classification',
    };
  } catch {
    return keywordClassifier(input);
  }
}

export function createClassifier(llmCall?: (prompt: string) => Promise<string>): IntentClassifierFn {
  return (input: string) => llmClassifier(input, llmCall);
}
