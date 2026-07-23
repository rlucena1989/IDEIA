/** Tipo que define upgrader category. */
export type UpgraderCategory = 'api' | 'database' | 'frontend' | 'auth' | 'testing' | 'performance' | 'security' | 'architecture' | 'code_style';

/** Interface que define a estrutura de upgrade suggestion. */
export interface UpgradeSuggestion {
  id: string;
  category: UpgraderCategory;
  description: string;
  oldPattern: string;
  newPattern: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  breaking: boolean;
  confidence: number;
  automated: boolean;
}

/** Interface que define a estrutura de upgrade plan. */
export interface UpgradePlan {
  suggestions: UpgradeSuggestion[];
  total: number;
  breakingCount: number;
  autoFixableCount: number;
  estimatedEffort: string;
  summary: string;
}

const BUILT_IN_UPGRADES: UpgradeSuggestion[] = [
  { id: 'api-express-fastify', category: 'api', description: 'Migrar de Express para Fastify', oldPattern: 'express()', newPattern: 'fastify()', benefit: '2-3x mais requisicoes/segundo', effort: 'low', risk: 'medium', breaking: true, confidence: 0.85, automated: false },
  { id: 'api-fetch-axios', category: 'api', description: 'Substituir fetch nativo por axios', oldPattern: 'fetch(', newPattern: 'axios.get(', benefit: 'Melhor tratamento de erros e interceptors', effort: 'low', risk: 'low', breaking: false, confidence: 0.9, automated: true },
  { id: 'db-raw-prisma', category: 'database', description: 'Migrar SQL raw para Prisma ORM', oldPattern: 'SELECT * FROM', newPattern: "prisma.user.findMany()", benefit: 'Type safety e migrations automaticas', effort: 'high', risk: 'medium', breaking: true, confidence: 0.75, automated: false },
  { id: 'db-callback-async', category: 'database', description: 'Converter callbacks para async/await', oldPattern: '.then(', newPattern: 'await ', benefit: 'Codigo mais legivel e tratamento de erros', effort: 'low', risk: 'medium', breaking: false, confidence: 0.9, automated: true },
  { id: 'fe-class-hooks', category: 'frontend', description: 'Migrar class components para hooks', oldPattern: 'extends React.Component', newPattern: 'function ', benefit: 'Reutilizacao de logica com hooks', effort: 'medium', risk: 'medium', breaking: true, confidence: 0.8, automated: false },
  { id: 'fe-jquery-react', category: 'frontend', description: 'Migrar jQuery para React', oldPattern: '$(', newPattern: 'useState(', benefit: 'Melhor manutencao e performance', effort: 'high', risk: 'high', breaking: true, confidence: 0.7, automated: false },
  { id: 'fe-css-tailwind', category: 'frontend', description: 'Migrar CSS manual para Tailwind', oldPattern: '.class {', newPattern: 'className="', benefit: 'Zero runtime CSS e melhor DX', effort: 'medium', risk: 'low', breaking: false, confidence: 0.85, automated: false },
  { id: 'auth-jwt-session', category: 'auth', description: 'Migrar sessions para JWT', oldPattern: 'req.session', newPattern: 'jwt.verify(', benefit: 'Stateless authentication', effort: 'medium', risk: 'high', breaking: true, confidence: 0.7, automated: false },
  { id: 'auth-basic-oauth', category: 'auth', description: 'Migrar Basic Auth para OAuth2', oldPattern: 'Basic ', newPattern: 'Bearer ', benefit: 'Suporte a escopos e delegacao', effort: 'high', risk: 'high', breaking: true, confidence: 0.65, automated: false },
  { id: 'test-mocha-jest', category: 'testing', description: 'Migrar de Mocha para Jest', oldPattern: "describe('", newPattern: "describe('", benefit: 'Zero config e built-in assertions', effort: 'low', risk: 'medium', breaking: false, confidence: 0.9, automated: true },
  { id: 'test-sinon-vi', category: 'testing', description: 'Migrar Sinon para vi.fn()', oldPattern: 'sinon.stub()', newPattern: 'vi.fn()', benefit: 'Integracao nativa com Vitest', effort: 'low', risk: 'low', breaking: false, confidence: 0.95, automated: true },
  { id: 'perf-lodash-native', category: 'performance', description: 'Substituir Lodash por APIs nativas', oldPattern: '_.map(', newPattern: 'Array.prototype.map(', benefit: 'Reducao de bundle em 70kb+', effort: 'low', risk: 'low', breaking: false, confidence: 0.95, automated: true },
  { id: 'perf-moment-dayjs', category: 'performance', description: 'Migrar Moment.js para Day.js', oldPattern: "moment(", newPattern: "dayjs(", benefit: 'Reducao de 200kb+ para 2kb', effort: 'low', risk: 'medium', breaking: true, confidence: 0.85, automated: false },
  { id: 'sec-eval-avoid', category: 'security', description: 'Remover uso de eval()', oldPattern: 'eval(', newPattern: 'JSON.parse(', benefit: 'Elimina vetor de injection', effort: 'low', risk: 'medium', breaking: false, confidence: 0.95, automated: true },
  { id: 'sec-innerhtml-safe', category: 'security', description: 'Substituir innerHTML por textContent', oldPattern: '.innerHTML', newPattern: '.textContent', benefit: 'Previne XSS', effort: 'low', risk: 'low', breaking: false, confidence: 0.95, automated: true },
  { id: 'arch-commonjs-esm', category: 'architecture', description: 'Migrar CommonJS para ES Modules', oldPattern: "require('", newPattern: "import ", benefit: 'Tree-shaking e melhor compatibilidade', effort: 'medium', risk: 'medium', breaking: true, confidence: 0.85, automated: false },
  { id: 'arch-js-ts', category: 'architecture', description: 'Migrar JavaScript para TypeScript', oldPattern: '// @ts-check', newPattern: ': type', benefit: 'Type safety e melhor DX', effort: 'high', risk: 'medium', breaking: false, confidence: 0.8, automated: false },
  { id: 'style-var-let', category: 'code_style', description: 'Substituir var por const/let', oldPattern: 'var ', newPattern: 'const ', benefit: 'Block scoping e imutabilidade', effort: 'low', risk: 'low', breaking: false, confidence: 0.95, automated: true },
  { id: 'style-func-arrow', category: 'code_style', description: 'Converter function para arrow functions', oldPattern: 'function(', newPattern: '(', benefit: 'Arrow functions mantem this lexico', effort: 'low', risk: 'low', breaking: false, confidence: 0.8, automated: false },
  { id: 'style-concat-template', category: 'code_style', description: 'Substituir concatenacao por template strings', oldPattern: "+ '", newPattern: '`${', benefit: 'Strings mais legiveis', effort: 'low', risk: 'low', breaking: false, confidence: 0.95, automated: true },
];

/** Classe responsável por processa upgrader. */
export class SolutionUpgrader {
  private upgrades: Map<string, UpgradeSuggestion>;

  constructor(customUpgrades?: UpgradeSuggestion[]) {
    this.upgrades = new Map();
    for (const u of (customUpgrades || BUILT_IN_UPGRADES)) {
      this.upgrades.set(u.id, u);
    }
  }

  analyze(code: string): UpgradePlan {
    const suggestions: UpgradeSuggestion[] = [];
    for (const upgrade of this.upgrades.values()) {
      if (code.includes(upgrade.oldPattern)) {
        suggestions.push(upgrade);
      }
    }
    const breakingCount = suggestions.filter(s => s.breaking).length;
    const autoFixableCount = suggestions.filter(s => s.automated).length;
    const estimatedEffort = this.estimateEffort(suggestions);
    const summary = suggestions.length > 0
      ? `${suggestions.length} upgrades detectados: ${breakingCount} breaking, ${autoFixableCount} auto-fixaveis. Esforco estimado: ${estimatedEffort}.`
      : `Nenhum upgrade detectado para o codigo atual.`;

    return { suggestions, total: suggestions.length, breakingCount, autoFixableCount, estimatedEffort, summary };
  }

  private estimateEffort(suggestions: UpgradeSuggestion[]): string {
    const scores = suggestions.map(s => s.effort === 'high' ? 5 : s.effort === 'medium' ? 3 : 1);
    const total = scores.reduce((a, b) => a + b, 0);
    if (total === 0) return 'Nenhum';
    const hours = Math.round(total * 0.5 * 10) / 10;
    return `~${hours}h (${suggestions.length} upgrades)`;
  }
}
