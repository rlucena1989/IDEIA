#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Replacement {
  file: string
  replacements: number
}

function replaceConsoleLogInFile(filePath: string): { replacements: number, content: string } {
  const content = fs.readFileSync(filePath, 'utf8')
  let newContent = content
  let replacements = 0

  // Check if logger is already imported
  const hasLoggerImport = content.includes('from \'@ideia/logger\'') || 
                          content.includes('from "@ideia/logger"') ||
                          content.includes('createLogger')

  if (!hasLoggerImport) {
    // Add import after the first import line
    const firstImportMatch = content.match(/^import .+$/m)
    if (firstImportMatch) {
      const insertPos = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length
      newContent = content.slice(0, insertPos) + 
                  `\nimport { createLogger } from '@ideia/logger';` + 
                  content.slice(insertPos)
      // Add logger initialization after imports
      const importSectionEnd = newContent.indexOf('\n\n', insertPos)
      if (importSectionEnd !== -1) {
        newContent = newContent.slice(0, importSectionEnd) + 
                    `\nconst logger = createLogger('${path.basename(filePath, '.ts')}');` + 
                    newContent.slice(importSectionEnd)
      }
      replacements++
    }
  }

  // Replace console.log with logger.info (multiple patterns)
  // Pattern 1: console.log(`text`)
  const simpleLogPattern = /console\.log\(`([^`]+)`\)/g
  newContent = newContent.replace(simpleLogPattern, (match, message) => {
    replacements++
    return `logger.info('${message.replace(/'/g, "\\'")}')`
  })
  
  // Pattern 2: console.log('text')
  const singleQuotePattern = /console\.log\('([^']+)'\)/g
  newContent = newContent.replace(singleQuotePattern, (match, message) => {
    replacements++
    return `logger.info('${message}')`
  })
  
  // Pattern 3: console.log("text")
  const doubleQuotePattern = /console\.log\("([^"]+)"\)/g
  newContent = newContent.replace(doubleQuotePattern, (match, message) => {
    replacements++
    return `logger.info('${message}')`
  })
  
  // Pattern 4: console.log(variable)
  const variablePattern = /console\.log\(([^,)]+)\)/g
  newContent = newContent.replace(variablePattern, (match, variable) => {
    // Skip if it's a template string or string literal (already handled)
    if (variable.startsWith('`') || variable.startsWith("'") || variable.startsWith('"')) {
      return match
    }
    replacements++
    return `logger.info(${variable})`
  })

  return { replacements, content: newContent }
}

function main() {
  const packagesDir = path.join(__dirname, '../packages')
  const results: Replacement[] = []

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
        } else if (file.endsWith('.ts') && !file.includes('.test.') && !file.endsWith('.d.ts')) {
          const result = replaceConsoleLogInFile(filePath)
          if (result.replacements > 0) {
            fs.writeFileSync(filePath, result.content, 'utf8')
            results.push({
              file: path.relative(packagesDir, filePath),
              replacements: result.replacements
            })
          }
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
  }

  scanDir(packagesDir)

  console.log(`Replaced console.log in ${results.length} files`)
  console.log(`Total replacements: ${results.reduce((sum, r) => sum + r.replacements, 0)}`)
  
  if (results.length > 0) {
    console.log('\nTop 10 files:')
    results.sort((a, b) => b.replacements - a.replacements).slice(0, 10).forEach(r => {
      console.log(`  ${r.file}: ${r.replacements} replacements`)
    })
  }
}

main()
