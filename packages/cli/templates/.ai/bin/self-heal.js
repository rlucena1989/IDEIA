#!/usr/bin/env node
'use strict'
const fs   = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const ROOT = path.resolve(__dirname, '../..')

console.log('\n=== AI-Devkit: Inciando Motor de Autocura (Self-Heal) com AST ===\n')

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
  execSync('npm run lint:fix --silent', { cwd: ROOT, stdio: 'ignore' })
  console.log('  [OK] lint:fix concluido.')
} catch (e) {
  console.warn('  [AVISO] lint:fix retornou erros (alguns requerem intervenção manual).')
}

console.log('\n[4/4] Executando typecheck (Validação de Tipagem)...')
try {
  if (fs.existsSync(path.join(ROOT, 'tsconfig.json'))) {
      execSync('npx tsc --noEmit --silent', { cwd: ROOT, stdio: 'ignore' })
      console.log('  [OK] typecheck passou.')
  } else {
      console.log('  [SKIP] typecheck pulado (tsconfig.json não encontrado).')
  }
} catch (e) {
  console.warn('  [AVISO] typecheck falhou. A autocura AST pode não ter resolvido todos os problemas de interface.')
  ok = false
}

console.log('\n=== Processo de Self-Heal Finalizado ===\n')
if (!ok) process.exit(1)
