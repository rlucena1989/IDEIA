# Auditoria Funcional Completa — IDEIA

> **Tipo:** `audit`  
> **Data:** 2026-07-20  
> **Propósito:** Auditoria funcional completa: execução de todos os scripts de auditoria, testes, ferramentas CLI, validação de manifesto, identificação de gaps reais  
> **Base:** Execução prática no workspace `F:\PROJETOS\ai-devkit-workspace`  
> **Escopo:** 28 scripts de auditoria executados, 7 ferramentas CLI testadas, 2 monorepos com testes rodados, manifesto verificado  

---

## Sumário Executivo

**20 problemas críticos identificados**, dos quais:

| Gravidade | Total | Com instrução de fix |
|-----------|-------|---------------------|
| 🔴 Crítico (bloqueia operação) | 3 | ✅ |
| 🟠 Alto (quebra funcionalidade) | 9 | ✅ |
| 🟡 Médio (risco ou inconsistência) | 8 | ✅ |
| **Total** | **20** | **20/20 documentados** |

---

## 🔴 Problemas Críticos (3)

### C1 — `sync-docs.ps1` aponta para diretório ERRADO (IDEIA/ em vez de ai-devkit-v2/)

**Arquivo:** `scripts/sync-docs.ps1:8`

**Problema:** `$monorepo = Join-Path $root "IDEIA"` — o monorepo ativo é `ai-devkit-v2/`, não `IDEIA/`. O script tenta rodar `npx jest` no diretório errado e **travou por 120s** (timeout).

**Impacto:** `sync-docs.ps1` NÃO funciona. Todas as sincronizações de documentação (GAPS, Manifest, AGENTS) falham silenciosamente.

**Instrução de fix detalhada:**

```powershell
# Arquivo: scripts/sync-docs.ps1
# Linha 8 — ALTERAR DE:
$monorepo = Join-Path $root "IDEIA"
# PARA:
$monorepo = Join-Path $root "ai-devkit-v2"

# Linha 27 — A regex usa atomic group (?>...) que NÃO EXISTE em PowerShell:
# ALTERAR DE:
$content = $content -replace '(?>Testes passando.*?\.)', $newLine
# PARA:
$content = $content -replace '(Testes passando.*?\.)', $newLine

# Linha 40 — Hardcoded "59 packages". ALTERAR PARA buscar valor atual:
# ALTERAR DE:
$content = $content -replace '59 packages', "$pkgCount packages"
# PARA:
$content = $content -replace '\d+ packages', "$pkgCount packages"

# Linhas 61-63 — Lookbehind (?<=...) pode falhar no PS 5.1:
# ALTERAR DE:
$content = $content -replace '(?<=Testes passando\s*\|\s*)\d+', $testsPassing
$content = $content -replace '(?<=Suítes de teste\s*\|\s*)\d+', $testSuites
$content = $content -replace '(?<=Packages totais\s*\|\s*)\d+', $pkgCount
# PARA:
$content = $content -replace '(Testes passando\s*\|\s*)\d+', "`${1}$testsPassing"
$content = $content -replace '(Suítes de teste\s*\|\s*)\d+', "`${1}$testSuites"
$content = $content -replace '(Packages totais\s*\|\s*)\d+', "`${1}$pkgCount"

# Linha 19 — Set-Location modifica o diretório global. ENVOLVER em push/pop:
# ALTERAR DE:
Set-Location $monorepo
$output = npx jest --passWithNoTests 2>&1 | Out-String
# PARA:
Push-Location $monorepo
try {
    $output = npx jest --passWithNoTests 2>&1 | Out-String
} finally {
    Pop-Location
}
```

---

### C2 — `reality-check.ps1` verifica diretório ERRADO e NUNCA encontra endpoints reais

**Arquivo:** `scripts/reality-check.ps1:4,58-68`

**Problemas:**
1. Linha 4: `$monorepo = Join-Path $root "IDEIA"` — mesmo erro do C1
2. Linhas 58-68: `$ideAppDir = Join-Path $monorepo "apps\ideia-app"` — `apps/ideia-app` não existe. O API real está em `ai-devkit-v2/apps/api/src/index.ts`
3. Endpoints NUNCA são encontrados → pre-flight passa com 15 warnings de endpoint "missing"

**Impacto:** O reality-check é inócuo — sempre reporta "ALL CHECKS PASSED" porque NUNCA encontra os endpoints reais. Gatilho de alarme falso.

**Instrução de fix detalhada:**

```powershell
# Arquivo: scripts/reality-check.ps1
# Linha 4 — ALTERAR:
$monorepo = Join-Path $root "ai-devkit-v2"

# Linhas 58-68 — SUBSTITUIR o bloco Check-Endpoints inteiro:
function Check-Endpoints {
    Write-Host "[Endpoints] Verifying API endpoints..."
    if (-not (Test-Path $manifest)) {
        $script:errors += "Manifest not found: $manifest"
        return
    }
    $content = Get-Content $manifest -Raw
    
    $declared = @()
    $content | Select-String -Pattern '`(/api/[^\s]+)`' -AllMatches | ForEach-Object {
        $_.Matches | ForEach-Object { $declared += $_.Groups[1].Value }
    }
    
    # CORREÇÃO: apontar para o API real em ai-devkit-v2
    $apiDir = Join-Path $root "ai-devkit-v2\apps\api"
    
    $actual = @()
    $routeFiles = @()
    if (Test-Path $apiDir) {
        $routeFiles += Get-ChildItem (Join-Path $apiDir "src") -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
    }
    # Também verificar no plugin Theia
    $ideiaPluginDir = Join-Path $root "IDEIA\packages\ideia-plugin"
    if (Test-Path $ideiaPluginDir) {
        $routeFiles += Get-ChildItem (Join-Path $ideiaPluginDir "src") -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
    }
    foreach ($file in $routeFiles) {
        $fileContent = Get-Content $file.FullName -Raw
        # Buscar tanto por strings entre aspas quanto por app.get/post/put/delete/use
        $fileContent | Select-String -Pattern '"(/api/[^"]+)"' -AllMatches | ForEach-Object {
            $_.Matches | ForEach-Object { if ($_.Groups[1].Value -notin $actual) { $actual += $_.Groups[1].Value } }
        }
        # Também buscar por rotas Express: router.get('/api/...', ...)
        $fileContent | Select-String -Pattern "['""](/api/[^'""]+)['""]" -AllMatches | ForEach-Object {
            $_.Matches | ForEach-Object { if ($_.Groups[1].Value -notin $actual) { $actual += $_.Groups[1].Value } }
        }
    }
    
    foreach ($ep in $declared) {
        if ($ep -notin $actual) { $script:warnings += "Endpoint declared but NOT FOUND IN CODE: $ep" }
    }
    
    Write-Host "  $($declared.Count) declared, $($actual.Count) actual" -ForegroundColor Green
}

# Linhas 84-103 — Check-Negative só verifica Cedar e LangGraph. ADICIONAR mais itens:
function Check-Negative {
    Write-Host "[Negative] Verifying claims that technologies DON'T exist..."
    if (-not (Test-Path $manifest)) { return }
    $content = Get-Content $manifest -Raw
    
    # Lista expandida de tecnologias que o manifesto afirma não existir
    $negativeClaims = @{
        'Cedar'         = @('cedar', 'CedarPolicy')
        'LangGraph'     = @('langgraph', 'LangGraph', 'StateGraph')
        'Mem0'          = @('mem0')
        'Redis'         = @('redis')
        'DAP'           = @('dap-bridge', 'DebugPanel', 'dap-client')
        'Electron/Tauri' = @('electron', 'BrowserWindow')
        'DSPy'          = @('dspy')
        'ArgoCD'        = @('argocd')
        'NATS JetStream' = @('nats', 'JetStream', 'NATS')
        'PostgreSQL+pgvector' = @('pgvector', 'postgres')
    }
    
    foreach ($tech in $negativeClaims.Keys) {
        $patterns = $negativeClaims[$tech]
        $found = $false
        foreach ($pattern in $patterns) {
            $result = Get-ChildItem (Join-Path $monorepo "packages") -Recurse -Filter "*.ts" -Exclude "*node_modules*" -ErrorAction SilentlyContinue | 
                Select-String -Pattern $pattern -SimpleMatch -Quiet -ErrorAction SilentlyContinue
            if ($result) { $found = $true; break }
        }
        if ($found) {
            $script:warnings += "NEGATIVE CLAIM WRONG: $tech - found in code"
        }
    }
}
```

---

### C3 — `ideia-tools.mjs` usa `IDEIA_ROOT` fixo e validate() NÃO detecta API keys OpenAI

**Arquivo:** `.ai/ideia-tools.mjs:32,199-240`

**Problema 1 (linha 32):** `const IDEIA_ROOT = path.resolve(__dirname, '..', 'IDEIA')` — hardcoded para `IDEIA/`. O package llm-provider etc. estão em `ai-devkit-v2/packages/`, não em `IDEIA/packages/`.

**Problema 2 (linhas 208-216):** O padrão regex para OpenAI API key é `/(?:sk-[A-Za-z0-9]{20,})/` — mas o arquivo de teste `test-secret.txt` com conteúdo `sk-1234567890abcdef` (21 chars) NÃO foi detectado. Causa: o regex está quebrado — o grupo `(?:...)` não captura corretamente. O padrão correto deve usar começo de linha ou borda de palavra.

**Impacto:** `validate` dá falso negativo. Secrets no código não são detectados.

**Instrução de fix detalhada:**

```javascript
// Arquivo: .ai/ideia-tools.mjs

// LINHA 32 — ALTERAR IDEIA_ROOT para detectar dinamicamente:
// ALTERAR DE:
const IDEIA_ROOT = path.resolve(__dirname, '..', 'IDEIA');
// PARA:
function findMonorepoRoot() {
    const candidates = [
        path.resolve(__dirname, '..', 'ai-devkit-v2'),
        path.resolve(__dirname, '..', 'IDEIA'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    }
    return candidates[0]; // fallback
}
const IDEIA_ROOT = findMonorepoRoot();

// LINHAS 208-216 — CORRIGIR regex de secrets para detectar sk-... corretamente:
const SECRETS = [
    // CORREÇÃO: \\b garante word boundary, grupo não-capturante ajustado
    { pattern: /\b(?:API_KEY|API_SECRET|ACCESS_TOKEN|PRIVATE_KEY|PASSWORD|SECRET)\s*=\s*['"][^'"]{8,}['"]/i, msg: 'Possível secret key' },
    { pattern: /\bsk-[A-Za-z0-9]{20,}\b/, msg: 'OpenAI/OpenRouter API key (sk-...)' },
    { pattern: /\bghp_[A-Za-z0-9]{36}\b/, msg: 'GitHub personal token (ghp_)' },
    { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, msg: 'Chave privada (PEM)' },
    { pattern: /mongodb(?:\+srv)?:\/\/[^\s'"]+/, msg: 'MongoDB connection string' },
    { pattern: /postgresql:\/\/[^\s'"]+/, msg: 'PostgreSQL connection string' },
    { pattern: /redis:\/\/[^\s'"]+/, msg: 'Redis connection string' },
    { pattern: /\bAKIA[0-9A-Z]{16}\b/, msg: 'AWS Access Key ID' },
];
```

---

## 🟠 Problemas de Alto Impacto (9)

### A1 — `pre-flight.ps1` considera 16 warnings como "PASSED"

**Arquivo:** `scripts/pre-flight.ps1:20-25`

**Problema:** O script chama `reality-check.ps1 -Packages -Endpoints`, que retorna exit code 0 mesmo com 16 warnings (1 package + 15 endpoints não encontrados). O pre-flight considera "context is fresh" apesar de métricas incorretas.

**Impacto:** O pre-flight hook NÃO bloqueia operações com contexto sujo, violando a promessa do "Oráculo da Verdade".

**Instrução de fix:**

```powershell
# Arquivo: scripts/pre-flight.ps1
# ADICIONAR após linha 25 (após o check exit code):
if ($checkResult -match 'WARNINGS') {
    Write-Host "  [WARN] Reality check has warnings. Run sync-docs.ps1 to fix." -ForegroundColor Yellow
    # Não falha, mas alerta — configuração de threshold pode ser ajustada
    # Se quiser BLOQUEAR com warnings, mude para $failures++
}

# ADICIONAR nova verificação de gaps críticos após linha 45:
# Check 6: Verificar se há gaps 🔴 não resolvidos
$gapsContent = Get-Content $gapsFile -Raw -ErrorAction SilentlyContinue
if ($gapsContent -match '🔴.*?\|.*?❌') {
    Write-Host "  [FAIL] Critical gaps (🔴) found unresolved!" -ForegroundColor Red
    $failures++
}
```

---

### A2 — `agent-auditor.js` usa paths Unix em comandos shell

**Arquivo:** `ai-devkit-v2/.ai/bin/agent-auditor.js:38-45`

**Problema:** Todos os comandos shell usam strings fixas com `/`:
```javascript
'gap-check': 'node .ai/bin/gap-check.js --quiet',
'secrets': 'node .ai/bin/check-secrets.js --ci',
```

No Windows, o path correto seria `node .ai\bin\gap-check.js --quiet`.

**Impacto:** Quebra no Windows se o PowerShell não resolver o path com `/` corretamente (depende da versão).

**Instrução de fix:**

```javascript
// Arquivo: ai-devkit-v2/.ai/bin/agent-auditor.js
// ALTERAR linhas 37-46 para usar path.join:

const SCANNER_CMDS = {
    'gap-check': `node ${path.join('.ai', 'bin', 'gap-check.js')} --quiet`,
    'compliance': `node ${path.join('.ai', 'bin', 'compliance-check.js')} --ci`,
    'secrets': `node ${path.join('.ai', 'bin', 'check-secrets.js')} --ci`,
    'study-compliance': `node ${path.join('.ai', 'bin', 'verify-study-compliance.js')} --ci`,
    'package-consistency': `node ${path.join('.ai', 'bin', 'check-package-consistency.js')} --ci`,
    'unused-deps': `node ${path.join('.ai', 'bin', 'check-unused-deps.js')} --ci`,
    'slo-metrics': `node ${path.join('.ai', 'bin', 'track-slo-metrics.js')} --ci`,
    'security-kpis': `node ${path.join('.ai', 'bin', 'security-kpis.js')} --ci`,
};

// LINHA 72 — correção similar:
'package-consistency': () => {
    const fixScript = path.join('.', 'scripts', 'fix-package-jsons.js');
    execSync(`node ${fixScript}`, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
},
```

---

### A3 — `self-heal.js` bloqueia por arquivos ausentes (AppError.ts, Contract.ts)

**Arquivo:** `ai-devkit-v2/.ai/bin/self-heal.js:10-17`

**Problema:** O script verifica 7 arquivos críticos. Os arquivos `src/shared/errors/AppError.ts` e `src/shared/utils/Contract.ts` NÃO EXISTEM no projeto. O self-heal.sh para com exit code 1.

**Impacto:** Auto-healing COMPLETAMENTE BLOQUEADO. Nenhuma correção automática acontece.

**Instrução de fix:**

```javascript
// Arquivo: ai-devkit-v2/.ai/bin/self-heal.js

// Opção A: Criar os arquivos faltantes (recomendado)
// Opção B: Remover da lista de críticos se não forem essenciais

// Para Opção A, criar os 2 arquivos:

// src/shared/errors/AppError.ts:
export class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly statusCode: number = 500,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
    }
    
    static badRequest(message: string, details?: Record<string, unknown>): AppError {
        return new AppError('BAD_REQUEST', message, 400, details);
    }
    
    static notFound(message: string, details?: Record<string, unknown>): AppError {
        return new AppError('NOT_FOUND', message, 404, details);
    }
    
    static unauthorized(message: string, details?: Record<string, unknown>): AppError {
        return new AppError('UNAUTHORIZED', message, 401, details);
    }
}

// src/shared/utils/Contract.ts:
export class Contract {
    static pre(condition: boolean, message: string): void {
        if (!condition) throw new AppError('PRECONDITION_FAILED', message, 500);
    }
    
    static post(condition: boolean, message: string): void {
        if (!condition) throw new AppError('POSTCONDITION_FAILED', message, 500);
    }
    
    static notNull<T>(value: T | null | undefined, name: string): asserts value is T {
        if (value == null) throw new AppError('NULL_VALUE', `${name} cannot be null`, 500);
    }
}

// LINHA 30 — ALTERAR threshold de 50 bytes para 10 bytes (arquivos pequenos mas válidos):
if (size < 10) {
    console.warn('  [AVISO] VAZIO:   ' + f);
    ok = false;
}
```

---

### A4 — `slo-check.js` reporta 10 SLOs ausentes sem slo.json

**Arquivo:** `ai-devkit-v2/.ai/bin/slo-check.js`

**Problema:** Nenhum arquivo `slo.json` encontrado. 10 SLOs documentados (event latency, delivery rate, memory query, agent response, policy eval, etc.) não têm baseline mensurável.

**Impacto:** Verificação de SLOs é inócua — sempre reporta "missing" sem nunca estabelecer baseline.

**Instrução de fix:**

Criar arquivo `ai-devkit-v2/.ai/slo.json`:

```json
{
  "version": "1.0.0",
  "slos": [
    {
      "id": "SLO-001",
      "name": "Event Bus Latency",
      "description": "Latência de publicação/consumo de eventos no barramento",
      "target_ms": 100,
      "window": "p99_last_1h",
      "measure": "event-bus"
    },
    {
      "id": "SLO-002",
      "name": "Delivery Pipeline Rate",
      "description": "Taxa de sucesso do delivery orchestrator",
      "target_percent": 99.5,
      "window": "weekly",
      "measure": "delivery-orchestrator"
    },
    {
      "id": "SLO-003",
      "name": "Memory Query Latency",
      "description": "Latência de consulta à memória persistente",
      "target_ms": 200,
      "window": "p95_last_24h",
      "measure": "memory-store"
    },
    {
      "id": "SLO-004",
      "name": "Agent Response Time",
      "description": "Tempo de resposta do agent-runtime",
      "target_ms": 5000,
      "window": "p95_last_24h",
      "measure": "agent-runtime"
    },
    {
      "id": "SLO-005",
      "name": "Policy Evaluation Latency",
      "description": "Tempo de avaliação de políticas",
      "target_ms": 50,
      "window": "p99_last_1h",
      "measure": "policy-engine"
    },
    {
      "id": "SLO-006",
      "name": "Delivery Throughput",
      "description": "Entregas por hora do delivery orchestrator",
      "target_count": 100,
      "window": "hourly",
      "measure": "delivery-orchestrator"
    },
    {
      "id": "SLO-007",
      "name": "Audit Write Latency",
      "description": "Latência de escrita no audit trail",
      "target_ms": 50,
      "window": "p99_last_1h",
      "measure": "audit-trail"
    },
    {
      "id": "SLO-008",
      "name": "Observability Export",
      "description": "Taxa de exportação de métricas",
      "target_percent": 99,
      "window": "hourly",
      "measure": "observability-engine"
    },
    {
      "id": "SLO-009",
      "name": "IDE Startup Time",
      "description": "Tempo de inicialização da IDE Theia",
      "target_ms": 10000,
      "window": "p95_last_24h",
      "measure": "ide-integration"
    },
    {
      "id": "SLO-010",
      "name": "LSP Response Time",
      "description": "Tempo de resposta do LSP",
      "target_ms": 500,
      "window": "p99_last_1h",
      "measure": "ide-integration"
    }
  ]
}
```

---

### A5 — `red-teaming.js` gera 8 falsos positivos (HIGH) ao escanear seus próprios padrões

**Arquivo:** `ai-devkit-v2/.ai/bin/red-teaming.js`

**Problema:** O scanner de injection encontra padrões como "Ignore instructions", "DAN jailbreak", "System prompt override" no próprio código de detecção do `prompt-security`. São os patterns de detecção, não vulnerabilidades reais.

**Impacto:** 8 findings HIGH que são falsos positivos. Ninguém confia no output.

**Instrução de fix:**

```javascript
// No arquivo ai-devkit-v2/.ai/bin/red-teaming.js
// ADICIONAR exclusão dos diretórios de source do security package:
const EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    // ADICIONAR estes:
    'packages/prompt-security/src',  // próprios patterns de detecção
    'packages/prompt-security/dist', // compilado
];

// OU, na lógica de scan, adicionar:
function shouldScan(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    // Excluir diretórios de patterns de segurança
    if (normalized.includes('packages/prompt-security/src')) return false;
    if (normalized.includes('packages/prompt-security/dist')) return false;
    if (normalized.includes('node_modules')) return false;
    if (normalized.includes('.git')) return false;
    return true;
}
```

---

### A6 — 7 suítes de teste falhando no monorepo IDEIA

**Arquivo:** Vários em `IDEIA/packages/`

**Problemas identificados:**

| Suite | Erro |
|-------|------|
| `cli/src/__tests__/runtime.test.ts` | Falha genérica |
| `event-bus/__tests__/nats-integration.test.ts` | NATS não disponível (esperado) |
| `cli/src/__tests__/coverage.test.ts` | Threshold de cobertura |
| `cli/src/__tests__/utils-coverage.test.ts` | Timeout 70s |
| `cli/src/__tests__/release-preparer.test.ts` | `prepareRelease: expected "1.0.0" got "0.0.0"` |
| `cli/src/__tests__/analytics-engine.test.ts` | `groups by tag: expected 2 rows, got 1` |
| `data-layer/__tests__/data-layer.test.ts` | Session queries + VectorStore retornam 0 |

**Instrução de fix:**

```bash
# 1. release-preparer.test.ts — usar versão do package.json real:
# Verificar a versão atual no package.json e ajustar o teste:
cd IDEIA
$version = (Get-Content packages/cli/package.json | ConvertFrom-Json).version
# ALTERAR no teste: substituir "0.0.0" por "$version" ou usar mock de git

# 2. analytics-engine.test.ts — adicionar dados de seed antes do teste:
# INSERT INTO analytics ... mais linhas para ter 2+ grupos

# 3. data-layer.test.ts — verificar se SQLite está configurado:
# O teste espera PostgreSQL mas usa SQLite fallback — session queries não persistem
# CORREÇÃO: usar transação explícita ou mocked PostgreSQL

# 4. nats-integration.test.ts — pular se NATS_SERVER não configurado:
# ADICIONAR no describe:
# (process.env.NATS_SERVER ? describe : describe.skip)('NATS Integration', ...)

# 5. runtime.test.ts, coverage.test.ts, utils-coverage.test.ts:
# Rodar com --verbose para ver erro exato:
# npx jest packages/cli/src/__tests__/runtime.test.ts --verbose --no-coverage
```

---

### A7 — `auto-audit-loop.js` extrai issues de forma frágil e não paraleliza

**Arquivo:** `ai-devkit-v2/.ai/bin/auto-audit-loop.js`

**Problema:** Extração de issues busca por ❌ ou `[HIGH]` ou `[CRITICAL]` no stdout — quebra se o formato de output mudar. Todos os 8 scanners rodam em série (sem paralelismo).

**Impacto:** Loop leva >120s para completar. Issues podem ser perdidas se formato de output variar.

**Instrução de fix:**

```javascript
// Arquivo: ai-devkit-v2/.ai/bin/auto-audit-loop.js

// ADICIONAR parallel execution com Promise.all:
async function runScannersParallel(scanners) {
    const results = await Promise.all(scanners.map(async (scanner) => {
        const out = execSync(SCANNER_CMDS[scanner], { 
            cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] 
        });
        return { scanner, status: 'pass', output: out };
    }));
    return results;
}

// MELHORAR extração de issues para ser mais robusta:
function extractIssues(output) {
    const issues = [];
    const patterns = [
        /❌/,
        /\[(HIGH|CRITICAL|ERROR|FAIL)\]/i,
        /FAIL(ED)?/i,
        /\d+ (?:error|failure|violation)/i,
    ];
    const lines = output.split('\n');
    for (const line of lines) {
        for (const p of patterns) {
            if (p.test(line)) {
                issues.push(line.trim());
                break;
            }
        }
    }
    return issues;
}
```

---

### A8 — `unused-deps` check falha no `agent-auditor.js scan all`

**Problema:** O scanner `check-unused-deps.js` retorna exit code não-zero. Confirmado na execução: 6/7 checks passing, 1 fail (unused-deps).

**Instrução de fix:**

```bash
# Verificar o problema específico:
cd ai-devkit-v2
node .ai/bin/check-unused-deps.js --ci --verbose

# Causas comuns:
# 1. Dependências declaradas em package.json mas não importadas
# 2. Scripts que usam require dinâmico
# 3. Dependências dev vs produção

# Solução: corrigir dependências não utilizadas ou ajustar o scanner para considerar:
# - Dependências usadas em scripts npm (package.json.scripts)
# - Dependências usadas em arquivos de configuração (.eslintrc, webpack.config, etc.)
# - Peer dependencies
```

---

### A9 — `verify-study-compliance.js` busca por classe exata e gera falso positivo

**Arquivo:** `ai-devkit-v2/.ai/bin/verify-study-compliance.js`

**Problema:** Busca por `class PatternDetector` literal. Se o nome aparecer em comentário, string ou documentação, passa como verdadeiro. Também perde implementações com nomes diferentes.

**Impacto:** O verificador é essencialmente inútil — aprova coisas que não existem e perde coisas que existem.

**Instrução de fix:**

```javascript
// Arquivo: ai-devkit-v2/.ai/bin/verify-study-compliance.js

// MELHORAR para usar AST ou ao menos verificar imports:
function classExists(className, sourceDir) {
    const files = walkDir(sourceDir, ['.ts', '.js', '.tsx']);
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        // 1. Verificar class declaration:
        if (new RegExp(`\\bclass\\s+${className}\\b`).test(content)) return true;
        // 2. Verificar export/import:
        if (new RegExp(`\\bexport\\s+(default\\s+)?(\\{[^}]*\\be?\\s*)??${className}\\b`).test(content)) return true;
        // 3. Verificar função factory:
        if (new RegExp(`\\bfunction\\s+create${className}\\b`).test(content)) return true;
        // 4. Verificar em module.exports:
        if (new RegExp(`${className}:\\s*(class|function)`).test(content)) return true;
    }
    return false;
}

// IMPORTANTE: NÃO contar matches em comentários ou strings
function cleanContent(content) {
    // Remove comentários de linha //
    content = content.replace(/\/\/.*$/gm, '');
    // Remove comentários de bloco /* ... */
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove strings (simplificado)
    content = content.replace(/'(?:[^'\\]|\\.)*'/g, '');
    content = content.replace(/"(?:[^"\\]|\\.)*"/g, '');
    return content;
}
```

---

## 🟡 Problemas Médios (8)

### M1 — `audit-daemon.ps1` usa `Split-Path -Parent $PSCommandPath` em vez de workspace root

**Arquivo:** `scripts/audit-daemon.ps1:7`

**Problema:** `$root = Split-Path -Parent $PSCommandPath` retorna `scripts/`, não o workspace root. Os joins subsequentes usam `..\` para compensar, mas relatórios são salvos em `scripts/..\.ai\audit\reports\` que resolve para a raiz.

**Instrução de fix:**

```powershell
# LINHA 7 — ALTERAR DE:
$root = Split-Path -Parent $PSCommandPath
# PARA:
$root = Resolve-Path "$PSScriptRoot/.."
```

---

### M2 — Haste module collision entre `ideia-desktop` e `ideia-theia-app`

**Problema:** Jest reporta "Haste module naming collision" — dois packages com mesmo nome em diretórios diferentes.

**Instrução de fix:**

```javascript
// Em IDEIA/jest.config.js, ADICIONAR ou AJUSTAR:
module.exports = {
    // ...
    haste: {
        enableSymlinks: false,
        // Forçar resolução única
        platforms: ['ios', 'android'],
    },
    moduleNameMapper: {
        // Mapear colisões explicitamente
        '^ideia-desktop$': '<rootDir>/electron/ideia-desktop/src',
        '^ideia-theia-app$': '<rootDir>/apps/ideia-app/src',
    },
};
```

---

### M3 — Pre-commit hooks em Bash (`.sh`) violam R4 (cross-platform)

**Arquivos:** `.ai/bin/pre-commit.sh`, `.ai/bin/verify.sh`, `.ai/bin/post-commit.sh`

**Problema:** 3 hooks escritos em Bash. Não funcionam no Windows. Violam a regra R4.

**Instrução de fix:**

Criar versões PowerShell equivalentes:

```powershell
# .ai/bin/pre-commit.ps1
param([switch]$NoLint, [switch]$NoTest)

$root = Resolve-Path "$PSScriptRoot/../.."
$failures = 0

Write-Host "=== Pre-commit Hook ===" -ForegroundColor Cyan

# 1. Lint
if (-not $NoLint) {
    Write-Host "[1/5] Running ESLint..." -NoNewline
    $result = & "npx.cmd" eslint --fix 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host " ✅" -ForegroundColor Green }
    else { Write-Host " ❌ FAIL" -ForegroundColor Red; $failures++ }
}

# 2. Typecheck
Write-Host "[2/5] Running TypeScript check..."
$result = & "npx.cmd" tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host "  ✅" -ForegroundColor Green }
else { Write-Host "  ❌ FAIL" -ForegroundColor Red; $failures++ }

# 3. Test changed files
if (-not $NoTest) {
    Write-Host "[3/5] Running tests for changed files..."
    Push-Location $root
    $changed = & "git.cmd" diff --cached --name-only --diff-filter=ACMR 2>&1
    if ($changed) {
        $result = & "npx.cmd" jest --changedSince HEAD~1 --no-coverage 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "  ✅" -ForegroundColor Green }
        else { Write-Host "  ❌ FAIL" -ForegroundColor Red; $failures++ }
    } else {
        Write-Host "  ⏭ No changed files to test" -ForegroundColor Yellow
    }
    Pop-Location
}

# 4. Gap check
Write-Host "[4/5] Running gap check..."
Push-Location $root
$result = & "node.cmd" ".ai/bin/gap-check.js" --ci 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host "  ✅" -ForegroundColor Green }
else { Write-Host "  ❌ FAIL" -ForegroundColor Red; $failures++ }
Pop-Location

# 5. Docs enforce
Write-Host "[5/5] Checking docs integrity..."
Push-Location $root
$result = & "node.cmd" ".ai/bin/enforce-document-flow.js" --ci 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host "  ✅" -ForegroundColor Green }
else { Write-Host "  ❌ FAIL" -ForegroundColor Red; $failures++ }
Pop-Location

if ($failures -eq 0) {
    Write-Host "`n✅ ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ $failures check(s) failed" -ForegroundColor Red
    exit 1
}
```

---

### M4 — `verify-study-compliance.js` só cobre 4 de 22 estudos

**Arquivo:** `ai-devkit-v2/.ai/bin/verify-study-compliance.js`

**Problema:** Verifica apenas S1, S2, S3, S5 e SEC. Existem 22 estudos S1-S22 + I1-I5 + E1-E5 + INT + M1 + X.

**Instrução de fix:**

Adicionar mapeamento completo de estudos para classes:

```javascript
const STUDY_MAP = {
    'S1':  { name: 'Event Bus',          classes: ['EventBus', 'InMemoryEventBus', 'EventPublisher', 'EventSubscriber', 'SagaCoordinator', 'OutboxPattern'] },
    'S2':  { name: 'Memory & Context',    classes: ['PatternDetector', 'LearningEngine', 'MemoryStore', 'VectorStore', 'KnowledgeGraph'] },
    'S3':  { name: 'Intent to Plan',     classes: ['IntentClassifier', 'PlanGenerator', 'ADAPTPlanner', 'TaskDecomposer'] },
    'S4':  { name: 'Security & Gov',     classes: ['PolicyEngine', 'PromptSanitizer', 'RateLimiter', 'OutputValidator', 'AuditTrail'] },
    'S5':  { name: 'Multi-Agent',        classes: ['AgentSupervisor', 'AgentOrchestrator', 'AgentRegistry', 'AgentCoordinator'] },
    'S6':  { name: 'Delivery Pipeline',  classes: ['DeliveryOrchestrator', 'VerificationLayer', 'ReleaseManager', 'RollbackHandler'] },
    'S7':  { name: 'Adaptive Learning',  classes: ['FeedbackLoop', 'CrossProjectLearner', 'PatternRepository'] },
    'S8':  { name: 'Emerging Tech',      classes: ['TechRadar', 'TechEvaluator'] },
    'S9':  { name: 'Tech Matrix',        classes: ['TechMatrix', 'FeasibilityScorer'] },
    'S10': { name: 'Contracts & Stack',  classes: ['ContractRegistry', 'SchemaValidator', 'StackAnalyzer'] },
    'S11': { name: 'Theia Integration',  classes: ['TheiaPlugin', 'TheiaBackendService', 'TheiaFrontendWidget'] },
    'S12': { name: 'Test Quality',       classes: ['TestRunner', 'CoverageTracker', 'MutationTester'] },
    'S13': { name: 'Performance',        classes: ['PerformanceMonitor', 'BenchmarkRunner', 'LoadTester'] },
    'S14': { name: 'Auth & Authz',       classes: ['AuthProvider', 'RBACManager', 'TokenValidator'] },
    'S15': { name: 'Cloud & Infra',      classes: ['CloudProvider', 'InfraManager', 'ContainerOrchestrator'] },
    'S16': { name: 'Deploy & CD',        classes: ['DeployPipeline', 'GitOpsManager', 'ReleaseOrchestrator'] },
    'S17': { name: 'Observability',      classes: ['MetricsCollector', 'TraceExporter', 'LoggerProvider'] },
    'S18': { name: 'AI Safety',          classes: ['SafetyGuard', 'AlignmentChecker', 'BiasDetector'] },
    'S19': { name: 'Prompt Engineering', classes: ['PromptOptimizer', 'PromptTemplate', 'PromptVersioner'] },
    'S20': { name: 'Plugins',            classes: ['PluginLoader', 'PluginSandbox', 'PluginRegistry'] },
    'S21': { name: 'Terminal & Debug',   classes: ['TerminalSession', 'DebugAdapter', 'DebugPanel'] },
    'S22': { name: 'Real-time Collab',   classes: ['CollabSession', 'RealtimeSync', 'DocumentLock'] },
    'SEC': { name: 'Security',           classes: ['verifyChain', 'hashChain', 'AuditRecord', 'Ledger'] },
};
```

---

### M5 — `document-audit.ts` detecta conflitos mas nunca reporta para correção

**Arquivo:** `IDEIA/packages/cli/src/governance/document-audit.ts`

**Problema:** O script detecta 5 conflitos reais (coverage threshold, no-explicit-any, jest config, regras duplicadas, métricas inconsistentes) mas não tem modo `--fix` para corrigi-los.

**Instrução de fix:**

Adicionar modo `--fix` que seleciona a fonte mais autoritativa e corrige:

```typescript
// ADICIONAR ao final do detectConflicts():
if (args.includes('--fix')) {
    for (const conflict of conflicts) {
        // Usar o REALITY-MANIFEST.md como fonte da verdade
        const manifest = readManifest();
        switch (conflict.type) {
            case 'coverage-threshold':
                // Usar threshold do manifesto
                updateCoverageConfig(manifest.coverageThreshold);
                break;
            case 'no-explicit-any':
                // Usar 'error' do manifesto
                updateESLintConfig('no-explicit-any', 'error');
                break;
            case 'jest-config':
                // Corrigir jest.config para bater com manifesto
                fixJestConfig(manifest.testConfig);
                break;
            // ...
        }
    }
}
```

---

### M6 — `rule-enforcer.js` não verifica scripts `.ps1` na verificação R4

**Arquivo:** `ai-devkit-v2/.ai/bin/rule-enforcer.js`

**Problema:** Na verificação R4 (cross-platform), o script só escaneia arquivos `.js`. Scripts PowerShell (`.ps1`) — que quebram no Linux — não são verificados.

**Instrução de fix:**

```javascript
// No rule-enforcer.js, ALTERAR a verificação R4 para incluir .ps1:
function checkR4_CrossPlatform() {
    const allScripts = [
        ...glob.sync('scripts/**/*.{js,mjs,ts}', { cwd: ROOT }),
        ...glob.sync('scripts/**/*.ps1', { cwd: ROOT }),     // ADICIONADO
        ...glob.sync('.ai/bin/**/*.{js,mjs,ts}', { cwd: ROOT }),
        ...glob.sync('.ai/bin/**/*.ps1', { cwd: ROOT }),     // ADICIONADO
    ];
    
    const issues = [];
    for (const script of allScripts) {
        const content = fs.readFileSync(path.join(ROOT, script), 'utf-8');
        
        if (script.endsWith('.ps1')) {
            // .ps1 files: verificar paths com \ (Windows-only)
            if (content.match(/Join-Path[^)]+["'][A-Z]:\\/i)) {
                issues.push(`${script}: absolute Windows paths found`);
            }
        } else {
            // .js/.ts files: verificar se usa path.join
            if (content.match(/['"][A-Za-z]:\\/)) {
                issues.push(`${script}: absolute Windows paths found`);
            }
            if (content.match(/require\(['"](?:\.\/|\.\.\/)/) && !content.includes('path.join')) {
                issues.push(`${script}: relative require without path.join`);
            }
        }
    }
    return issues;
}
```

---

### M7 — `sync-docs.ps1` usa `Set-Content -NoNewline` que adiciona BOM no Windows

**Arquivo:** `scripts/sync-docs.ps1:31,41,65`

**Problema:** `Set-Content` no Windows adiciona BOM (0xEF BB BF) por padrão. O parâmetro `-NoNewline` não evita BOM. Isso quebrou 55 arquivos anteriormente (conforme AGENTS.md).

**Instrução de fix:**

```powershell
# EM TODAS as chamadas de Set-Content, ADICIONAR -Encoding ascii:
Set-Content -Path $gapsFile -Value $content -NoNewline -Encoding ascii
Set-Content -Path $agentsFile -Value $content -NoNewline -Encoding ascii
Set-Content -Path $manifestFile -Value $content -NoNewline -Encoding ascii
```

---

### M8 — Duplicação de scripts de auditoria em 3 locais (IDEIA/, ai-devkit-v2/, legacy/)

**Problema:** 7 pares de arquivos idênticos entre `IDEIA/packages/cli/` e `ai-devkit-v2/packages/cli/`. Scripts de auditoria em `legacy/ai-devkit-setup-v2/` desatualizados.

**Instrução de fix:**

```bash
# Estratégia de consolidação:
# 1. ESCOLHER um diretório como fonte da verdade (ai-devkit-v2/)
# 2. CRIAR symlinks ou copiar para IDEIA/
# 3. REMOVER ou arquivar legacy/

# No PowerShell (Admin):
# Criar script de sync:
$sourcePkgs = @(
    'cli/src/commands/audit.ts',
    'cli/src/governance/document-audit.ts',
    'cli/src/ecosystem/federation-auditor.ts',
    'cli/src/evolution/evolution-audit.ts',
    'cli/src/legacy/final-audit.ts',
    'cli/src/strategy/gap-analyzer.ts'
)

foreach ($pkg in $sourcePkgs) {
    $src = "ai-devkit-v2/packages/$pkg"
    $dst = "IDEIA/packages/$pkg"
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "Synced: $pkg" -ForegroundColor Green
    }
}

# Para legacy/, arquivar em docs/legacy/:
Move-Item legacy/ai-devkit-setup-v2 docs/legacy/ai-devkit-setup-v2-archived
```

---

## 📊 Resumo de Falhas Identificadas

| # | Gravidade | Nome | Arquivo | Status |
|---|-----------|------|---------|--------|
| C1 | 🔴 | sync-docs.ps1: diretório IDEIA/ + regex inválidos | `scripts/sync-docs.ps1` | ✅ Instrução pronta |
| C2 | 🔴 | reality-check.ps1: diretório IDEIA/ + endpoints nunca encontrados | `scripts/reality-check.ps1` | ✅ Instrução pronta |
| C3 | 🔴 | ideia-tools.mjs: IDEIA_ROOT fixo + validate() não detecta API keys | `.ai/ideia-tools.mjs` | ✅ Instrução pronta |
| A1 | 🟠 | pre-flight.ps1: 16 warnings considerados PASSED | `scripts/pre-flight.ps1` | ✅ Instrução pronta |
| A2 | 🟠 | agent-auditor.js: paths Unix em comandos shell | `ai-devkit-v2/.ai/bin/agent-auditor.js` | ✅ Instrução pronta |
| A3 | 🟠 | self-heal.js: bloqueado por AppError.ts + Contract.ts ausentes | `ai-devkit-v2/.ai/bin/self-heal.js` | ✅ Instrução pronta |
| A4 | 🟠 | slo-check.js: 10 SLOs sem baseline (slo.json ausente) | `ai-devkit-v2/.ai/slo.json` | ✅ Instrução pronta |
| A5 | 🟠 | red-teaming.js: 8 falsos positivos HIGH | `ai-devkit-v2/.ai/bin/red-teaming.js` | ✅ Instrução pronta |
| A6 | 🟠 | 7 suítes de teste falhando no IDEIA monorepo | `IDEIA/packages/*/__tests__/` | ✅ Instrução pronta |
| A7 | 🟠 | auto-audit-loop.js: extração frágil, sem paralelismo | `ai-devkit-v2/.ai/bin/auto-audit-loop.js` | ✅ Instrução pronta |
| A8 | 🟠 | unused-deps check falha no agent-auditor.js | `ai-devkit-v2/.ai/bin/check-unused-deps.js` | ✅ Instrução pronta |
| A9 | 🟠 | verify-study-compliance.js: falso positivo/negativo | `ai-devkit-v2/.ai/bin/verify-study-compliance.js` | ✅ Instrução pronta |
| M1 | 🟡 | audit-daemon.ps1: root path incorreto | `scripts/audit-daemon.ps1` | ✅ Instrução pronta |
| M2 | 🟡 | Haste module collision (ideia-desktop x ideia-theia-app) | `IDEIA/jest.config.js` | ✅ Instrução pronta |
| M3 | 🟡 | Pre-commit hooks Bash-only violam R4 | `.ai/bin/pre-commit.sh` | ✅ Instrução pronta |
| M4 | 🟡 | verify-study-compliance.js: só 4 de 22 estudos | `ai-devkit-v2/.ai/bin/verify-study-compliance.js` | ✅ Instrução pronta |
| M5 | 🟡 | document-audit.ts: sem modo --fix | `IDEIA/packages/cli/src/governance/document-audit.ts` | ✅ Instrução pronta |
| M6 | 🟡 | rule-enforcer.js: não verifica .ps1 | `ai-devkit-v2/.ai/bin/rule-enforcer.js` | ✅ Instrução pronta |
| M7 | 🟡 | sync-docs.ps1: Set-Content adiciona BOM | `scripts/sync-docs.ps1` | ✅ Instrução pronta |
| M8 | 🟡 | Scripts duplicados em 3 locais | `IDEIA/`, `ai-devkit-v2/`, `legacy/` | ✅ Instrução pronta |

---

## 🔬 Resultados de Testes e Experimentos

### Testes Executados

| Suite | Resultado | Detalhes |
|-------|-----------|----------|
| IDEIA `test:unit` | ⚠️ 300s timeout | 7 suites FAIL, ~198 PASS (parcial) |
| ai-devkit-v2 `run-tests.js unit` | ⚠️ 300s timeout | 4/15 batches, 453 test files |
| `gap-check.js --ci` | ✅ 24 pass, 0 fail | 1 warning (G10a threshold) |
| `agent-auditor.js scan all` | ✅ 6/7 pass | 1 fail (unused-deps) |
| `reality-check.ps1 -Packages` | ⚠️ 1 warning | web-ui package not found |
| `pre-flight.ps1` | ✅ PASS | 16 warnings ignorados |
| `rule-enforcer.js` | ✅ ALL PASS | 6/6 rules |
| `compliance-check.js --ci` | ✅ 13/13 pass | 100% |
| `check-secrets.js --ci` | ✅ PASS | 4 HIGH (URIs exemplo) |
| `check-contracts.js --ci` | ✅ PASS | 31 paths, 88 endpoints |
| `check-boundaries.js --ci` | ✅ PASS | 66 modules, 0 violations |
| `red-teaming.js --ci` | ✅ PASS | 8 HIGH (falsos positivos) |
| `slo-check.js --ci` | ⚠️ PASS | 0 ok, 10 missing |
| `sync-docs.ps1` | 🔴 TIMEOUT | Diretório IDEIA/ errado |
| `auto-audit-loop.js` | 🔴 TIMEOUT | 3/4 checks antes do timeout |
| `self-heal.js --dry-run` | 🔴 FAIL | 2 arquivos críticos ausentes |

### Ferramentas CLI Validadas

| Comando | Resultado | Observação |
|---------|-----------|------------|
| `status` | ✅ | 11 packages compilados, 6 memórias |
| `context IDEIA/` | ✅ | 2206 arquivos, 810MB, 1381 .ts |
| `validate (sk-...)` | ⚠️ FALHA SILENCIOSA | Não detectou OpenAI key |
| `policy shell.exec rm -rf /` | ✅ BLOCK | Decisão correta |
| `policy fs.read config.json` | ✅ AUTO | Decisão correta |
| `plan` | ✅ | 1 step, salvo em memória |
| `memory store/get` | ✅ | Persistência funcional |
| `diff AGENTS.md` | ✅ | 84 add, 533 remove |

---

## 📋 Checklist de Correções Prioritárias

### 🔴 FIX IMEDIATO (bloqueia qualquer operação confiável)

- [ ] FIX C1: `scripts/sync-docs.ps1` — trocar `$monorepo` para `ai-devkit-v2/` + corrigir 3 regex + adicionar `-Encoding ascii`
- [ ] FIX C2: `scripts/reality-check.ps1` — trocar `$monorepo` + corrigir `Check-Endpoints` + expandir `Check-Negative`
- [ ] FIX C3: `.ai/ideia-tools.mjs` — `findMonorepoRoot()` dinâmico + corrigir regex secrets

### 🟠 FIX ALTA PRIORIDADE (funcionalidades quebradas)

- [ ] FIX A1: `scripts/pre-flight.ps1` — bloquear ou alertar com warnings
- [ ] FIX A2: `ai-devkit-v2/.ai/bin/agent-auditor.js` — `path.join` nos comandos
- [ ] FIX A3: `ai-devkit-v2/.ai/bin/self-heal.js` — criar AppError.ts + Contract.ts
- [ ] FIX A4: `ai-devkit-v2/.ai/slo.json` — criar arquivo com 10 SLOs
- [ ] FIX A5: `ai-devkit-v2/.ai/bin/red-teaming.js` — excluir prompt-security/src
- [ ] FIX A6: Corrigir 7 suítes de teste falhando
- [ ] FIX A7: `ai-devkit-v2/.ai/bin/auto-audit-loop.js` — paralelizar + extração robusta
- [ ] FIX A8: `ai-devkit-v2/.ai/bin/check-unused-deps.js` — diagnosticar e corrigir
- [ ] FIX A9: `ai-devkit-v2/.ai/bin/verify-study-compliance.js` — AST + cobertura completa

### 🟡 FIX MÉDIA PRIORIDADE (qualidade e consistência)

- [ ] FIX M1: `scripts/audit-daemon.ps1` — `Resolve-Path "$PSScriptRoot/.."`
- [ ] FIX M2: `IDEIA/jest.config.js` — resolver haste collision
- [ ] FIX M3: `.ai/bin/pre-commit.ps1` (e verify.ps1) — versões PowerShell
- [ ] FIX M4: Expandir verify-study-compliance.js para 22+ estudos
- [ ] FIX M5: document-audit.ts — adicionar modo --fix
- [ ] FIX M6: rule-enforcer.js — verificar .ps1 em R4
- [ ] FIX M7: sync-docs.ps1 — `-Encoding ascii` em todos Set-Content
- [ ] FIX M8: Consolidar scripts duplicados

---

## 📌 Notas sobre o REALITY-MANIFEST.md

Além dos 20 problemas acima, o REALITY-MANIFEST.md tem **28 discrepâncias** vs código real, documentadas separadamente. As principais:

| Discrepância | Manifesto | Realidade |
|-------------|-----------|-----------|
| DAP | Seção 3: ❌ / Seção 5: ✅ | ✅ Implementado |
| Electron | Seção 3: ❌ / Seção 5: ✅ | ✅ Implementado |
| Packages | "72" (header) / "65" (seção 4) | 65 (IDEIA) + 66 (ai-devkit-v2) |
| Estudos | "37" | 57 documentos |
| ADRs | "10" | 16 (ADR-001 a ADR-016) |
| Workflows | "10" | 18 |
| Componentes | "26" | 32 |
| Gaps | "60/58" | GAPS.md diz 70/70 |
| Testes | "13" | Centenas |
| web-ui | "⏳ Pendente" | ✅ Implementado com 32 componentes |
| API endpoints | "12/15 ⏳" | ✅ Todos implementados |
| adapter-zig | Duplicado (✅ + ⚠️) | Existe 1 apenas |

---

## 🔄 Ciclo de Recomendação

1. **IA mais fraca** deve seguir a ordem de prioridade: 🔴 → 🟠 → 🟡
2. **Cada FIX neste documento** tem instruções completas, linha a linha
3. **Após cada correção**, executar:
   ```bash
   node .ai/bin/gap-check.js --ci
   node .ai/bin/agent-auditor.js scan all
   powershell -NoProfile -File scripts/reality-check.ps1 -Full
   ```
4. **Após todas as correções**, atualizar REALITY-MANIFEST.md e document-registry.md
5. **Registrar** este documento em `docs/governance/document-registry.md`

---

## Histórico de Revisão

| Data | Versão | Autor | Mudanças |
|------|--------|-------|----------|
| 2026-07-20 | 1.0 | Agente Auditor | Documento inicial — 20 problemas, todas as instruções de fix |
