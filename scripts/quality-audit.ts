#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface PackageTestStatus {
  name: string
  hasTests: boolean
  testFiles: string[]
  sourceFiles: string[]
}

interface ConsoleLogAudit {
  file: string
  count: number
}

interface ProcessEnvAudit {
  file: string
  count: number
}

function scanPackageTests(packagesDir: string): PackageTestStatus[] {
  const results: PackageTestStatus[] = []
  const packages = fs.readdirSync(packagesDir)
  
  for (const pkg of packages) {
    const pkgPath = path.join(packagesDir, pkg)
    const stat = fs.statSync(pkgPath)
    
    if (!stat.isDirectory() || pkg.startsWith('.') || pkg === 'node_modules') {
      continue
    }
    
    const srcPath = path.join(pkgPath, 'src')
    if (!fs.existsSync(srcPath)) {
      continue
    }
    
    const testFiles: string[] = []
    const sourceFiles: string[] = []
    
    function scanDir(dir: string) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          scanDir(filePath)
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          if (file.includes('.test.') || file.includes('.spec.') || 
              dir.includes('__tests__') || dir.includes('test')) {
            testFiles.push(filePath)
          } else if (!file.endsWith('.d.ts') && !file.includes('.test.')) {
            sourceFiles.push(filePath)
          }
        }
      }
    }
    
    scanDir(srcPath)
    
    results.push({
      name: pkg,
      hasTests: testFiles.length > 0,
      testFiles,
      sourceFiles
    })
  }
  
  return results
}

function scanConsoleLogs(packagesDir: string): ConsoleLogAudit[] {
  const results: ConsoleLogAudit[] = []
  
  function scanDir(dir: string) {
    try {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          // Skip node_modules, .ai, dist
          if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
            scanDir(filePath)
          }
        } else if ((file.endsWith('.ts') || file.endsWith('.js')) && 
                   !file.endsWith('.d.ts') && !file.includes('.test.')) {
          const content = fs.readFileSync(filePath, 'utf8')
          const matches = content.match(/console\.log/g)
          if (matches && matches.length > 0) {
            results.push({
              file: path.relative(packagesDir, filePath),
              count: matches.length
            })
          }
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
  }
  
  scanDir(packagesDir)
  return results.sort((a, b) => b.count - a.count)
}

function scanProcessEnv(packagesDir: string): ProcessEnvAudit[] {
  const results: ProcessEnvAudit[] = []
  
  function scanDir(dir: string) {
    try {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
            scanDir(filePath)
          }
        } else if ((file.endsWith('.ts') || file.endsWith('.js')) && 
                   !file.endsWith('.d.ts') && !file.includes('.test.')) {
          const content = fs.readFileSync(filePath, 'utf8')
          const matches = content.match(/process\.env/g)
          if (matches && matches.length > 0) {
            results.push({
              file: path.relative(packagesDir, filePath),
              count: matches.length
            })
          }
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
  }
  
  scanDir(packagesDir)
  return results.sort((a, b) => b.count - a.count)
}

function generateReport(packages: PackageTestStatus[], consoleLogs: ConsoleLogAudit[], processEnvs: ProcessEnvAudit[]): string {
  let report = `# Quality Audit Report\n\n`
  report += `**Generated:** ${new Date().toISOString()}\n\n`
  
  // Packages without tests
  const packagesWithoutTests = packages.filter(p => !p.hasTests && p.sourceFiles.length > 0)
  report += `## Packages Without Tests\n\n`
  report += `**Total:** ${packagesWithoutTests.length}\n\n`
  report += `| Package | Source Files | Test Files |\n`
  report += `|---------|--------------|------------|\n`
  
  for (const pkg of packagesWithoutTests) {
    report += `| ${pkg.name} | ${pkg.sourceFiles.length} | ${pkg.testFiles.length} |\n`
  }
  
  // Console log audit
  const totalConsoleLogs = consoleLogs.reduce((sum, item) => sum + item.count, 0)
  report += `\n## Console Log Usage\n\n`
  report += `**Total occurrences:** ${totalConsoleLogs}\n`
  report += `**Files affected:** ${consoleLogs.length}\n\n`
  report += `| File | Count |\n`
  report += `|------|-------|\n`
  
  for (const item of consoleLogs.slice(0, 20)) {
    report += `| ${item.file} | ${item.count} |\n`
  }
  
  // Process.env audit
  const totalProcessEnv = processEnvs.reduce((sum, item) => sum + item.count, 0)
  report += `\n## Process.env Usage\n\n`
  report += `**Total occurrences:** ${totalProcessEnv}\n`
  report += `**Files affected:** ${processEnvs.length}\n\n`
  report += `| File | Count |\n`
  report += `|------|-------|\n`
  
  for (const item of processEnvs.slice(0, 20)) {
    report += `| ${item.file} | ${item.count} |\n`
  }
  
  return report
}

async function main() {
  const packagesDir = path.join(__dirname, '../packages')
  const outputFile = path.join(__dirname, '../docs/QUALITY-AUDIT.md')
  
  console.log('Scanning packages for test coverage...')
  const packages = scanPackageTests(packagesDir)
  
  console.log('Scanning for console.log usage...')
  const consoleLogs = scanConsoleLogs(packagesDir)
  
  console.log('Scanning for process.env usage...')
  const processEnvs = scanProcessEnv(packagesDir)
  
  const report = generateReport(packages, consoleLogs, processEnvs)
  fs.writeFileSync(outputFile, report, 'utf8')
  
  console.log(`Report generated: ${outputFile}`)
  
  // Summary
  const packagesWithoutTests = packages.filter(p => !p.hasTests && p.sourceFiles.length > 0)
  const totalConsoleLogs = consoleLogs.reduce((sum, item) => sum + item.count, 0)
  const totalProcessEnv = processEnvs.reduce((sum, item) => sum + item.count, 0)
  
  console.log(`\nSummary:`)
  console.log(`- Packages without tests: ${packagesWithoutTests.length}`)
  console.log(`- Console.log occurrences: ${totalConsoleLogs}`)
  console.log(`- Process.env occurrences: ${totalProcessEnv}`)
}

main().catch(console.error)
