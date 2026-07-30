# ESTUDO-D15 — CI/CD Pipeline Desktop

> **Data:** 2026-07-24
> **Versão:** 1.0
> **Propósito:** Pipeline completo de integração contínua e deploy para aplicações desktop — build matrix, code signing, release automation, quality gates.
> **Nível 1 — Técnico:** GitHub Actions, build matrix, runners, artefatos
> **Nível 2 — Engenharia:** Multi-plataforma, signing, notarization, publishing, testing
> **Nível 3 — Inovação:** Deterministic builds, supply chain SLSA, containerized builds
> **Nível 4 — Fronteiras:** Build time, cross-compilation, macOS runner custo
> **Origem:** ESTUDO-DESKTOP-NATIVE.md seção 4.1

---

## 1. NÍVEL TÉCNICO

### 1.1 Conceitos Fundamentais

CI/CD para desktop é mais complexo que web porque:
- Build matrix: Windows + macOS + Linux × x64 + arm64
- Code signing: certificados diferentes por plataforma
- Notarization: Apple exige processo extra
- Asset management: instaladores grandes (50-350MB)
- Testing: necessário hardware real ou VM por plataforma

**Ferramentas:**

| Ferramenta | Função | Uso na IDEIA |
|-----------|--------|-------------|
| GitHub Actions | CI/CD principal | Build + test + release |
| electron-builder | Build + package Electron | NSIS/DMG/AppImage |
| Rust (tauri build) | Build Tauri | Bundles nativos |
| AzureSignTool | Sign Windows | CI/CD sem expor chave |
| Apple notarytool | Notarize macOS | Submissão Apple |
| Softprops/action-gh-release | GitHub Releases | Upload assets |
| Playwright | E2E tests | Testes cross-platform |

### 1.2 Build Matrix

```
OS × Arch = 6 combinações principais

Windows:
  - x86_64-pc-windows-msvc  (NSIS + MSI)
  - aarch64-pc-windows-msvc (NSIS)

macOS:
  - x86_64-apple-darwin     (DMG)
  - aarch64-apple-darwin    (DMG, Apple Silicon)

Linux:
  - x86_64-unknown-linux-gnu (AppImage + deb)
  - aarch64-unknown-linux-gnu (AppImage + deb)
```

**Workflow base:**

```yaml
name: Desktop Build and Release

on:
  push:
    tags: ['v*']
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            arch: x64
            formats: nsis,msi
          - os: macos-latest
            target: aarch64-apple-darwin
            arch: arm64
            formats: dmg
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            arch: x64
            formats: appimage,deb

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust (Tauri)
        if: matrix.os != 'windows-latest'
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Linux dependencies
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit tests
        run: npm run test:unit

      - name: Build
        run: npm run build:electron
        env:
          NODE_ENV: production

      - name: Package
        run: npx electron-builder --${{ matrix.os }} --publish never
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Sign Windows
        if: matrix.os == 'windows-latest'
        run: |
          dotnet tool install --global AzureSignTool
          Get-ChildItem -Path dist/*.exe,dist/*.msi | ForEach-Object {
            AzureSignTool sign `
              -kvu "${{ secrets.AZURE_KV_URL }}" `
              -kvi "${{ secrets.AZURE_KV_CLIENT_ID }}" `
              -kvs "${{ secrets.AZURE_KV_CLIENT_SECRET }}" `
              -kvc "${{ secrets.AZURE_KV_CERT_NAME }}" `
              -tr "http://timestamp.digicert.com" `
              -v $_.FullName
          }

      - name: Notarize macOS
        if: matrix.os == 'macos-latest'
        run: |
          xcrun notarytool submit dist/*.dmg \
            --apple-id "$APPLE_ID" \
            --team-id "$APPLE_TEAM_ID" \
            --password "$APPLE_APP_SPECIFIC_PASSWORD" \
            --wait
          xcrun stapler staple dist/*.dmg

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ideia-${{ matrix.os }}-${{ matrix.arch }}
          path: |
            dist/*.exe
            dist/*.msi
            dist/*.dmg
            dist/*.AppImage
            dist/*.deb
          retention-days: 7

  release:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            **/ideia-*-x64/*.exe
            **/ideia-*-x64/*.msi
            **/ideia-*-arm64/*.dmg
            **/ideia-*-x64/*.AppImage
            **/ideia-*-x64/*.deb
          generate_release_notes: true
          draft: true
          prerelease: contains(github.ref_name, 'beta') || contains(github.ref_name, 'alpha')
```

---

## 2. NÍVEL ENGENHARIA

### 2.1 Quality Gates no Pipeline

```yaml
# quality-gates.yml — reutilizável
name: Desktop Quality Gates

on:
  pull_request:
    paths:
      - 'electron/**'
      - 'packages/tauri/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run ai:boundaries        # Boundaries arquiteturais
      - run: npm run ai:contract-check     # Contratos entre módulos
      - run: npm run ai:gap:check          # Gap analysis

  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security audit
        run: npx tsx scripts/security-pentest.ts --ci
      - name: Run SBOM check
        run: npx tsx scripts/generate-sbom.ts --ci
```

### 2.2 Release Canais

```
stable    → tag v1.0.0   → Push direto para produção
beta      → tag v1.0.0-beta.1 → Opt-in testers
alpha     → tag v1.0.0-alpha.1 → Desenvolvimento
nightly   → tag v0.0.0-nightly.YYYYMMDD → Build automático diário
```

**Estratégia de update:**

```
Usuário estável recebe:
  stable ← beta (após 1 semana de testes)
  stable ← alpha (após 2 semanas de testes)

Usuário beta recebe:
  beta ← alpha (após 1 semana)

Desenvolvedor:
  nightly (build da noite anterior)
```

### 2.3 Gerenciamento de Secrets

```yaml
# Secrets necessários no GitHub Actions
# Nível: Repository secrets

# Windows Code Signing
AZURE_KV_URL: https://ideia-kv.vault.azure.net
AZURE_KV_CLIENT_ID: <app-registration-client-id>
AZURE_KV_CLIENT_SECRET: <app-registration-secret>
AZURE_KV_CERT_NAME: code-signing-cert

# macOS Code Signing
APPLE_ID: developer@ideia.dev
APPLE_APP_SPECIFIC_PASSWORD: <app-specific-password>
APPLE_TEAM_ID: TEAMID

# Tauri Signing
TAURI_SIGNING_PRIVATE_KEY: <ed25519-private-key>
TAURI_SIGNING_PASSWORD: <key-password>

# GitHub Release
GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Automático
```

### 2.4 Pipeline de Build Theia + Electron (5 passos)

O script `scripts/build-installer.js` atual implementa:

```
Passo 1: Build Theia Plugin
  cd packages/ideia-plugin && npm run build

Passo 2: Build Theia Application
  npx theia build --app-out-dir electron/lib

Passo 3: Build Electron Main
  cd electron && npm run build

Passo 4: Package Installer
  cd electron && npx electron-builder

Passo 5: Code Sign
  node src/code-sign.ts dist/*.exe
```

**Otimização para CI:**

```yaml
name: Build Installer Matrix

jobs:
  plugin:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm run build --prefix packages/ideia-plugin
      - uses: actions/upload-artifact@v4
        with:
          name: theia-plugin
          path: packages/ideia-plugin/lib/

  theia:
    needs: plugin
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: theia-plugin
      - run: npx theia build
      - uses: actions/upload-artifact@v4
        with:
          name: theia-app
          path: electron/lib/

  electron:
    needs: theia
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: theia-app
          path: electron/lib/
      - run: cd electron && npm run build
      - run: cd electron && npx electron-builder
      - uses: actions/upload-artifact@v4
        with:
          name: installer-${{ matrix.os }}
          path: electron/dist/
```

### 2.5 Testes Automatizados

**E2E com Playwright:**

```typescript
// tests/e2e/installer.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { join } from 'path';

test.describe('Desktop Installer', () => {
  test('should launch after installation', async () => {
    const installerPath = join(__dirname, 'dist', 'IDEIA-Setup.exe');
    execSync(`"${installerPath}" /S`, { timeout: 120000 });
    const appPath = join(process.env.LOCALAPPDATA!, 'IDEIA', 'IDEIA.exe');
    const app = await electron.launch({ executablePath: appPath });
    const window = await app.firstWindow();
    await expect(window).toHaveTitle(/IDEIA/);
    await app.close();
  });
});

// tests/e2e/features.spec.ts
test.describe('Desktop Features', () => {
  test('tray icon should appear', async () => {
    // ...
  });

  test('deep link should open project', async () => {
    // ideia://open?path=/test-project
  });

  test('auto-update check should work', async () => {
    // Mock update server
  });
});
```

---

## 3. NÍVEL INOVAÇÃO

### 3.1 Deterministic/Reproducible Builds

```yaml
# Para verificação de supply chain
# Garantir que o mesmo source produz o mesmo binary

steps:
  - name: Set BUILD_TIMESTAMP
    run: echo "BUILD_TIMESTAMP=$(git log -1 --format=%ct)" >> $GITHUB_ENV

  - name: Build with REPRODUCIBLE_BUILD
    run: |
      export SOURCE_DATE_EPOCH=${{ env.BUILD_TIMESTAMP }}
      export RUSTFLAGS="--remap-path-prefix=$PWD=."
      npx tauri build
```

### 3.2 Supply Chain Security (SLSA)

```
Level 1: Build script + provenance
Level 2: Build isolation + signed provenance
Level 3: No user-controlled steps + hermetic build
Level 4: Two-person review + full audit trail
```

**Implementação SLSA 2+:**

```yaml
name: SLSA Generator v2
permissions:
  id-token: write
  contents: read
  attestations: write

jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: slsa-framework/slsa-github-generator/.github/actions/build/node@v2
        with:
          artifact-name: ideia-installers
      - uses: actions/upload-artifact@v4
        with:
          name: installer-provenance
          path: build/intoto.jsonl
```

### 3.3 Build Containerizado

```dockerfile
# Dockerfile.linux-builder
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
  nodejs npm curl \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev patchelf

COPY . /build
WORKDIR /build

RUN npm ci && npm run build && npx tauri build

CMD ["cp", "-r", "src-tauri/target/release/bundle/", "/output"]
```

---

## 4. NÍVEL FRONTEIRAS

### 4.1 Problemas em Aberto

| Problema | Impacto | Possível Solução |
|----------|---------|-----------------|
| Build Electron ~20min | CI lento, feedback demorado | Cache de node_modules + Chromium binary |
| Cross-compilation Rust | s target nem sempre funciona | Native runners para cada plataforma |
| macOS runner custo | $0.08/min, ~$5/build | Self-hosted Mac mini |
| Notarization timeout | Apple servers lentos | Retry + timeout maior |
| Installer 300MB download | Usuários com internet lenta | Delta updates, chunked download |

### 4.2 Trade-offs

```
Build speed       ← → Matrix coverage
Binary size       ← → Features incluídas
Release frequency ← → Quality assurance
Self-hosted custo ← → GitHub Actions custo
Signing security  ← → CI/CD automation
```

### 4.3 Hipóteses para IDEIA

1. **Self-hosted runners** para reduzir custo macOS
2. **Binary cache** entre builds (reduzir 20min → 5min)
3. **Build agent** como sidecar (IDEIA constrói a si mesma?)
4. **Cross-compilation via Zig** (zig-cc para compilar Rust/C++)

---

## 5. ANÁLISE PARA IDEIA — IMPLEMENTAÇÃO

### 5.1 O Que Existe vs O Que FALTA

**Existe:**
- `scripts/build-installer.js` — pipeline de 5 passos

**FALTA (criar):**

```yaml
# .github/workflows/desktop-release.yml  ← NÃO EXISTE
# .github/workflows/desktop-quality.yml   ← NÃO EXISTE
# .github/workflows/desktop-nightly.yml   ← NÃO EXISTE
```

### 5.2 Workflows para Criar Imediatamente

**1. PR Quality Check:**

```yaml
name: PR Quality
on: pull_request
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:unit
      - run: npm run ai:boundaries
      - run: npm run ai:contract-check
```

**2. Nightly Build:**

```yaml
name: Nightly Desktop
on:
  schedule:
    - cron: '0 6 * * 1-5'  # 06:00 UTC, seg-sex

jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build:electron
      - run: npx electron-builder --linux
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: nightly-$(date +%Y%m%d)
          prerelease: true
          files: dist/*.AppImage
```

**3. Full Release Pipeline:**

Ver seção 1.2 (workflow completo acima) — criar em `.github/workflows/desktop-release.yml`

### 5.3 Integração com Reality-Sync

```typescript
// Extensão: DesktopBuildTracker para reality-sync
class DesktopBuildTracker {
  async onRelease(tag: string) {
    // 1. Atualizar REALITY-MANIFEST com nova versão
    // 2. Registrar no audit trail
    // 3. Notificar canais (Slack, email)
    // 4. Verificar health dos instaladores
    // 5. Atualizar document-registry
  }

  async trackBuildStatus() {
    // Monitorar GitHub Actions runs
    // Reportar falhas no tray
  }
}
```

### 5.4 Maturidade e Viabilidade

| Requisito | Estado | Ação |
|-----------|--------|------|
| GitHub Actions configurado | ❌ Ausente | Criar 3 workflows |
| Code signing automático | ⚠️ Parcial | Configurar Azure Key Vault |
| Testes E2E desktop | ❌ Ausente | Playwright + Spectron |
| Build matrix 6 targets | ⚠️ Só Windows | Adicionar macOS + Linux |
| Release automation | ⚠️ Manual | softprops/action-gh-release |
| Nightly builds | ❌ Ausente | Cron job |
| Delta updates | ❌ Ausente | electron-updater differential |

---

## 5. QUALITY GATES INTEGRATION

### 5.1 Quality Gates no Pipeline Desktop

```yaml
check-bundle-size:
  run: npx tsx scripts/check-budget.ts budgets.json
  fail-if: bundleSizeGzip > 2.5
check-signatures:
  run: npx tsx scripts/verify-signatures.ts
  fail-if: any unsigned binary
check-vulnerabilities:
  run: npx tsx scripts/snyk-scan.ts
  fail-if: any critical vulnerability
check-e2e:
  run: npx playwright test --project=desktop
  fail-if: any test failure
```

### 5.2 CI Pipeline Performance Metrics

| Métrica | Atual | Alvo | Ferramenta |
|---------|-------|------|------------|
| Build time (full matrix) | 45 min | <20 min | GitHub Actions cache |
| Test time (unit + e2e) | 30 min | <15 min | Parallel matrix |
| Code signing | 5 min | <2 min | Azure Key Vault |
| Release publish | 10 min | <3 min | softprops/action-gh-release |
| Rollback time | 15 min | <3 min | Automated rollback script |

### 5.3 Delta Updates Strategy

```typescript
class DeltaUpdateManager {
  async calculateDelta(version: string, previousVersion: string): Promise<DeltaInfo> {
    const current = await this.fetchAssets(version);
    const previous = await this.fetchAssets(previousVersion);
    return {
      version, previousVersion,
      downloadSize: this.estimateDownloadSize(current, previous),
      blocksChanged: this.countChangedBlocks(current, previous),
    };
  }

  async generateBlockMap(appPath: string): Promise<BlockMap> {
    const blocks: Block[] = [];
    return { blocks, hash: 'sha256', version: 2 };
  }
}
```

---

## 6. Desktop Release Automation Implementation

### 6.1 Release Workflow CI

```yaml
name: Desktop Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        arch: [x64, arm64]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build

      - name: Sign Windows
        if: matrix.os == 'windows-latest'
        run: npx tsx scripts/sign-windows.ts
        env:
          AZURE_KEY_VAULT_URI: ${{ secrets.AZURE_KEY_VAULT_URI }}
          CERTIFICATE_NAME: ${{ secrets.CERTIFICATE_NAME }}

      - name: Notarize macOS
        if: matrix.os == 'macos-latest'
        run: npx tsx scripts/notarize-macos.ts
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}

      - name: Build Installer
        run: npx electron-builder --publish=always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: installer-${{ matrix.os }}-${{ matrix.arch }}
          path: dist/installers/*
```

### 6.2 Automated Rollback

```typescript
class AutomatedRollback {
  async rollbackIfNeeded(version: string): Promise<void> {
    const health = await this.checkReleaseHealth(version);
    if (health.status === 'unhealthy') {
      await this.initiateRollback(version);
      await this.notifyTeam(version, health.reason);
    }
  }

  private async checkReleaseHealth(version: string): Promise<HealthStatus> {
    const crashRate = await this.getCrashRate(version);
    const errorRate = await this.getErrorRate(version);
    const activeUsers = await this.getActiveUsers(version);

    if (crashRate > 0.05 || errorRate > 0.1) {
      return { status: 'unhealthy', reason: `Crash rate: ${crashRate}, Error rate: ${errorRate}` };
    }
    return { status: 'healthy' };
  }

  private async initiateRollback(badVersion: string): Promise<void> {
    const previousVersion = await this.getPreviousVersion(badVersion);
    await this.electronUpdater.downgrade(previousVersion);
    await this.recordRollback(badVersion, previousVersion);
  }
}
```

### 6.3 CI/CD Performance Metrics Dashboard

```typescript
class CICDDashboard {
  async getMetrics(): Promise<DashboardData> {
    const [buildTimes, testTimes, releaseCount] = await Promise.all([
      this.getBuildTimeHistory(30),
      this.getTestTimeHistory(30),
      this.getReleaseCount(30),
    ]);

    return {
      avgBuildTime: buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length,
      avgTestTime: testTimes.reduce((a, b) => a + b, 0) / testTimes.length,
      totalReleases: releaseCount,
      successRate: await this.getSuccessRate(30),
      rollbackRate: await this.getRollbackRate(30),
      recoveryTime: await this.getMeanRecoveryTime(30),
    };
  }
}
```

---

## 7. Referências Adicionais

1. "GitHub Actions for Desktop" — docs.github.com
2. "Delta Updates with electron-updater" — electron-updater docs
3. "SLSA Build Levels" — slsa.dev/spec/v1.0/levels
4. "Code Signing Best Practices" — Microsoft
5. "Playwright for Electron" — playwright.dev

---

## Referências

1. GitHub Actions Documentation. docs.github.com/actions
2. electron-builder CI. electron.builder.io/ci
3. Tauri CI/CD. tauri.app/guides/building/ci
4. AzureSignTool. github.com/vcsjones/AzureSignTool
5. Apple Notarization. developer.apple.com/documentation/security/notarizing-macos-software
6. SLSA Framework. slsa.dev
7. Playwright Electron. playwright.dev/docs/api/class-electron
8. softprops/action-gh-release. github.com/softprops/action-gh-release
9. Obsidian Plugin API. docs.obsidian.md
10. JSON Canvas Spec. jsoncanvas.org
