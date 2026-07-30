import { createLogger } from '@ideia/logger'
import {
  IAgent, AgentContract, AgentStatus, AgentResult, AgentMetrics,
  ValidationResult, ExecutionMetrics,
} from './types'

const logger = createLogger('code-reviewer-agent')

export interface CodeFile {
  path: string
  content: string
  language: string
}

export interface ReviewRule {
  id: string
  pattern: RegExp | undefined
  severity: string
  category: string
  message: string
}

export interface ReviewIssue {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  rule: string
  message: string
  suggestedFix?: string
  category: 'security' | 'style' | 'performance' | 'correctness' | 'maintainability'
}

export interface CodeSuggestion {
  file: string
  lines: [number, number]
  original: string
  suggested: string
  rationale: string
  estimatedImprovement: string
}

export interface ReviewSummary {
  totalFiles: number
  filesReviewed: number
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  securityIssues: number
  maintainabilityIssues: number
  score: number
  grade: string
  passed: boolean
}

export interface CodeReviewInput {
  files: CodeFile[]
  rules: ReviewRule[]
  context: { project: string; language: string; framework: string }
}

export interface CodeReviewOutput {
  issues: ReviewIssue[]
  score: number
  summary: ReviewSummary
  suggestions: CodeSuggestion[]
}

export class CodeReviewerAgent implements IAgent<CodeReviewOutput> {
  readonly id = 'code-reviewer-v1'
  readonly status: AgentStatus = 'idle'
  readonly contract: AgentContract = {
    agentId: 'code-reviewer-v1',
    version: '1.0.0',
    capabilities: ['static-analysis', 'style-check', 'security-scan', 'code-quality'],
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array' },
        rules: { type: 'array' },
        context: { type: 'object' },
      },
      required: ['files'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        issues: { type: 'array' },
        score: { type: 'number' },
        summary: { type: 'object' },
      },
      required: ['issues', 'score'],
    },
    performanceSLO: { maxLatency: 15000, maxTokens: 6000, minSuccessRate: 0.97 },
    dependencies: [],
  }

  private readonly builtinRules: ReviewRule[] = [
    {
      id: 'no-eval', pattern: /\beval\s*\(/, severity: 'error',
      category: 'security', message: 'eval() allows arbitrary code execution',
    },
    {
      id: 'no-console', pattern: /console\.(log|debug|info|warn|error)\s*\(/, severity: 'warning',
      category: 'style', message: 'Remove debug console statements before production',
    },
    {
      id: 'no-any', pattern: /:\s*any\b/, severity: 'warning',
      category: 'style', message: 'Avoid `any` type; use proper typing',
    },
    {
      id: 'max-function-length', pattern: undefined, severity: 'warning',
      category: 'maintainability', message: 'Function exceeds 50 lines',
    },
    {
      id: 'no-secrets', pattern: /(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i,
      severity: 'error', category: 'security', message: 'Possible secret hardcoded in source',
    },
    {
      id: 'no-sql-injection', pattern: /(?:execute|query|run)\s*\(\s*[`'"]\s*SELECT/i,
      severity: 'error', category: 'security', message: 'Potential SQL injection vulnerability',
    },
    {
      id: 'missing-error-handling', pattern: /\.catch\s*\(\s*\)/,
      severity: 'warning', category: 'correctness', message: 'Empty catch block swallows errors',
    },
    {
      id: 'no-duplicate-import', pattern: undefined, severity: 'info',
      category: 'maintainability', message: 'Duplicate import detected',
    },
  ]

  async execute(input: CodeReviewInput): Promise<AgentResult<CodeReviewOutput>> {
    const allIssues: ReviewIssue[] = []
    const fileScores: Map<string, number> = new Map()

    for (const file of input.files) {
      if (!this.isSupportedLanguage(file.path)) continue
      const lines = file.content.split('\n')
      const fileIssues = this.analyzeFile(file, lines, input.rules)
      allIssues.push(...fileIssues)
      fileScores.set(file.path, this.calculateFileScore(fileIssues))
    }

    const consolidated = this.consolidateDuplicates(allIssues)
    const score = this.calculateOverallScore(consolidated)
    const suggestions = this.generateSuggestions(consolidated, input.files)
    const summary = this.buildSummary(consolidated, score, input.files.length)

    return {
      status: 'success',
      output: { issues: consolidated, score, summary, suggestions },
      metrics: { executionTime: 0, tokensUsed: 0, confidence: score / 100 },
    }
  }

  isSupportedLanguage(path: string): boolean {
    return /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(path)
  }

  analyzeFile(file: CodeFile, lines: string[], extraRules: ReviewRule[]): ReviewIssue[] {
    const issues: ReviewIssue[] = []
    const allRules = [...this.builtinRules, ...extraRules]

    for (const rule of allRules) {
      if (rule.pattern) {
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(rule.pattern)
          if (match) {
            issues.push({
              file: file.path,
              line: i + 1,
              column: match.index ?? 0,
              severity: rule.severity as ReviewIssue['severity'],
              rule: rule.id,
              message: rule.message,
              category: rule.category as ReviewIssue['category'],
              suggestedFix: match[0],
            })
          }
        }
      } else if (rule.id === 'max-function-length') {
        issues.push(...this.checkFunctionLength(file, lines))
      } else if (rule.id === 'no-duplicate-import') {
        issues.push(...this.checkDuplicateImports(lines, file.path))
      }
    }
    return issues
  }

  checkFunctionLength(file: CodeFile, lines: string[]): ReviewIssue[] {
    const issues: ReviewIssue[] = []
    let inFunction = false
    let startLine = 0
    let braceCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (
        /\b(?:function|async\s+function)\s+\w+\s*\(/.test(line) ||
        /\b(?:function|async\s+function|=>)\s*\(/.test(line) ||
        /^\s*\w+\s*\(.*\)\s*\{/.test(line)
      ) {
        inFunction = true
        startLine = i
        braceCount = 0
      }
      if (inFunction) {
        braceCount += (line.match(/\{/g) || []).length
        braceCount -= (line.match(/\}/g) || []).length
        if (braceCount <= 0 && i - startLine > 50) {
          issues.push({
            file: file.path, line: startLine + 1, column: 0,
            severity: 'warning', rule: 'max-function-length',
            message: `Function starting at line ${startLine + 1} has ${i - startLine} lines (max 50)`,
            category: 'maintainability',
          })
          inFunction = false
        } else if (braceCount <= 0) {
          inFunction = false
        }
      }
    }
    return issues
  }

  checkDuplicateImports(lines: string[], filePath: string): ReviewIssue[] {
    const imports: Map<string, number> = new Map()
    const issues: ReviewIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^import\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/)
      if (match) {
        const source = match[1]
        if (imports.has(source)) {
          issues.push({
            file: filePath, line: i + 1, column: 0, severity: 'info',
            rule: 'no-duplicate-import',
            message: `Duplicate import of '${source}' (first at line ${imports.get(source)})`,
            category: 'maintainability',
          })
        } else {
          imports.set(source, i + 1)
        }
      }
    }
    return issues
  }

  consolidateDuplicates(issues: ReviewIssue[]): ReviewIssue[] {
    const seen = new Set<string>()
    return issues.filter(issue => {
      const key = `${issue.file}:${issue.rule}:${issue.line}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  calculateFileScore(issues: ReviewIssue[]): number {
    const penalties: Record<string, number> = { error: 15, warning: 5, info: 1 }
    const totalPenalty = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0)
    return Math.max(0, 100 - totalPenalty)
  }

  calculateOverallScore(issues: ReviewIssue[]): number {
    const errors = issues.filter(i => i.severity === 'error').length
    const warnings = issues.filter(i => i.severity === 'warning').length
    const infos = issues.filter(i => i.severity === 'info').length
    return Math.max(0, 100 - (errors * 15 + warnings * 5 + infos * 1))
  }

  generateSuggestions(issues: ReviewIssue[], _files: CodeFile[]): CodeSuggestion[] {
    return issues
      .filter(i => i.severity !== 'info' && i.suggestedFix)
      .slice(0, 10)
      .map(i => ({
        file: i.file,
        lines: [i.line, i.line] as [number, number],
        original: i.suggestedFix ?? '',
        suggested: this.buildSuggestion(i),
        rationale: i.message,
        estimatedImprovement: i.severity === 'error' ? 'critical' : 'significant',
      }))
  }

  private buildSuggestion(issue: ReviewIssue): string {
    const replacements: Record<string, string> = {
      'eval(': '// Use Function constructor or dynamic import\nalternativeImplementation()',
      'console.log(': '// Use structured logger\nlogger.info(',
      'console.error(': '// Use structured logger\nlogger.error(',
    }
    for (const [pattern, replacement] of Object.entries(replacements)) {
      if (issue.suggestedFix?.includes(pattern)) {
        return issue.suggestedFix.replace(pattern, replacement)
      }
    }
    return `// TODO: Fix ${issue.rule} - ${issue.message}`
  }

  buildSummary(issues: ReviewIssue[], score: number, totalFiles: number): ReviewSummary {
    return {
      totalFiles,
      filesReviewed: totalFiles,
      totalIssues: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      infos: issues.filter(i => i.severity === 'info').length,
      securityIssues: issues.filter(i => i.category === 'security').length,
      maintainabilityIssues: issues.filter(i => i.category === 'maintainability').length,
      score,
      grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
      passed: score >= 75,
    }
  }

  validate(input: unknown): ValidationResult {
    const data = input as CodeReviewInput
    const errors: string[] = []
    if (!data.files || !Array.isArray(data.files)) {
      errors.push('files must be an array')
    }
    if (data.files?.some(f => !f.path || !f.content)) {
      errors.push('each file must have path and content')
    }
    return { valid: errors.length === 0, errors }
  }

  async cancel(): Promise<void> {
    logger.info('CodeReviewerAgent cancelled')
  }

  async getMetrics(): Promise<AgentMetrics> {
    return { tasksCompleted: 0, avgLatency: 0, successRate: 1, tokensConsumed: 0 }
  }
}
