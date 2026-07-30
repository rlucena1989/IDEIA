#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface EnvUsage {
  file: string
  vars: string[]
  count: number
}

function scanProcessEnvUsage(packagesDir: string): EnvUsage[] {
  const results: EnvUsage[] = []
  
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
          const matches = content.match(/process\.env\.(\w+)/g)
          if (matches) {
            const vars = matches.map(m => m.replace('process.env.', ''))
            const uniqueVars = [...new Set(vars)]
            results.push({
              file: path.relative(packagesDir, filePath),
              vars: uniqueVars,
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

function generateMigrationScript(usage: EnvUsage[]): string {
  let script = `#!/usr/bin/env tsx\n\n`
  script += `import fs from 'fs';\n`
  script += `import path from 'path';\n\n`
  script += `// Auto-generated migration script for process.env to ConfigManager\n`
  script += `// Generated: ${new Date().toISOString()}\n\n`
  
  script += `const filesToMigrate = [\n`
  for (const item of usage.slice(0, 20)) {
    script += `  '${item.file}',\n`
  }
  script += `];\n\n`
  
  script += `function migrateFile(filePath: string): void {\n`
  script += `  const fullPath = path.join(__dirname, '../packages', filePath);\n`
  script += `  if (!fs.existsSync(fullPath)) {\n`
  script += `    console.log(\`File not found: \${filePath}\`);\n`
  script += `    return;\n`
  script += `  }\n\n`
  script += `  let content = fs.readFileSync(fullPath, 'utf8');\n`
  script += `  const original = content;\n\n`
  script += `  // Add ConfigManager import if not present\n`
  script += `  if (!content.includes('ConfigManager')) {\n`
  script += `    const importMatch = content.match(/^import .+$/m);\n`
  script += `    if (importMatch) {\n`
  script += `      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;\n`
  script += `      content = content.slice(0, insertPos) + '\\nimport { ConfigManager } from '@ideia/config-engine';' + content.slice(insertPos);\n`
  script += `      // Add config instance after imports\n`
  script += `      const configInit = '\\nconst config = ConfigManager.getInstance();\\n';\n`
  script += `      const importSectionEnd = content.indexOf('\\n\\n', insertPos);\n`
  script += `      if (importSectionEnd !== -1) {\n`
  script += `        content = content.slice(0, importSectionEnd) + configInit + content.slice(importSectionEnd);\n`
  script += `      }\n`
  script += `    }\n`
  script += `  }\n\n`
  script += `  // Replace process.env.X with config.get('X')\n`
  script += `  content = content.replace(/process\\.env\\.(\\w+)/g, 'config.get(\\'$1\\')');\n\n`
  script += `  if (content !== original) {\n`
  script += `    fs.writeFileSync(fullPath, content, 'utf8');\n`
  script += `    console.log(\`Migrated: \${filePath}\`);\n`
  script += `  } else {\n`
  script += `    console.log(\`No changes: \${filePath}\`);\n`
  script += `  }\n`
  script += `}\n\n`
  script += `console.log('Starting migration...');\n`
  script += `filesToMigrate.forEach(migrateFile);\n`
  script += `console.log('Migration complete.');\n`
  
  return script
}

function main() {
  const packagesDir = path.join(__dirname, '../packages')
  const auditFile = path.join(__dirname, '../docs/PROCESS-ENV-AUDIT.md')
  const migrationScriptFile = path.join(__dirname, '../scripts/migrate-process-env-auto.ts')
  
  console.log('Scanning for process.env usage...')
  const usage = scanProcessEnvUsage(packagesDir)
  
  // Generate audit report
  let report = `# Process.env Usage Audit\n\n`
  report += `**Generated:** ${new Date().toISOString()}\n\n`
  report += `## Summary\n\n`
  report += `- **Total files with process.env:** ${usage.length}\n`
  report += `- **Total occurrences:** ${usage.reduce((sum, u) => sum + u.count, 0)}\n\n`
  
  report += `## Top 20 Files by Usage\n\n`
  report += `| File | Occurrences | Variables |\n`
  report += `|------|------------|----------|\n`
  for (const item of usage.slice(0, 20)) {
    report += `| ${item.file} | ${item.count} | ${item.vars.join(', ')} |\n`
  }
  
  // All unique variables
  const allVars = new Set<string>()
  usage.forEach(u => u.vars.forEach(v => allVars.add(v)))
  report += `\n## All Environment Variables Used\n\n`
  report += `| Variable | Files |\n`
  report += `|----------|-------|\n`
  const varCount = new Map<string, number>()
  usage.forEach(u => u.vars.forEach(v => varCount.set(v, (varCount.get(v) || 0) + 1)))
  Array.from(varCount.entries()).sort((a, b) => b[1] - a[1]).forEach(([varName, count]) => {
    report += `| ${varName} | ${count} |\n`
  })
  
  fs.writeFileSync(auditFile, report, 'utf8')
  console.log(`Audit report generated: ${auditFile}`)
  
  // Generate migration script
  const migrationScript = generateMigrationScript(usage)
  fs.writeFileSync(migrationScriptFile, migrationScript, 'utf8')
  console.log(`Migration script generated: ${migrationScriptFile}`)
  
  console.log(`\nSummary:`)
  console.log(`- Files with process.env: ${usage.length}`)
  console.log(`- Total occurrences: ${usage.reduce((sum, u) => sum + u.count, 0)}`)
  console.log(`- Unique variables: ${allVars.size}`)
}

main()
