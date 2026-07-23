/** Interface que define a estrutura de u x finding. */
export interface UXFinding {
  category: 'accessibility' | 'usability' | 'performance' | 'consistency' | 'feedback' | 'error-handling' | 'mobile';
  issue: string;
  severity: 'info' | 'warning' | 'error';
  line: number;
  suggestion: string;
}

/** Interface que define a estrutura de u x report. */
export interface UXReport {
  findings: UXFinding[];
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  score: number;
  summary: string;
}

const UX_RULES: Array<{ category: UXFinding['category']; pattern: RegExp; issue: string; severity: UXFinding['severity']; suggestion: string }> = [
  { category: 'accessibility', pattern: /<img[^>]*src=["'][^"']*["'][^>]*\/?>/gi, issue: 'Imagem sem atributo alt', severity: 'error', suggestion: 'Adicione alt text descritivo' },
  { category: 'accessibility', pattern: /<button[^>]*onclick\s*=\s*["'][^"']*["'][^>]*>/gi, issue: 'Botao sem type', severity: 'warning', suggestion: 'Adicione type="button" para prevenir submissao acidental' },
  { category: 'usability', pattern: /placeholder=["'][^"']{30,}["']/gi, issue: 'Placeholder muito longo', severity: 'info', suggestion: 'Placeholder deve ser conciso (< 30 chars)' },
  { category: 'usability', pattern: /<input[^>]*type=["']?text["']?[^>]*maxlength=["']\d{4,}["']/gi, issue: 'Input sem limite de caracteres', severity: 'warning', suggestion: 'Adicione maxlength ou validation' },
  { category: 'performance', pattern: /<img[^>]*src=["'][^"']*\.(png|jpg|gif)["'][^>]*loading\s*=/gi, issue: 'Imagem sem lazy loading', severity: 'info', suggestion: 'Adicione loading="lazy"' },
  { category: 'performance', pattern: /<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, issue: 'Script sem async/defer', severity: 'info', suggestion: 'Adicione async ou defer' },
  { category: 'consistency', pattern: /style=\{[^}]*\}/g, issue: 'Estilo inline detectado', severity: 'warning', suggestion: 'Extraia para CSS module ou styled component' },
  { category: 'feedback', pattern: /<form[^>]*>[\s\S]*?<(?:button|input)/gi, issue: 'Form com botao de submit', severity: 'info', suggestion: 'Verifique feedback de carregamento' },
  { category: 'error-handling', pattern: /catch\s*\([^)]*\)\s*\{[^}]*\}/gi, issue: 'Catch vazio ou sem tratamento de erro para o usuario', severity: 'error', suggestion: 'Exiba mensagem de erro amigavel para o usuario' },
  { category: 'mobile', pattern: /width\s*:\s*\d{3,}px/gi, issue: 'Largura fixa em px pode quebrar em mobile', severity: 'warning', suggestion: 'Use relative units (%, rem, vw) para responsividade' },
  { category: 'mobile', pattern: /font-size\s*:\s*(1[2-6]|20)px/gi, issue: 'Font-size muito pequeno para mobile', severity: 'info', suggestion: 'Font-size minima recomendada: 16px para mobile' },
];

/**
 * Processa u x.
 * @param content - Valor content.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function analyzeUX(content: string, _filePath: string): UXReport {
  const findings: UXFinding[] = [];

  for (const rule of UX_RULES) {
    const matches = content.matchAll(rule.pattern);
    for (const m of matches) {
      const line = content.substring(0, m.index || 0).split('\n').length;
      findings.push({ category: rule.category, issue: rule.issue, severity: rule.severity, line, suggestion: rule.suggestion });
    }
  }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  const infos = findings.filter(f => f.severity === 'info').length;

  const score = Math.round(Math.max(0, 100 - (errors * 12 + warnings * 4 + infos * 1)));
  const severityLabel = score >= 90 ? 'Excelente' : score >= 70 ? 'Bom' : score >= 50 ? 'Regular' : 'Ruim';
  const summary = `UX Score: ${score}/100 (${severityLabel}). ${errors} erros, ${warnings} avisos, ${infos} sugestoes.`;

  return { findings, total: findings.length, errors, warnings, infos, score, summary };
}
