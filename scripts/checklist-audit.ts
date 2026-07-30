#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ChecklistItem {
  file: string
  unchecked: number
  checked: number
  total: number
  percentage: number
}

function countCheckboxes(content: string): { checked: number, unchecked: number } {
  const unchecked = (content.match(/\[ \]/g) || []).length
  const checked = (content.match(/\[x\]/g) || []).length
  return { checked, unchecked }
}

function auditDirectory(dir: string, extension: string = '.md'): ChecklistItem[] {
  const results: ChecklistItem[] = []
  
  function walk(currentPath: string) {
    const files = fs.readdirSync(currentPath)
    
    for (const file of files) {
      const filePath = path.join(currentPath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!file.startsWith('.') && file !== 'node_modules') {
          walk(filePath)
        }
      } else if (file.endsWith(extension)) {
        const content = fs.readFileSync(filePath, 'utf8')
        const { checked, unchecked } = countCheckboxes(content)
        const total = checked + unchecked
        
        if (total > 0) {
          const relativePath = path.relative(dir, filePath)
          results.push({
            file: relativePath,
            unchecked,
            checked,
            total,
            percentage: total > 0 ? (checked / total) * 100 : 0
          })
        }
      }
    }
  }
  
  walk(dir)
  return results
}

function generateReport(results: ChecklistItem[]): string {
  const totalUnchecked = results.reduce((sum, item) => sum + item.unchecked, 0)
  const totalChecked = results.reduce((sum, item) => sum + item.checked, 0)
  const totalItems = totalUnchecked + totalChecked
  const overallPercentage = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0
  
  // Sort by unchecked count descending
  results.sort((a, b) => b.unchecked - a.unchecked)
  
  let report = `# Checklist Audit Report\n\n`
  report += `**Generated:** ${new Date().toISOString()}\n\n`
  report += `## Summary\n\n`
  report += `- **Total Files with Checkboxes:** ${results.length}\n`
  report += `- **Total Unchecked Items:** ${totalUnchecked}\n`
  report += `- **Total Checked Items:** ${totalChecked}\n`
  report += `- **Overall Completion:** ${overallPercentage.toFixed(1)}%\n\n`
  
  report += `## Top 20 Files by Unchecked Items\n\n`
  report += `| File | Unchecked | Checked | Total | Completion |\n`
  report += `|------|-----------|--------|-------|------------|\n`
  
  for (const item of results.slice(0, 20)) {
    report += `| ${item.file} | ${item.unchecked} | ${item.checked} | ${item.total} | ${item.percentage.toFixed(1)}% |\n`
  }
  
  report += `\n## All Files with Unchecked Items\n\n`
  report += `| File | Unchecked | Checked | Total | Completion |\n`
  report += `|------|-----------|--------|-------|------------|\n`
  
  for (const item of results.filter(r => r.unchecked > 0)) {
    report += `| ${item.file} | ${item.unchecked} | ${item.checked} | ${item.total} | ${item.percentage.toFixed(1)}% |\n`
  }
  
  report += `\n## Files with 100% Completion\n\n`
  const completed = results.filter(r => r.unchecked === 0 && r.total > 0)
  if (completed.length > 0) {
    report += `| File | Total Items |\n`
    report += `|------|------------|\n`
    for (const item of completed) {
      report += `| ${item.file} | ${item.total} |\n`
    }
  } else {
    report += `No files with 100% completion.\n`
  }
  
  return report
}

async function main() {
  const args = process.argv.slice(2)
  const targetDir = args[0] || path.join(__dirname, '../docs')
  const outputFile = args[1] || path.join(__dirname, '../docs/CHECKLIST-AUDIT.md')
  
  console.log(`Auditing directory: ${targetDir}`)
  
  const results = auditDirectory(targetDir)
  const report = generateReport(results)
  
  fs.writeFileSync(outputFile, report, 'utf8')
  console.log(`Report generated: ${outputFile}`)
  
  // Also output summary to console
  const totalUnchecked = results.reduce((sum, item) => sum + item.unchecked, 0)
  const totalChecked = results.reduce((sum, item) => sum + item.checked, 0)
  const totalItems = totalUnchecked + totalChecked
  const overallPercentage = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0
  
  console.log(`\nSummary:`)
  console.log(`- Files with checkboxes: ${results.length}`)
  console.log(`- Unchecked items: ${totalUnchecked}`)
  console.log(`- Checked items: ${totalChecked}`)
  console.log(`- Overall completion: ${overallPercentage.toFixed(1)}%`)
}

main().catch(console.error)
