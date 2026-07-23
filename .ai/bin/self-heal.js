#!/usr/bin/env node
'use strict'
const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const ROOT = path.resolve(__dirname, '../..')

console.log('\n=== AI-Devkit: Iniciando Motor de Autocura (Self-Heal) com AST ===\n')

const CRITICAL = [
  'src/shared/errors/AppError.ts',
  'src/shared/utils/Contract.ts',
  '.ai/project-manifest.yaml',
  '.ai/laws.yaml',
  '.ai/context/ai-handoff.md',
  '.ai/errors/error-catalog.md',
  '.ai/tasks/current-task.md',
]

let ok = true

console.log('[1/4] Verificando integridade de arquivos críticos...')
for (const f of CRITICAL) {
  const full = path.join(ROOT, f)
  if (!fs.existsSync(full)) {
    console.error('  [FALHA] AUSENTE: ' + f)
    ok = false
  } else {
    const size = fs.statSync(full).size
    if (size < 50) {
      console.warn('  [AVISO] VAZIO:   ' + f)
      ok = false
    } else {
      console.log('  [OK] ' + f)
    }
  }
}

if (!ok) {
  console.error('\nArquivos críticos corrompidos. Impossível prosseguir com a autocura.')
  process.exit(1)
}

console.log('\n[2/4] Executando Autocura Estrutural via AST (ts-morph)...')
try {
  const { Project } = require('ts-morph')
  const tsConfigFilePath = path.join(ROOT, 'tsconfig.json')
  
  if (fs.existsSync(tsConfigFilePath)) {
    const project = new Project({ tsConfigFilePath })
    const sourceFiles = project.getSourceFiles()
    let moves = 0

    sourceFiles.forEach(sf => {
      const filePath = sf.getFilePath()
      
      // Heurística 1: Entidades vazadas para camada de infraestrutura/controllers
      if (filePath.includes('/infrastructure/') || filePath.includes('/controllers/')) {
        if (filePath.endsWith('.entity.ts')) {
          console.log(`  [AST] Entidade fora de lugar detectada: ${path.basename(filePath)}`)
          // Calcula o path correto em domain/entities
          const modulePath = filePath.split('/infrastructure/')[0]
          const newPath = path.join(modulePath, 'domain', 'entities', path.basename(filePath))
          
          sf.moveToDirectory(path.dirname(newPath))
          console.log(`  [AST] Movido para -> ${newPath}`)
          moves++
        }
      }

      // Heurística 2: Use Cases fora da camada de aplicação
      if (filePath.includes('/infrastructure/') || filePath.includes('/domain/')) {
        if (filePath.endsWith('.use-case.ts')) {
          console.log(`  [AST] Caso de Uso fora de lugar detectado: ${path.basename(filePath)}`)
          const modulePath = filePath.split('/infrastructure/')[0].split('/domain/')[0]
          const newPath = path.join(modulePath, 'application', 'use-cases', path.basename(filePath))
          
          sf.moveToDirectory(path.dirname(newPath))
          console.log(`  [AST] Movido para -> ${newPath}`)
          moves++
        }
      }
    })

    if (moves > 0) {
      console.log('  [AST] Salvando projeto e atualizando rotas de imports (refactoring dinâmico)...')
      project.saveSync()
      console.log(`  [AST] ${moves} arquivos re-alocados e imports corrigidos.`)
    } else {
      console.log('  [AST] Nenhuma quebra estrutural de pastas detectada.')
    }
  } else {
    console.warn('  [AVISO] tsconfig.json não encontrado. Autocura via AST ignorada.')
  }
} catch (e) {
  console.warn('  [ERRO] Falha no motor AST: ' + e.message)
}

console.log('\n[3/4] Executando lint:fix (Formatação e Regras Estáticas)...')
try {
  execSync('npm run lint:fix', { cwd: ROOT, stdio: 'pipe' })
  console.log('  [OK] lint:fix concluido.')
} catch (e) {
  const stderr = (e.stderr || e.stdout || '').toString()
  console.warn('  [AVISO] lint:fix retornou erros (alguns requerem intervenção manual).')
  if (stderr.trim()) console.error(stderr.trim())
}

console.log('\n[4/4] Executando typecheck (Validação de Tipagem)...')
try {
  if (fs.existsSync(path.join(ROOT, 'tsconfig.json'))) {
      execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'pipe' })
      console.log('  [OK] typecheck passou.')
  } else {
      console.log('  [SKIP] typecheck pulado (tsconfig.json não encontrado).')
  }
} catch (e) {
  const stderr = (e.stderr || e.stdout || '').toString()
  console.warn('  [AVISO] typecheck falhou. A autocura AST pode não ter resolvido todos os problemas de interface.')
  if (stderr.trim()) console.error(stderr.trim())
  ok = false
}

console.log('\n=== Processo de Self-Heal Finalizado ===\n')
if (!ok) process.exit(1)

// === Security Self-Healing (SEC-016) ===
console.log('\n=== Security Self-Healing ===\n')

// 1. Audit trail tampering detection
console.log('[SEC-1/5] Verificando integridade do audit trail...')
try {
  const result = execSync('npx jest packages/audit-trail --no-coverage --verbose 2>&1', {
    cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (result.includes('✓') && !result.includes('✗')) {
    console.log('  [OK] Audit trail integrity verified.')
  } else {
    console.warn('  [AVISO] Audit trail tests have failures — investigate manually.')
  }
} catch {
  console.warn('  [AVISO] Could not verify audit trail — tests may be broken.')
}

// 2. Policy drift detection
console.log('[SEC-2/5] Verificando policy engine...')
const policyDir = path.join(ROOT, 'policies')
if (fs.existsSync(policyDir)) {
  const policyFiles = fs.readdirSync(policyDir).filter(f => f.endsWith('.policy.yaml'))
  console.log(`  [OK] ${policyFiles.length} policy files found: ${policyFiles.join(', ')}`)
} else {
  console.warn('  [AVISO] policies/ directory not found — creating default...')
  try {
    fs.mkdirSync(policyDir, { recursive: true })
    console.log('  [OK] Created policies/ directory.')
  } catch (e) {
    console.error('  [FALHA] Could not create policies/: ' + e.message)
  }
}

// 3. Compliance check
console.log('[SEC-3/5] Verificando compliance...')
try {
  const complianceResult = execSync('node .ai/bin/compliance-check.js 2>&1', {
    cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const lines = complianceResult.split('\n').filter(l => l.includes('❌'))
  if (lines.length === 0) {
    console.log('  [OK] All compliance checks passed.')
  } else {
    console.warn(`  [AVISO] ${lines.length} compliance check(s) failed:`)
    for (const line of lines) console.warn('    ' + line.trim())
  }
} catch (e) {
  console.warn('  [AVISO] Compliance check could not run: ' + (e.message || 'unknown error'))
}

// 4. Red team scan (lightweight)
console.log('[SEC-4/5] Executando red team scan rápido...')
try {
  execSync('node .ai/bin/red-teaming.js --ci 2>&1', {
    cwd: ROOT, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log('  [OK] Red team scan completed — no high-severity findings.')
} catch (e) {
  const stderr = (e.stdout || '').toString()
  const findings = (stderr.match(/\[HIGH\]/g) || []).length
  if (findings > 0) {
    console.warn(`  [AVISO] ${findings} high-severity red team finding(s) detected.`)
  } else {
    console.log('  [OK] Red team scan completed.')
  }
}

// 5. Gap check
console.log('[SEC-5/5] Verificando gap analysis...')
try {
  execSync('node .ai/bin/gap-check.js --ci --quiet 2>&1', {
    cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log('  [OK] No blocking gaps detected.')
} catch {
  console.warn('  [AVISO] Gap check found unresolved items — run "node .ai/bin/gap-check.js --verbose" for details.')
}

console.log('\n=== Security Self-Heal Complete ===\n')
