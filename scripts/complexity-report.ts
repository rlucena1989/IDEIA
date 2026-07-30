#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'

interface ESLintResult {
  filePath: string
  messages: Array<{
    ruleId: string
    severity: number
    message: string
    line: number
    column: number
  }>
  errorCount: number
  warningCount: number
}

interface ComplexityReport {
  totalFiles: number
  totalErrors: number
  totalWarnings: number
  complexityIssues: number
  maxDepthIssues: number
  maxParamsIssues: number
  maxStatementsIssues: number
  filesWithIssues: Array<{
    file: string
    issues: number
    rules: string[]
  }>
}

function generateReport(eslintReport: ESLintResult[]): string {
  const report: ComplexityReport = {
    totalFiles: eslintReport.length,
    totalErrors: 0,
    totalWarnings: 0,
    complexityIssues: 0,
    maxDepthIssues: 0,
    maxParamsIssues: 0,
    maxStatementsIssues: 0,
    filesWithIssues: []
  }

  const complexityRules = ['complexity', 'max-depth', 'max-params', 'max-statements', 'max-lines-per-function', 'max-nested-callbacks']

  eslintReport.forEach(file => {
    report.totalErrors += file.errorCount
    report.totalWarnings += file.warningCount

    const fileIssues: string[] = []
    file.messages.forEach(msg => {
      if (msg.ruleId && complexityRules.some(rule => msg.ruleId?.includes(rule))) {
        if (msg.ruleId === 'complexity') report.complexityIssues++
        if (msg.ruleId === 'max-depth') report.maxDepthIssues++
        if (msg.ruleId === 'max-params') report.maxParamsIssues++
        if (msg.ruleId === 'max-statements') report.maxStatementsIssues++
        fileIssues.push(msg.ruleId)
      }
    })

    if (fileIssues.length > 0) {
      report.filesWithIssues.push({
        file: file.filePath,
        issues: fileIssues.length,
        rules: [...new Set(fileIssues)]
      })
    }
  })

  report.filesWithIssues.sort((a, b) => b.issues - a.issues)

  return `# Cyclomatic Complexity Report

## Summary
- **Total Files Analyzed**: ${report.totalFiles}
- **Total Errors**: ${report.totalErrors}
- **Total Warnings**: ${report.totalWarnings}
- **Files with Complexity Issues**: ${report.filesWithIssues.length}

## Complexity Issues by Type
- **complexity**: ${report.complexityIssues}
- **max-depth**: ${report.maxDepthIssues}
- **max-params**: ${report.maxParamsIssues}
- **max-statements**: ${report.maxStatementsIssues}

## Top 10 Files with Most Issues

${report.filesWithIssues.slice(0, 10).map((file, i) => 
  `${i + 1}. \`${file.file}\` - ${file.issues} issues (${file.rules.join(', ')})`
).join('\n')}

## Recommendations
1. Functions with high complexity should be refactored into smaller functions
2. Deep nesting should be reduced using early returns or guard clauses
3. Functions with many parameters should use parameter objects
4. Long functions should be split into smaller, focused functions

## Thresholds
- **complexity**: 15
- **max-depth**: 4
- **max-params**: 5
- **max-statements**: 30
- **max-lines-per-function**: 200
- **max-nested-callbacks**: 3
`
}

async function main() {
  const args = process.argv.slice(2)
  const inputArg = args.indexOf('--input')
  const outputArg = args.indexOf('--output')

  if (inputArg === -1 || outputArg === -1) {
    console.error('Usage: complexity-report.ts --input <eslint-report.json> --output <output.md>')
    process.exit(1)
  }

  const inputFile = args[inputArg + 1]
  const outputFile = args[outputArg + 1]

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`)
    process.exit(1)
  }

  const eslintReport: ESLintResult[] = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
  const report = generateReport(eslintReport)

  fs.writeFileSync(outputFile, report, 'utf8')
  console.log(`Complexity report generated: ${outputFile}`)
}

main().catch(console.error)
