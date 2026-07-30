import { createLogger } from '@ideia/logger'

const logger = createLogger('verification-layer:agentic-judge')

export type JudgeVerdict = 'pass' | 'pass-with-notes' | 'fail'

export interface StaticAnalysisResult {
  lint: Array<{ file: string; line: number; severity: string; message: string }>
  typeErrors: Array<{ file: string; message: string }>
  patternViolations: Array<{ pattern: string; file: string; description: string }>
  securityIssues: Array<{ severity: string; file: string; description: string }>
}

export interface DynamicAnalysisResult {
  testResults: Array<{ name: string; passed: boolean; duration: number }>
  coverageDelta: number
  regressionPass: boolean
  totalTests: number
  passedTests: number
}

export interface AgenticJudgeResult {
  verdict: JudgeVerdict
  score: number
  staticAnalysis: StaticAnalysisResult
  dynamicAnalysis: DynamicAnalysisResult
  structuralDebt: number
  crossPhaseIssues: string[]
  explanation: string
  recommendations: string[]
}

export interface JudgeConfig {
  model: string
  maxStaticFiles: number
  enableSecurityScan: boolean
  enablePatternDetection: boolean
}

const DEFAULT_CONFIG: JudgeConfig = {
  model: 'local',
  maxStaticFiles: 50,
  enableSecurityScan: true,
  enablePatternDetection: true,
}

export class AgenticJudge {
  private config: JudgeConfig

  constructor(config?: Partial<JudgeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async evaluate(
    workspaceRoot: string,
    changedFiles: string[],
    testResults: DynamicAnalysisResult,
  ): Promise<AgenticJudgeResult> {
    const staticAnalysis = await this.runStaticAnalysis(workspaceRoot, changedFiles)
    const dynamicAnalysis = testResults

    const staticScore = this.scoreStatic(staticAnalysis)
    const dynamicScore = this.scoreDynamic(dynamicAnalysis)
    const structuralDebt = this.calculateStructuralDebt(staticAnalysis, dynamicAnalysis)
    const crossPhaseIssues = this.detectCrossPhaseIssues(staticAnalysis, dynamicAnalysis)

    const score = Math.round(Math.max(0, (staticScore * 0.4 + dynamicScore * 0.6) * (1 - structuralDebt * 0.5)))
    const verdict = score >= 80 ? 'pass' : score >= 50 ? 'pass-with-notes' : 'fail'

    const recommendations = this.generateRecommendations(staticAnalysis, dynamicAnalysis, score)

    return {
      verdict,
      score,
      staticAnalysis,
      dynamicAnalysis,
      structuralDebt,
      crossPhaseIssues,
      explanation: this.generateExplanation(verdict, score, structuralDebt),
      recommendations,
    }
  }

  private async runStaticAnalysis(
    root: string,
    files: string[],
  ): Promise<StaticAnalysisResult> {
    const lint: StaticAnalysisResult['lint'] = []
    const typeErrors: StaticAnalysisResult['typeErrors'] = []
    const patternViolations: StaticAnalysisResult['patternViolations'] = []
    const securityIssues: StaticAnalysisResult['securityIssues'] = []

    const fs = await import('fs/promises')
    const path = await import('path')

    const toCheck = files.slice(0, this.config.maxStaticFiles)

    for (const file of toCheck) {
      try {
        const fullPath = path.join(root, file)
        const content = await fs.readFile(fullPath, 'utf-8')

        if (content.includes('any ')) {
          lint.push({ file, line: 0, severity: 'warning', message: 'Uses `any` type' })
        }
        if (content.includes('!.')) {
          lint.push({ file, line: 0, severity: 'warning', message: 'Non-null assertion (!) used' })
        }
        if (content.includes('console.log')) {
          lint.push({ file, line: 0, severity: 'info', message: 'Console.log in production code' })
        }
        if (content.includes('TODO') || content.includes('FIXME') || content.includes('HACK')) {
          lint.push({ file, line: 0, severity: 'info', message: 'Contains TODO/FIXME/HACK' })
        }

        if (this.config.enableSecurityScan) {
          const secretPatterns = [
            { pattern: /sk-[a-zA-Z0-9]{20,}/, desc: 'OpenAI API key' },
            { pattern: /AKIA[0-9A-Z]{16}/, desc: 'AWS Access Key' },
            { pattern: /-----BEGIN RSA PRIVATE KEY-----/, desc: 'Private RSA key' },
            { pattern: /ghp_[a-zA-Z0-9]{36}/, desc: 'GitHub token' },
          ]
          for (const { pattern, desc } of secretPatterns) {
            if (pattern.test(content)) {
              securityIssues.push({ severity: 'critical', file, description: `Hardcoded ${desc}` })
            }
          }
        }
      } catch { /* skip unreadable */ }
    }

    return { lint, typeErrors, patternViolations, securityIssues }
  }

  private scoreStatic(analysis: StaticAnalysisResult): number {
    const base = 100
    const deductions = analysis.lint.length * 2
      + analysis.typeErrors.length * 10
      + analysis.patternViolations.length * 5
      + analysis.securityIssues.length * 25
    return Math.max(0, base - deductions)
  }

  private scoreDynamic(analysis: DynamicAnalysisResult): number {
    if (analysis.totalTests === 0) return 0
    const passRate = analysis.passedTests / analysis.totalTests
    const coverageBonus = Math.min(20, Math.max(0, (analysis.coverageDelta) * 100))
    const regressionPenalty = analysis.regressionPass ? 0 : 30
    return Math.round(Math.max(0, (passRate * 80) + coverageBonus - regressionPenalty))
  }

  private calculateStructuralDebt(
    static_: StaticAnalysisResult,
    dynamic: DynamicAnalysisResult,
  ): number {
    let debt = 0
    if (static_.lint.length > 10) debt += 0.1
    if (static_.typeErrors.length > 0) debt += 0.2
    if (static_.securityIssues.length > 0) debt += 0.3
    if (dynamic.coverageDelta < -0.05) debt += 0.15
    if (dynamic.totalTests === 0) debt += 0.25
    return Math.min(1, debt)
  }

  private detectCrossPhaseIssues(
    static_: StaticAnalysisResult,
    dynamic: DynamicAnalysisResult,
  ): string[] {
    const issues: string[] = []
    if (dynamic.totalTests === 0 && static_.lint.length > 5) {
      issues.push('Many lint issues with zero tests — code quality unchecked')
    }
    if (dynamic.regressionPass === false) {
      issues.push('Regression detected — previous working behavior broken')
    }
    if (static_.securityIssues.length > 0 && dynamic.passedTests < dynamic.totalTests) {
      issues.push('Security issues + failing tests — high risk integration')
    }
    return issues
  }

  private generateRecommendations(
    static_: StaticAnalysisResult,
    dynamic: DynamicAnalysisResult,
    score: number,
  ): string[] {
    const recs: string[] = []
    if (static_.lint.length > 5) recs.push('Run auto-fix on lint issues')
    if (static_.securityIssues.length > 0) recs.push('Remove hardcoded secrets immediately')
    if (dynamic.totalTests === 0) recs.push('Add tests before merging')
    if (dynamic.coverageDelta < 0 && dynamic.coverageDelta > -0.1) recs.push('Coverage dropped — add tests for new code')
    if (score < 50) recs.push('Major rework needed before merge')
    return recs
  }

  private generateExplanation(verdict: JudgeVerdict, score: number, debt: number): string {
    const debtLabel = debt < 0.1 ? 'low' : debt < 0.3 ? 'moderate' : 'high'
    return `Verdict: ${verdict} (score: ${score}/100, structural debt: ${debtLabel})`
  }
}
