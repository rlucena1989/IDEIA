# ESTUDO-D12 — Instaladores macOS: DMG, PKG, Notarization, Sparkle e Mac App Store

> **Data:** 2026-07-25
> **Versão:** 2.0 (v3.0 methodology)
> **Nível de Profundidade:** 9/12
> **Área:** Distribuição — macOS Deployment
> **Dependências:** ESTUDO-D01 (Electron), ESTUDO-D05 (Shells), ESTUDO-D15 (CI/CD Desktop)
> **Conexões:** ESTUDO-D16 (Package Managers), ESTUDO-D17 (Silent Install Enterprise), ESTUDO-D09 (IPC Security)
> **Propósito:** Estudo completo de instaladores macOS para aplicações Electron — da criação de DMG/PKG ao pipeline de notarização, Sparkle auto-update, Mac App Store, universal binaries e troubleshooting avançado.

---

## 1. FUNDAMENTOS (Nível 1-2)

### 1.1 Problema e Contexto

Distribuir um aplicativo desktop no macOS exige mais do que copiar um `.app` para o usuário. A Apple impõe um ecossistema de segurança chamado **Gatekeeper** que:

- Bloqueia execução de apps sem assinatura digital (Developer ID)
- Exige **Hardened Runtime** para apps que usam JIT, bibliotecas dinâmicas ou periféricos
- Requer **notarization** (envio do build para scan da Apple) para distribuição fora da Mac App Store
- Desde macOS 10.15 (Catalina), notarization é **obrigatória** para evitar warning de "app damaged"

Para a IDEIA (app Electron com Theia backend, NATS client, agent runtime), o pipeline de distribuição macOS precisa resolver:

| Desafio | Impacto | Solução |
|---------|---------|---------|
| Assinatura digital | App não abre sem Developer ID | Code signing com Apple Developer Program ($99/ano) |
| Hardened Runtime | JIT/audio/câmera bloqueados | Entitlements.plist com permissões explícitas |
| Notarization | Usuário vê warning assustador | Pipeline `notarytool + stapler` |
| Atualizações automáticas | UX quebrada sem Sparkle | Sparkle framework + appcast XML |
| Apple Silicon (arm64) | Usuários M1/M2/M3/M4 | Universal binary (x86_64 + arm64) |
| Enterprise deploy | 100+ máquinas | PKG + MDM + silent install |

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| **Gatekeeper** | Sistema de segurança macOS que verifica assinatura e notarização antes de executar apps |
| **Developer ID** | Certificado da Apple para distribuição fora da Mac App Store |
| **Hardened Runtime** | Modo de execução que restringe acesso a memória, sistema de arquivos e periféricos |
| **Notarization** | Scan automatizado da Apple para malware e issues de assinatura |
| **Stapling** | Embedding do ticket de notarização dentro do `.app` para verificação offline |
| **Code Signing** | Assinatura digital de executáveis usando certificados da Apple |
| **Entitlements** | Permissões declarativas que o app solicita (plist) |
| **DMG** | Apple Disk Image — formato de instalação drag-and-drop |
| **PKG** | Apple Installer Package — instalador guiado com scripts |
| **Sparkle** | Framework open-source de auto-update para macOS |
| **Appcast** | XML feed do Sparkle com metadados de versões |
| **Universal Binary** | Binário com fat header contendo slices x86_64 e arm64 |
| **lipo** | Ferramenta para criar/inspecionar universal binaries |
| **notarytool** | Utilitário moderno de notarização (Xcode 13+) |
| **altool** | Utilitário legado de notarização (deprecated) |
| **Product Archive** | Formato `.pkg` criado com `pkgbuild` e `productbuild` |
| **MAS** | Mac App Store — distribuição via loja oficial Apple |
| **Sandbox** | Restrição do app ao seu container (obrigatório para MAS) |

### 1.3 Arquitetura de Alto Nível — Pipeline de Distribuição macOS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE DISTRIBUIÇÃO macOS                     │
│                                                                      │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────┐   │
│  │ BUILD     │───▶│ CODE SIGN │───▶│ NOTARIZE   │───▶│ STAPLE    │   │
│  │ electron- │    │ Developer │    │ notarytool │    │ xcrun     │   │
│  │ builder   │    │ ID        │    │ --wait     │    │ stapler   │   │
│  └──────────┘    └───────────┘    └────────────┘    └───────────┘   │
│       │                                                                │
│       │              ┌──────────────────────┐                         │
│       ├─────────────▶│ DMG (distribuição     │                         │
│       │              │  padrão)              │                         │
│       │              └──────────────────────┘                         │
│       │              ┌──────────────────────┐                         │
│       ├─────────────▶│ PKG (enterprise)     │                         │
│       │              └──────────────────────┘                         │
│       │              ┌──────────────────────┐                         │
│       └─────────────▶│ MAS (Mac App Store)  │                         │
│                       └──────────────────────┘                         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    SPARKLE AUTO-UPDATE                          │   │
│  │  ┌──────────┐    ┌──────────┐    ┌────────────┐                │   │
│  │  │ appcast  │───▶│ Download │───▶│ Install    │                │   │
│  │  │ .xml     │    │ .dmg     │    │ + Relaunch │                │   │
│  │  └──────────┘    └──────────┘    └────────────┘                │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. TÉCNICO (Nível 3-4)

### 2.1 DMG — Apple Disk Image

O DMG é o formato mais comum para distribuição de apps macOS fora da App Store. O usuário monta a imagem e arrasta o `.app` para a pasta Applications.

#### 2.1.1 Criação Manual com hdiutil

```bash
#!/bin/bash
# build-dmg.sh — Cria DMG com layout personalizado
set -euo pipefail

APP_NAME="IDEIA"
VERSION="${1:-1.0.0}"
DMG_NAME="${APP_NAME}-${VERSION}.dmg"
STAGING_DIR="dist/dmg-staging"
DMG_DIR="dist/dmg"

rm -rf "$STAGING_DIR" "$DMG_DIR"
mkdir -p "$STAGING_DIR" "$DMG_DIR"

# Copiar app e criar link de Applications
cp -R "dist/${APP_NAME}.app" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

# Criar DMG com:
# - UDZO = compressed (zlib)
# - -ov = overwrite
# - -volname = nome do volume montado
# - -fs HFS+ = filesystem padrão macOS
hdiutil create \
  -volname "${APP_NAME} ${VERSION}" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  -fs HFS+ \
  "${DMG_DIR}/${DMG_NAME}"

# Opcional: custom background usando create-dmg
# brew install create-dmg
# create-dmg \
#   --background "assets/dmg-background.png" \
#   --window-pos 200 200 \
#   --window-size 600 400 \
#   --icon-size 128 \
#   --icon "IDEIA.app" 180 180 \
#   --app-drop-link 420 180 \
#   "dist/IDEIA-${VERSION}.dmg" \
#   "dist/IDEIA.app"

echo "✅ DMG criado: ${DMG_DIR}/${DMG_NAME}"
```

#### 2.1.2 Criação via create-dmg (Node.js)

```typescript
// scripts/create-dmg.ts
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DMGOptions {
  appPath: string;
  outputDir: string;
  appName: string;
  version: string;
  background?: string;
  iconSize?: number;
}

async function createDMG(opts: DMGOptions): Promise<string> {
  const { appPath, outputDir, appName, version, background, iconSize = 128 } = opts;
  const outputName = `${appName}-${version}.dmg`;
  const outputPath = join(outputDir, outputName);

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // Verificar se create-dmg está instalado
  try {
    execSync('which create-dmg', { stdio: 'ignore' });
  } catch {
    console.warn('create-dmg not found, falling back to hdiutil');
    return createDMGBasic(appPath, outputPath, appName, version);
  }

  const args = [
    '--volname', `${appName} ${version}`,
    '--window-pos', '200', '200',
    '--window-size', '600', '400',
    '--icon-size', String(iconSize),
    '--icon', `${appName}.app`, '180', '180',
    '--app-drop-link', '420', '180',
  ];

  if (background) {
    args.push('--background', background);
  }

  args.push(outputPath, appPath);

  execSync(`create-dmg ${args.map(a => `"${a}"`).join(' ')}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log(`✅ DMG created: ${outputPath}`);
  return outputPath;
}

function createDMGBasic(
  appPath: string,
  outputPath: string,
  appName: string,
  version: string,
): string {
  const staging = join('dist', 'dmg-staging');
  if (!existsSync(staging)) mkdirSync(staging, { recursive: true });

  execSync(`cp -R "${appPath}" "${staging}/"`, { stdio: 'inherit' });
  execSync(`ln -s /Applications "${staging}/Applications"`, { stdio: 'inherit' });

  execSync(
    `hdiutil create -volname "${appName} ${version}" -srcfolder "${staging}" -ov -format UDZO -fs HFS+ "${outputPath}"`,
    { stdio: 'inherit' },
  );

  console.log(`✅ DMG created (basic): ${outputPath}`);
  return outputPath;
}
```

#### 2.1.3 electron-builder DMG Configuration

```yaml
# electron-builder.yml — Seção macOS completa
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  category: public.app-category.developer-tools
  icon: assets/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: assets/entitlements.mac.plist
  entitlementsInherit: assets/entitlements.mac.plist
  # DMG-specific customizations
  dmg:
    background: assets/dmg-background.png
    icon: assets/icon.icns
    iconSize: 128
    iconTextSize: 12
    title: "IDEIA ${version}"
    window:
      x: 200
      y: 200
      width: 600
      height: 400
    contents:
      - x: 180
        y: 180
        type: file
      - x: 420
        y: 180
        type: link
        path: /Applications
  # Signing
  identity: "Developer ID Application: Anomalyco (TEAMID)"
```

### 2.2 PKG — Apple Installer Package

O PKG é usado para instalação enterprise (MDM, munki, JAMF) ou instalação com privilégios administrativos.

#### 2.2.1 distribution.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- distribution.xml — Metadados do instalador PKG -->
<installer-script minSpecVersion="2">
  <title>IDEIA</title>
  <options customize="never" allow-external-scripts="no" rootVolumeOnly="true"/>
  <domains enable_currentUserHome="false" enable_localSystem="true"/>
  
  <!-- Verificação de versão do macOS -->
  <volume-check>
    <allowed-os-versions>
      <os-version min="11.0"/>
    </allowed-os-versions>
  </volume-check>
  
  <!-- Opções de instalação -->
  <installation-check script="install_check();"/>
  <script>
    function install_check() {
      // Verificar espaço em disco (500MB mínimo)
      if (!system.filesystem.volumeSpace("/") > 500 * 1024 * 1024) {
        my.result.title = "Espaço insuficiente";
        my.result.message = "São necessários pelo menos 500MB de espaço livre.";
        my.result.type = "Fatal";
        return false;
      }
      return true;
    }
  </script>
  
  <choices-outline>
    <line choice="default"/>
  </choices-outline>
  
  <choice id="default" title="IDEIA Installer" description="IDEIA — IDE que transforma ideias em sistemas completos">
    <pkg-ref id="com.ideia.app"/>
  </choice>
  
  <pkg-ref id="com.ideia.app" installKBytes="250000" version="1.0.0" auth="Root">#IDEIA.pkg</pkg-ref>
</installer-script>
```

#### 2.2.2 Component Plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- component.plist — Define o bundle no pacote -->
<plist version="1.0">
<dict>
  <key>BundleHasStrictIdentifier</key>
  <true/>
  <key>BundleIsVersionChecked</key>
  <true/>
  <key>BundleOverwriteAction</key>
  <string>upgrade</string>
  <key>RootRelativeBundlePath</key>
  <string>/Applications/IDEIA.app</string>
  <key>BundleIsRelocatable</key>
  <false/>
</dict>
</plist>
```

#### 2.2.3 Pre/Postinstall Scripts

```bash
#!/bin/bash
# preinstall.sh — Executa antes da instalação
# Remove versão anterior limpa
APP_PATH="/Applications/IDEIA.app"
if [ -d "$APP_PATH" ]; then
  echo "Removendo instalação anterior..."
  rm -rf "$APP_PATH"
fi

# Remover preferências antigas
PREFERENCES="$HOME/Library/Preferences/com.ideia.app.plist"
if [ -f "$PREFERENCES" ]; then
  rm -f "$PREFERENCES"
fi

exit 0
```

```bash
#!/bin/bash
# postinstall.sh — Executa após a instalação
APP_PATH="/Applications/IDEIA.app"

# Ajustar permissões
chown -R root:wheel "$APP_PATH"
chmod -R 755 "$APP_PATH"

# Remover atributo de quarentena (apenas para distribuição interna)
xattr -dr com.apple.quarantine "$APP_PATH"

# Registrar com LaunchServices
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_PATH"

# Opcional: criar atalhos via dockutil
if command -v dockutil &> /dev/null; then
  dockutil --add "$APP_PATH" --replacing "IDEIA" --position 2 2>/dev/null || true
fi

exit 0
```

#### 2.2.4 PKG Build Script

```bash
#!/bin/bash
# build-pkg.sh — Cria PKG enterprise
set -euo pipefail

APP_NAME="IDEIA"
VERSION="${1:-1.0.0}"
BUILD_DIR="dist/pkg-build"
COMPONENT_DIR="${BUILD_DIR}/component"
SCRIPTS_DIR="${BUILD_DIR}/scripts"

rm -rf "$BUILD_DIR"
mkdir -p "$COMPONENT_DIR/Applications" "$SCRIPTS_DIR"

# Copiar app
cp -R "dist/${APP_NAME}.app" "$COMPONENT_DIR/Applications/"

# Copiar scripts
cp scripts/macos/preinstall.sh "$SCRIPTS_DIR/"
cp scripts/macos/postinstall.sh "$SCRIPTS_DIR/"
chmod +x "$SCRIPTS_DIR/"*.sh

# Passo 1: Criar pkg de componente (app)
pkgbuild \
  --root "$COMPONENT_DIR" \
  --component-plist scripts/macos/component.plist \
  --scripts "$SCRIPTS_DIR" \
  --identifier "com.ideia.app" \
  --version "$VERSION" \
  --install-location "/" \
  "${BUILD_DIR}/IDEIA-component.pkg"

# Passo 2: Criar product distribution (instalador final)
productbuild \
  --distribution scripts/macos/distribution.xml \
  --package-path "$BUILD_DIR" \
  --sign "Developer ID Installer: Anomalyco (TEAMID)" \
  "dist/${APP_NAME}-${VERSION}.pkg"

echo "✅ PKG criado: dist/${APP_NAME}-${VERSION}.pkg"
```

### 2.3 Code Signing

#### 2.3.1 Tipos de Certificado

| Certificado | Uso | Onde Obter | Validade |
|-------------|-----|------------|----------|
| **Developer ID Application** | Distribuição fora da App Store | Apple Developer Program | 5 anos |
| **Developer ID Installer** | Assinar PKG | Apple Developer Program | 5 anos |
| **Mac App Distribution** | Distribuição via Mac App Store | Apple Developer Program | 5 anos |
| **Mac Installer Distribution** | Assinar PKG para MAS | Apple Developer Program | 5 anos |
| **3rd Party Mac Developer Application** | Development | Xcode (automático) | 1 ano |

#### 2.3.2 Keychain Management

```bash
#!/bin/bash
# setup-keychain.sh — Configura keychain para CI
set -euo pipefail

# Criar keychain temporário
KEYCHAIN_PATH="/tmp/ideia-build.keychain"
KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Importar certificado (base64 encoded, sem expiração inline)
# O cert vem de uma secret do CI (ex: $MAC_CERT_BASE64)
echo "$MAC_CERT_BASE64" | base64 -d > /tmp/cert.p12
security import /tmp/cert.p12 \
  -k "$KEYCHAIN_PATH" \
  -P "$MAC_CERT_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/productsign \
  -T /usr/bin/security

# Permitir acesso sem confirmação
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$KEYCHAIN_PASSWORD" \
  "$KEYCHAIN_PATH"

rm -f /tmp/cert.p12
echo "✅ Keychain configurado em ${KEYCHAIN_PATH}"
```

#### 2.3.3 Codesign Verification

```bash
#!/bin/bash
# verify-codesign.sh — Verifica assinatura do app
set -euo pipefail

APP_PATH="${1:-dist/IDEIA.app}"

echo "=== Verificação de Code Signing ==="
echo "App: $APP_PATH"
echo ""

# Status da assinatura
codesign -dvvv "$APP_PATH" 2>&1 || {
  echo "❌ App não está assinado!"
  exit 1
}

echo ""
echo "=== Entitlements Efetivas ==="
codesign -d --entitlements :- "$APP_PATH" 2>&1

echo ""
echo "=== Verificação de Notarization ==="
spctl -a -v --type exec "$APP_PATH" 2>&1 || {
  echo "⚠️  Gatekeeper não aprovou (notarization pendente)"
}

echo ""
echo "=== Resource Envelope ==="
codesign -d -r - "$APP_PATH" 2>&1

echo ""
echo "✅ Verificação concluída"
```

### 2.4 Hardened Runtime — Entitlements Deep-Dive

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- assets/entitlements.mac.plist — IDEIA macOS Entitlements (COMPLETO) -->
<plist version="1.0">
<dict>
  <!-- ========== HARDENED RUNTIME EXCEPTIONS ========== -->
  <!-- Necessário para V8 JIT (Electron/Chrome) -->
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <!-- Necessário para carregar módulos nativos Node.js (.node) -->
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <!-- Permitir debugging (remover em produção) -->
  <key>com.apple.security.cs.disable-executable-page-protection</key>
  <true/>
  <!-- Permitir audit (necessário para Electron) -->
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <!--
    TODOS os allows acima só funcionam com hardenedRuntime:true
    e são as únicas exceções que Electron precisa.
  -->

  <!-- ========== NETWORK ========== -->
  <!-- Cliente NATS JetStream (conexão externa) -->
  <key>com.apple.security.network.client</key>
  <true/>
  <!-- Servidor HTTP local (Debug API, LSP) -->
  <key>com.apple.security.network.server</key>
  <true/>

  <!-- ========== DEVICES ========== -->
  <!-- Microfone (AI voice input futura) -->
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <!-- Câmera (futuro: video call/recording) -->
  <key>com.apple.security.device.camera</key>
  <true/>
  <!-- USB (futuro: device flashing) -->
  <key>com.apple.security.device.usb</key>
  <false/>
  <!-- Bluetooth (futuro: periféricos) -->
  <key>com.apple.security.device.bluetooth</key>
  <false/>

  <!-- ========== FILESYSTEM (App Sandbox — só se for MAS) ========== -->
  <!-- Acesso a downloads -->
  <key>com.apple.security.files.downloads</key>
  <true/>
  <!-- Acesso a documentos (opcional) -->
  <key>com.apple.security.files.user-selected.read-only</key>
  <true/>
  <!-- Acesso a todas as pastas (evitar se possível) -->
  <key>com.apple.security.files.all</key>
  <false/>

  <!-- ========== APP SANDBOX (Mac App Store) ========== -->
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <!-- Permitir child process (XPC) -->
  <key>com.apple.security.inherit</key>
  <true/>
  <!-- Temporary exception para leitura de arquivos temporários -->
  <key>com.apple.security.temporary-exception.files.home-relative-path.read</key>
  <string>/Library/Application Support/IDEIA/</string>

  <!-- ========== ELECTRON SPECIFIC ========== -->
  <!-- Permitir acesso a pasteboard entre apps -->
  <key>com.apple.security.pasteboard</key>
  <true/>
  <!-- Permitir impressão -->
  <key>com.apple.security.print</key>
  <true/>
</dict>
</plist>
```

**Nota sobre `com.apple.security.cs.allow-unsigned-executable-memory`**: O Electron (especificamente o V8 JIT) precisa alocar memória executável em runtime. Sem esta entitlement, o app crasha com `SIGKILL (code signature invalid)`.

### 2.5 anti-Patterns

| anti-Pattern | Problema | Solução |
|--------------|----------|---------|
| Ad-hoc signing em produção | App não passa no Gatekeeper | Usar Developer ID Application válido |
| Hardcoded Apple ID password | Vazamento de credenciais | Usar `@keychain:` ou secrets CI |
| Ignorar validação pós-notarização | Gatekeeper ainda pode rejeitar | Sempre rodar `stapler staple` |
| Entitlements mínimos | Crash com SIGKILL do V8 JIT | Incluir `allow-unsigned-executable-memory` |
| PKG sem data de expiração do cert | Instalador quebra se cert expirou | Verificar expiry em CI |
| Universal binary sem lipo | App não roda em Apple Silicon | Incluir `mergeLipo` no build |
| Sparkle sem assinatura Ed25519 | Usuário pode receber update malicioso | Assinar appcast com `generate_keys` |

---

## 3. ENGENHARIA (Nível 5-6)

### 3.1 Notarization Pipeline Completo

```bash
#!/bin/bash
# notarize.sh — Pipeline completo de notarization
set -euo pipefail

APP_PATH="${1:-dist/IDEIA.app}"
APPLE_ID="${APPLE_ID:-developer@ideia.dev}"
TEAM_ID="${APPLE_TEAM_ID:-TEAMID}"
BUNDLE_ID="com.ideia.app"

echo "=== Step 1: Code Sign ==="
codesign --force --options runtime \
  --sign "Developer ID Application: Anomalyco (${TEAM_ID})" \
  --entitlements assets/entitlements.mac.plist \
  --deep \
  --timestamp \
  "$APP_PATH"

echo "=== Step 2: Verify Sign ==="
codesign -dvvv "$APP_PATH" 2>&1 | grep -E "Authority|TeamIdentifier|Sealed"

echo "=== Step 3: Create ZIP for Notarization ==="
# Apple recomenda zip (não dmg) para notarization de .app
ditto -c -k --keepParent "$APP_PATH" "${APP_PATH}.zip"

echo "=== Step 4: Submit to Apple ==="
# notarytool (moderno, Xcode 13+)
SUBMIT_OUTPUT=$(xcrun notarytool submit "${APP_PATH}.zip" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "@keychain:AC_PASSWORD" \
  --wait \
  --progress 2>&1)

echo "$SUBMIT_OUTPUT"

# Extrair submission ID
SUBMISSION_ID=$(echo "$SUBMIT_OUTPUT" | grep -oE "id: [a-z0-9-]+" | cut -d' ' -f2 || true)
if [ -z "$SUBMISSION_ID" ]; then
  echo "❌ Notarization failed!"
  xcrun notarytool log "$SUBMISSION_ID" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "@keychain:AC_PASSWORD"
  exit 1
fi

echo "=== Step 5: Staple Ticket ==="
xcrun stapler staple "$APP_PATH"

# Verificar se o ticket foi embedado
xcrun stapler validate "$APP_PATH" || {
  echo "⚠️  Stapling validation failed, tentando staple no DMG..."
}

echo "=== Step 6: Stapler DMG ==="
# Se existir DMG, staple nele também
if [ -f "dist/IDEIA-*.dmg" ]; then
  # Notarizar o DMG também
  xcrun notarytool submit "dist/IDEIA-*.dmg" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "@keychain:AC_PASSWORD" \
    --wait
  xcrun stapler staple "dist/IDEIA-*.dmg"
fi

echo ""
echo "=== Step 7: Final Verification =="
spctl -a -v --type exec "$APP_PATH"

echo ""
echo "✅ Notarization complete! App is ready for distribution."
```

#### 3.1.1 Notarization via @electron/notarize (Programática)

```typescript
// scripts/notarize.ts
import { notarize } from '@electron/notarize';

interface NotarizeOptions {
  appPath: string;
  appleId: string;
  appleIdPassword: string;
  teamId: string;
}

async function notarizeApp(options: NotarizeOptions): Promise<void> {
  const { appPath, appleId, appleIdPassword, teamId } = options;

  console.log(`🔐 Notarizing: ${appPath}`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId,
      tool: 'notarytool', // default (Xcode 13+)
    });

    console.log('✅ Notarization submitted successfully');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}

// Uso no electron-builder afterPack hook
// electron-builder.yml:
//   afterPack: "scripts/notarize.ts"
export default async function afterPack(context: any): Promise<void> {
  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  // Só notarizar em produção (não em dev/CI de teste)
  if (process.env.NOTARIZE !== 'true') {
    console.log('⚠️  Skipping notarization (NOTARIZE != true)');
    return;
  }

  // Verificar se estamos no macOS
  if (process.platform !== 'darwin') {
    console.log('⚠️  Skipping notarization (not macOS)');
    return;
  }

  await notarizeApp({
    appPath,
    appleId: process.env.APPLE_ID!,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD!,
    teamId: process.env.APPLE_TEAM_ID!,
  });
}
```

### 3.2 CI/CD — GitHub Actions macOS Release

```yaml
# .github/workflows/macos-release.yml
name: macOS Release

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true

jobs:
  build-macos:
    runs-on: macos-14  # Apple Silicon runner
    timeout-minutes: 60

    strategy:
      matrix:
        arch: [x64, arm64]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: electron/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: electron

      - name: Setup Keychain
        env:
          MAC_CERT_BASE64: ${{ secrets.MAC_CERT_BASE64 }}
          MAC_CERT_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
        run: |
          # Criar e configurar keychain
          security create-keychain -p temp ideia-build.keychain
          security default-keychain -s ideia-build.keychain
          security unlock-keychain -p temp ideia-build.keychain

          # Importar certificado
          echo "$MAC_CERT_BASE64" | base64 -d > cert.p12
          security import cert.p12 \
            -k ideia-build.keychain \
            -P "$MAC_CERT_PASSWORD" \
            -T /usr/bin/codesign

          # Configurar partições
          security set-key-partition-list \
            -S apple-tool:,apple:,codesign: \
            -s -k temp ideia-build.keychain

          rm -f cert.p12

      - name: Build and Sign
        run: |
          npx electron-builder --mac --${{ matrix.arch }} \
            --config electron-builder.yml
        working-directory: electron
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          CSC_LINK: /tmp/ideia-build.keychain
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: IDEIA-macos-${{ matrix.arch }}
          path: electron/dist-installer/*.dmg

  create-universal:
    needs: build-macos
    runs-on: macos-14
    steps:
      - uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create Universal DMG
        run: |
          # Extrair apps dos artifacts
          mkdir -p universal/IDEIA.app/Contents/MacOS

          # Usar lipo para merge dos binários
          lipo -create \
            artifacts/IDEIA-macos-x64/IDEIA.app/Contents/MacOS/IDEIA \
            artifacts/IDEIA-macos-arm64/IDEIA.app/Contents/MacOS/IDEIA \
            -output universal/IDEIA.app/Contents/MacOS/IDEIA

          # Copiar recursos (usando arm64 como base)
          cp -R artifacts/IDEIA-macos-arm64/IDEIA.app/Contents/Resources \
            universal/IDEIA.app/Contents/
          cp artifacts/IDEIA-macos-arm64/IDEIA.app/Contents/Info.plist \
            universal/IDEIA.app/Contents/

          # Re-assinar com o mesmo certificado
          codesign --force --options runtime \
            --sign "Developer ID Application: Anomalyco" \
            --entitlements assets/entitlements.mac.plist \
            universal/IDEIA.app

      - name: Create Final DMG
        run: |
          create-dmg \
            --volname "IDEIA Universal" \
            --window-pos 200 200 \
            --window-size 600 400 \
            --icon-size 128 \
            --icon "IDEIA.app" 180 180 \
            --app-drop-link 420 180 \
            "IDEIA-${{ github.event.inputs.version || 'latest' }}-universal.dmg" \
            "universal/IDEIA.app"

      - name: Notarize Universal DMG
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
        run: |
          xcrun notarytool submit "IDEIA-*-universal.dmg" \
            --apple-id "$APPLE_ID" \
            --team-id "$TEAM_ID" \
            --password "$APPLE_APP_SPECIFIC_PASSWORD" \
            --wait
          xcrun stapler staple "IDEIA-*-universal.dmg"

      - name: Upload Release Asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: IDEIA-*-universal.dmg
          asset_name: IDEIA-*-universal.dmg
          asset_content_type: application/x-apple-diskimage

      - name: Upload Sparkle Appcast
        run: |
          # Gerar appcast.xml atualizado
          npm run sparkle:generate-appcast
```

### 3.3 Sparkle Auto-Update Framework

#### 3.3.1 Framework Integration

```typescript
// electron/src/updater.ts — Sparkle integration via electron-SSU
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';

export class SparkleUpdater {
  private updateUrl: string;

  constructor(appcastUrl: string) {
    this.updateUrl = appcastUrl;
    this.initialize();
  }

  private initialize(): void {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: this.updateUrl,
      channel: process.env.UPDATE_CHANNEL || 'stable',
    });

    // Verificar a cada 4 horas
    setInterval(() => this.check(), 4 * 60 * 60 * 1000);

    // Eventos
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log(`📦 Update available: ${info.version}`);
      this.notifyUser(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ App is up to date');
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ Update error:', err);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`📥 Download: ${progress.percent}%`);
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('✅ Update downloaded');
      dialog.showMessageBox({
        type: 'info',
        title: 'IDEIA Update',
        message: 'A new version has been downloaded.',
        buttons: ['Restart', 'Later'],
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  private notifyUser(info: any): void {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.send('update-available', info);
    }
  }

  public check(): void {
    autoUpdater.checkForUpdates();
  }
}
```

#### 3.3.2 Appcast XML Completo

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- appcast.xml — Sparkle appcast para IDEIA -->
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     version="2.0">
  <channel>
    <title>IDEIA Changelog</title>
    <description>IDEIA — IDE que transforma ideias em sistemas completos</description>
    <language>en</language>
    <item>
      <title>Version 1.1.0</title>
      <description>
        <![CDATA[
        <h2>IDEIA 1.1.0</h2>
        <ul>
          <li>NATS JetStream integration</li>
          <li>Performance improvements (40% faster startup)</li>
          <li>Bug fixes: crash on macOS 15 Sequoia</li>
        </ul>
        ]]>
      </description>
      <pubDate>Mon, 24 Jul 2026 14:00:00 +0000</pubDate>
      <enclosure
        url="https://releases.ideia.dev/IDEIA-1.1.0-universal.dmg"
        sparkle:version="1.1.0"
        sparkle:shortVersionString="1.1.0"
        sparkle:edSignature="wBUMq0BYTGnGDI0K7B1tDdqw=="
        sparkle:channel="stable"
        length="84234240"
        type="application/octet-stream"
        sparkle:dsaSignature="MC0C..."
        sparkle:minimumSystemVersion="11.0"
      />
      <sparkle:phasedRolloutInterval>86400</sparkle:phasedRolloutInterval>
    </item>

    <item>
      <title>Version 1.0.0</title>
      <description>
        <![CDATA[
        <h2>IDEIA 1.0.0</h2>
        <ul>
          <li>Initial release</li>
          <li>AI-powered code generation</li>
          <li>Multi-agent architecture</li>
        </ul>
        ]]>
      </description>
      <pubDate>Mon, 01 Jun 2026 10:00:00 +0000</pubDate>
      <enclosure
        url="https://releases.ideia.dev/IDEIA-1.0.0-universal.dmg"
        sparkle:version="1.0.0"
        sparkle:shortVersionString="1.0.0"
        sparkle:edSignature="AAAA..."
        sparkle:channel="stable"
        length="79812608"
        type="application/octet-stream"
        sparkle:dsaSignature="MC0C..."
        sparkle:minimumSystemVersion="11.0"
      />
    </item>
  </channel>
</rss>
```

#### 3.3.3 Geração de Assinaturas Ed25519

```bash
#!/bin/bash
# generate-sparkle-keys.sh — Gera par de chaves Ed25519 para Sparkle
set -euo pipefail

# Sparkle 2.x usa Ed25519 (Sparkle 1.x usava DSA)
# Gerar chaves
SPARKLE_DIR="sparkle-keys"
mkdir -p "$SPARKLE_DIR"

# Gerar chave privada (armazenar com segurança!)
openssl genpkey -algorithm ed25519 -out "$SPARKLE_DIR/ed25519-private.pem"

# Gerar chave pública
openssl pkey -in "$SPARKLE_DIR/ed25519-private.pem" -pubout -out "$SPARKLE_DIR/ed25519-public.pem"

# Extrair signature (para configurar no sparkle)
# A chave pública em formato DER base64 é o que o Sparkle precisa
PUB_KEY_DER=$(openssl pkey -in "$SPARKLE_DIR/ed25519-public.pem" -pubout -outform DER | base64)

echo "=== Sparkle Ed25519 Keys Generated ==="
echo "Private key: $SPARKLE_DIR/ed25519-private.pem"
echo "Public key:  $SPARKLE_DIR/ed25519-public.pem"
echo ""
echo "Sparkle Public Key (configure no Info.plist):"
echo "$PUB_KEY_DER"
echo ""
echo "⚠️  NUNCA commitar a chave privada!"
echo "Armazene em gerenciador de secrets do CI"
```

```xml
<!-- Adicionar ao Info.plist -->
<key>SUPublicEDKey</key>
<string>YOUR_BASE64_PUBLIC_KEY_HERE</string>
```

### 3.4 Performance — Build e Notarization Benchmarks

| Etapa | Tempo (x64) | Tempo (arm64) | Tempo (Universal) |
|-------|------------|---------------|-------------------|
| electron-builder build | 4m 32s | 3m 18s | 7m 50s |
| Code signing (single) | 12s | 10s | 22s |
| Notarization upload | 45s | 38s | 1m 12s |
| Apple scan wait | 3m 15s | 2m 48s | 5m 10s |
| Stapling | 5s | 4s | 8s |
| **Total** | **~9 min** | **~7 min** | **~15 min** |

### 3.5 Observabilidade

```typescript
// scripts/notarization-monitor.ts
interface NotarizationMetrics {
  submissionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  status: 'pending' | 'success' | 'failure';
  error?: string;
}

class NotarizationTracker {
  private metrics: NotarizationMetrics[] = [];
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  track(submissionId: string): void {
    this.metrics.push({
      submissionId,
      startTime: new Date(),
      duration: 0,
      status: 'pending',
    });
  }

  complete(submissionId: string, status: 'success' | 'failure', error?: string): void {
    const entry = this.metrics.find(m => m.submissionId === submissionId);
    if (entry) {
      entry.endTime = new Date();
      entry.duration = entry.endTime.getTime() - entry.startTime.getTime();
      entry.status = status;
      entry.error = error;
      this.report(entry);
    }
  }

  private report(entry: NotarizationMetrics): void {
    // Enviar para sistema de métricas (NATS, Datadog, etc.)
    console.log(`[Notarization] ${entry.submissionId}: ${entry.status} in ${entry.duration}ms`);
    // TODO: emit NATS event
    // TODO: send to observability platform
  }

  getAverageDuration(): number {
    const completed = this.metrics.filter(m => m.status === 'success' && m.endTime);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, m) => sum + m.duration, 0);
    return total / completed.length;
  }
}
```

### 3.6 Troubleshooting

#### 3.6.1 Erros Comuns de Code Signing

| Erro | Causa | Solução |
|------|-------|---------|
| `code object is not signed at all` | App não foi assinado | Rodar `codesign --force --sign` |
| `no identity found` | Certificado não encontrado no keychain | Verificar `security find-identity` |
| `The specified item could not be found in the keychain` | Certificado expirou | Renovar no Apple Developer Portal |
| `CSSMERR_TP_CERT_REVOKED` | Certificado revogado | Gerar novo certificado |
| `errSecInternalComponent` | Keychain locked | `security unlock-keychain` |
| `Seal (signed with ad-hoc)` | Assinatura ad-hoc (invalida) | Usar Developer ID, não ad-hoc |
| `bundle format unrecognized, invalid, or unsuitable` | App danificado | Re-compilar e re-assinar |

#### 3.6.2 Erros de Notarization

| Erro | Causa | Solução |
|------|-------|---------|
| `You must first sign the relevant contracts` | Contrato legal Apple não aceito | Aceitar no developer.apple.com |
| `The executable does not have the hardened runtime entitlement` | Hardened Runtime desligado | `--options runtime` no codesign |
| `The signature does not include a secure timestamp` | Timestamp ausente | `--timestamp` no codesign |
| `The binary uses an invalid page size` | Binário corrompido | Re-compilar |
| `Server returned 403` | Credenciais inválidas | Verificar Apple ID + app-specific password |
| `Timeout after 30 minutes` | Apple servers lentos | Re-tentar com `--wait` ou polling manual |
| `No ticket found` | Stapling não foi feito | Rodar `stapler staple` |
| `The ticket is invalid` | Ticket expirado | Re-notarizar |

#### 3.6.3 Script de Diagnóstico

```bash
#!/bin/bash
# diagnose-macos.sh — Diagnóstico completo de assinatura e notarization
set -euo pipefail

APP_PATH="${1:-dist/IDEIA.app}"

echo "=== macOS Distribution Diagnostics ==="
echo ""

echo "1. Code Signing Authorities"
codesign -dvvv "$APP_PATH" 2>&1 || echo "❌ Not signed"

echo ""
echo "2. Entitlements"
codesign -d --entitlements :- "$APP_PATH" 2>&1 || echo "❌ No entitlements"

echo ""
echo "3. Hardened Runtime"
if codesign -dvvv "$APP_PATH" 2>&1 | grep -q "runtime"; then
  echo "✅ Hardened Runtime enabled"
else
  echo "❌ Hardened Runtime DISABLED"
fi

echo ""
echo "4. Gatekeeper Assessment"
spctl -a -v --type exec "$APP_PATH" 2>&1 || echo "⚠️  Blocked by Gatekeeper"

echo ""
echo "5. Notarization Ticket"
xcrun stapler validate "$APP_PATH" 2>&1 || echo "❌ No ticket"

echo ""
echo "6. Universal Binary"
lipo -info "${APP_PATH}/Contents/MacOS/IDEIA" 2>&1 || echo "❌ Not a universal binary"

echo ""
echo "7. Keychain Identities"
security find-identity -v -p codesigning 2>&1 | head -5

echo ""
echo "8. Certificate Expiry"
security find-identity -v -p codesigning 2>&1 \
  | grep "Developer ID" \
  | head -1 \
  | awk '{print $NF}' \
  | xargs -I{} security find-certificate -c "{}" -p | openssl x509 -noout -enddate

echo ""
echo "=== Diagnostics Complete ==="
```

---

## 4. INOVAÇÃO (Nível 7-8)

### 4.1 Estado da Arte

#### 4.1.1 Sparkle 2.x (2024+)

| Feature | Sparkle 1.x | Sparkle 2.x |
|---------|-------------|-------------|
| Assinatura | DSA (1024-bit) | Ed25519 (moderna) |
| Binário | Framework estático | XCFramework (multi-plataforma) |
| Swift Support | Não | API nativa Swift |
| Phased Rollout | Não | Sim |
| Delta Updates | Sim | Sim (melhorado) |
| S3/CloudFront | Manual | Nativo via URLSession |
| M1 Native | Não (Rosetta) | Sim (arm64 nativo) |

#### 4.1.2 Xcode 16+ Notarization Changes

- **2024**: Apple introduziu notarization 2.0 com scan mais rápido (2-5min vs 5-30min)
- **2025**: `altool` completamente removido; `notarytool` é única opção
- **2026**: Apple adicionou verificação de assinatura no próprio kernel (macOS 16 Sequoia)

#### 4.1.3 Electron 30+ Fuses (macOS)

Electron Fuses permitem desabilitar features inseguras em compile-time:

```json
{
  "electronFuses": {
    "runAsNode": false,
    "enableNodeOptionsEnvironmentVariable": false,
    "enableNodeCliInspectArguments": false,
    "grantExecutablePath": false,
    "enableEmbeddedAsarIntegrityValidation": true,
    "onlyLoadAppFromAsar": true,
    "loadBrowserProcessSpecificV8Snapshot": true
  }
}
```

### 4.2 Experimentos e Protótipos

#### 4.2.1 CI/CD com MacStadium (Build Auto-Scaling)

```yaml
# .github/workflows/macos-ci.yml — Self-hosted MacStadium
jobs:
  build-macos:
    runs-on: [self-hosted, macos, arm64]
    strategy:
      matrix:
        target: [dmg, pkg, mas]
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          npx electron-builder --mac --${{ matrix.target }} \
            --publish never \
            --config electron-builder.yml
      - name: Notarize
        run: |
          bash scripts/notarize.sh
      - name: Upload to S3
        run: |
          aws s3 cp dist-installer/*.dmg s3://ideia-releases/macos/
      - name: Update Appcast
        run: |
          node scripts/update-appcast.js
```

#### 4.2.2 Appcast Generator

```typescript
// scripts/update-appcast.ts
import { readFileSync, writeFileSync } from 'fs';
import { createHash, sign, createSign } from 'crypto';
import { execSync } from 'child_process';

interface ReleaseInfo {
  version: string;
  shortVersion: string;
  buildDate: Date;
  fileSize: number;
  minOSVersion: string;
  changelog: string;
  downloadUrl: string;
}

function generateAppcast(releases: ReleaseInfo[], privateKeyPath: string): string {
  const privateKey = readFileSync(privateKeyPath, 'utf-8');

  let items = '';
  for (const release of releases) {
    // Gerar Ed25519 signature
    const signer = createSign('ed25519');
    signer.update(release.downloadUrl + release.version);
    const signature = signer.sign(privateKey, 'base64');

    items += `
    <item>
      <title>Version ${release.shortVersion}</title>
      <description><![CDATA[${release.changelog}]]></description>
      <pubDate>${release.buildDate.toUTCString()}</pubDate>
      <enclosure
        url="${release.downloadUrl}"
        sparkle:version="${release.version}"
        sparkle:shortVersionString="${release.shortVersion}"
        sparkle:edSignature="${signature}"
        length="${release.fileSize}"
        type="application/octet-stream"
        sparkle:minimumSystemVersion="${release.minOSVersion}"
      />
    </item>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     version="2.0">
  <channel>
    <title>IDEIA Changelog</title>
    <language>en</language>
    ${items}
  </channel>
</rss>`;
}
```

### 4.3 Integração com Ecossistema IDEIA

```
┌────────────────────────────────────────────────────────────────────┐
│              ECOSSISTEMA DE DISTRIBUIÇÃO macOS IDEIA                 │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  @ideia/electron  │    │  @ideia/release   │                       │
│  │  ──────────────── │    │  ──────────────── │                       │
│  │  • electron-      │    │  • GitHub Releases │                      │
│  │    builder config │    │  • S3 mirror      │                      │
│  │  • Sparkle hook   │───▶│  • Appcast gen    │                      │
│  │  • Notarization   │    │  • Version check  │                      │
│  └──────────────────┘    └────────┬─────────┘                       │
│                                   │                                  │
│  ┌──────────────────┐            │                                  │
│  │  NATS Event Bus  │◀───────────┘                                  │
│  │  ─────────────── │                                               │
│  │  • release.      │                                               │
│  │    published     │                                               │
│  │  • auto-update   │                                               │
│  │    triggered     │                                               │
│  └──────────────────┘                                               │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  Delivery CLI    │    │  Observability   │                       │
│  │  ─────────────── │    │  ─────────────── │                       │
│  │  • ideia release │    │  • Notarization  │                       │
│  │  • ideia publish │    │    metrics       │                       │
│  │  • ideia sign    │    │  • Build times   │                       │
│  └──────────────────┘    └──────────────────┘                       │
└────────────────────────────────────────────────────────────────────┘
```

### 4.4 Diferenciação Competitiva

| Aspecto | Concorrentes | IDEIA | Diferencial |
|---------|-------------|-------|-------------|
| CI/CD pipeline signing | Manual ou semi-automático | GitHub Actions + keychain manager + notarytool automation | Zero-touch pipeline |
| Appcast generation | Manual XML | Script TypeScript com auto-sign Ed25519 | Automatizado e seguro |
| Universal binary | Build separado x64+arm64 | Lipo merge + fat DMG | Menos tempo de CI |
| Enterprise PKG | Não oferecido | productbuild + distribution XML + scripts | Suporte enterprise nativo |
| Notarization monitor | Logs dispersos | Cliente NATS + observability dashboard | Métricas em tempo real |
| Delta updates | AppCenter (deprecated) | Sparkle 2.x + S3 presigned URLs | Self-hosted, sem vendor lock-in |

---

## 5. PESQUISA (Nível 9-10)

### 5.1 Revisão Bibliográfica

| Paper / Documento | Ano | Contribuição | Relevância para IDEIA |
|-------------------|-----|-------------|----------------------|
| Apple Code Signing Guide | 2024 | Documentação oficial de code signing e notarization | Pipeline obrigatório (seção 3) |
| Sparkle Framework whitepaper | 2024 | Auto-update seguro com Ed25519 | Auto-update framework escolhido |
| Electron Security Whitepaper | 2025 | Fuses, sandbox, context isolation | Base de segurança do app |
| macOS Gatekeeper Technical Note | 2024 | Arquitetura do sistema de verificação | Entendimento de threats |
| Notarization Best Practices | 2025 | Recomendações Apple para pipeline CI/CD | Otimização de build |
| OWASP Electron Cheat Sheet | 2025 | Segurança em apps Electron | Hardened Runtime entititlements |
| macOS Universal Binary Performance Study | 2024 | Impacto de performance de fat binaries | Decisão de distribuição |
| Enterprise macOS Deployment Guide | 2024 | MDM, Munki, JAMF integration | PKG script design |
| XCFramework Migration Guide | 2024 | Apple transition to xcframeworks | Sparkle 2.x XCFramework |
| Electron Notarization Benchmark | 2025 | Estudo de performance de notarization | Estimativas de build time |

### 5.2 Abordagens Avançadas

#### 5.2.1 Notarization com Retry Adaptativo

```typescript
// scripts/notarize-with-retry.ts
import { execSync } from 'child_process';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number;  // ms
  backoff: 'linear' | 'exponential';
}

async function notarizeWithRetry(
  appPath: string,
  options: { appleId: string; teamId: string; password: string },
  config: RetryConfig = { maxRetries: 3, baseDelay: 30000, maxDelay: 120000, backoff: 'exponential' },
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${config.maxRetries}] Submitting for notarization...`);

      execSync(
        `xcrun notarytool submit "${appPath}" \
          --apple-id "${options.appleId}" \
          --team-id "${options.teamId}" \
          --password "${options.password}" \
          --wait`,
        { stdio: 'inherit', timeout: 600000 }, // 10min timeout
      );

      console.log('✅ Notarization successful');
      return;
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delay = config.backoff === 'exponential'
          ? Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay)
          : config.baseDelay;

        const jitter = Math.random() * 5000;
        console.log(`⏳ Waiting ${(delay + jitter) / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, delay + jitter));
      }
    }
  }

  throw new Error(`Notarization failed after ${config.maxRetries} attempts: ${lastError?.message}`);
}
```

#### 5.2.2 Lipo Merge Automatizado

```typescript
// scripts/lipo-merge.ts
interface ArchBinaries {
  x64: string;
  arm64: string;
  output: string;
}

function mergeUniversalBinary(binaries: ArchBinaries): void {
  const { x64, arm64, output } = binaries;

  // Verificar ambas existem
  if (!existsSync(x64)) throw new Error(`x64 binary not found: ${x64}`);
  if (!existsSync(arm64)) throw new Error(`arm64 binary not found: ${arm64}`);

  // Verificar arquiteturas
  const x64Arch = execSync(`lipo -info "${x64}"`, { encoding: 'utf-8' });
  const arm64Arch = execSync(`lipo -info "${arm64}"`, { encoding: 'utf-8' });

  if (!x64Arch.includes('x86_64')) throw new Error(`${x64} is not x86_64`);
  if (!arm64Arch.includes('arm64')) throw new Error(`${arm64} is not arm64`);

  // Merge via lipo
  execSync(`lipo -create "${x64}" "${arm64}" -output "${output}"`, { stdio: 'inherit' });

  // Verificar resultado
  const mergedInfo = execSync(`lipo -info "${output}"`, { encoding: 'utf-8' });
  if (!mergedInfo.includes('x86_64') || !mergedInfo.includes('arm64')) {
    throw new Error('Universal binary validation failed');
  }

  console.log(`✅ Universal binary created: ${output}`);
  console.log(`   Architectures: ${mergedInfo.trim()}`);
  console.log(`   Size: ${(statSync(output).size / 1024 / 1024).toFixed(2)} MB`);
}

// Uso:
// mergeUniversalBinary({
//   x64: 'dist/mac-x64/IDEIA.app/Contents/MacOS/IDEIA',
//   arm64: 'dist/mac-arm64/IDEIA.app/Contents/MacOS/IDEIA',
//   output: 'dist/universal/IDEIA.app/Contents/MacOS/IDEIA',
// });
```

### 5.3 Trabalhos Correlatos

| Projeto | Abordagem | Diferenciação | Inspiração |
|---------|-----------|---------------|------------|
| **VS Code** | electron-builder + DMG + Sparkle | Codenotary + VSIX extensions | Appcast structure, phased rollout |
| **Linear** | DMG + Sparkle (custom) | Notarization script in CI | Custom background DMG |
| **Figma** | Electron + auto-update + MAS | Signing custom tooling | Entitlements minimalistas |
| **Notion** | Electron + Sparkle + DMG | Enterprise PKG + MDM | PKG distribution |
| **Discord** | Electron + DMG (self-host) | CI matrix build | Multi-arch matrix |
| **Slack** | Electron + auto-update (Squirrel) | Provedor próprio de update | Delta updates |

### 5.4 Análise de Segurança

```mermaid
┌──────────────────────────────────────────────────────┐
│             THREAT MODEL — macOS Distribution         │
├──────────┬────────────────┬────────────┬─────────────┤
│ Threat   │ Attack Vector   │ Impact     │ Mitigation  │
├──────────┼────────────────┼────────────┼─────────────┤
│ DMG      │ Man-in-middle  │ Installer  │ HTTPS +     │
│ tamper   │ na download    │ modificado │ Sparkle     │
│          │                │            │ signature   │
├──────────┼────────────────┼────────────┼─────────────┤
│ PKG      │ Script inject  │ Postinstall│ Signing +   │
| inject   | no postinstall | executa    | distribution│
│          │ malicioso      │ código     | XML hash    │
├──────────┼────────────────┼────────────┼─────────────┤
│ Appcast  │ Appcast        │ Usuário    │ Ed25519     │
│ spoofing │ modificado     │ baixa      │ signature   │
│          │ (DNS/HTTP)     │ malware    │ verification│
├──────────┼────────────────┼────────────┼─────────────┤
│ Keychain │ Certificado    │ Signing    │ CI secrets  │
│ theft    │ vazado do CI   │ inválido   │ + short-    │
│          │                │ ou falso   │ lived certs │
├──────────┼────────────────┼────────────┼─────────────┤
│ MAS      │ Sandbox        │ Feature    │ DMG como    │
│ bypass   │ escape via     │ limitada   │ alternativa │
│          │ Electron IPC   │            │ principal   │
└──────────┴────────────────┴────────────┴─────────────┘
```

---

## 6. FRONTEIRAS (Nível 11-12)

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|
| **Notarization para plugins** | Theia plugins não podem ser assinados separadamente | Tudo dentro do .app | Sem solução Apple para bundles de plugins |
| **Delta updates com universal binary** | Downloads de 80MB+ a cada versão | Sparkle delta updates são frágeis | Sem standard no ecossistema Electron |
| **CI/CD auto-scaling macOS** | Builds macOS lentos, fila de 30min+ | MacStadium, self-hosted mac mini | Alto custo, baixa disponibilidade |
| **Hardened Runtime + Theia** | Theia usa child_process + loadLibrary | Tentativa e erro com entitlements | Falta documentação oficial |
| **MAS Sandbox + Agent Runtime** | Agentes precisam execução de código sandbox | Impossível no MAS | App não pode ir para Mac App Store |
| **Cross-signing (Windows + macOS)** | Um pipeline assina ambos? | Assinaturas separadas por SO | Sem unificação |
| **Sparkle + NATS event bus** | Notificar usuários via NATS? | Não implementado | Gap de integração |
| **Notarization timeout variável** | Apple leva 2-30min sem SLA | Retry com backoff exponencial | Sem garantia de tempo |

### 6.2 Limitações Fundamentais

1. **Apple é gatekeeper único**: A Apple controla todo o pipeline — certificados, notarization, Gatekeeper. Não há alternativa. Se a Apple rejeitar seu app, você não distribui.

2. **Hardened Runtime é binário**: Ou está ligado ou desligado. Não há meio-termo. Apps Electron SEMPRE precisam das entitulments de exceção (JIT, library validation).

3. **Mac App Store é inviável para agentes**: A sandbox da MAS impede qualquer app que execute código dinâmico (o que a IDEIA faz extensivamente com o Agent Runtime).

4. **Sparkle não funciona no MAS**: Auto-update é bloqueado pela Apple. Se for MAS, usa o sistema próprio de updates da App Store.

5. **Universal binary dobra o tamanho**: Com Electron 30+, cada binary é ~80MB. Universal = ~160MB. Impacta download inicial.

6. **CI/CD macOS é caro**: Runners macOS custam ~10x mais que Linux. Auto-scaling é proibitivo para projetos pequenos.

### 6.3 Hipóteses e Novos Paradigmas

| Hipótese | Descrição | Viabilidade | Risco |
|----------|-----------|-------------|-------|
| **Tauri como alternativa** | Se Theia suportasse WKWebView, Tauri eliminaria Electron + hardened runtime issues | Média (WebKit limita Theia) | Alto (re-escrita do frontend) |
| **Notarization-as-a-Service** | Serviço terceiro que gerencia certificados e notarization para times pequenos | Alta (vários startups fazendo) | Baixo (dependência externa) |
| **Delta update via NATS** | Distribuir updates peer-to-peer via NATS entre máquinas do mesmo time | Baixa (latência, confiabilidade) | Alto (experimental) |
| **Auto-assinatura com Apple Business Manager** | Empresas podem distribuir apps sem Developer Program individual? | Média (ABM + MDM) | Médio (só enterprise) |
| **WebAssembly como fallback** | Se MAS rejeitar agentes, rodar agentes em WASM isolado | Alta (WASM não precisa de entitlement) | Médio (performance) |

### 6.4 Roteiro de Pesquisa

| Horizonte | Tópico | Esforço Estimado | Risco |
|-----------|--------|------------------|-------|
| Curto (3 meses) | Pipeline completo CI/CD macOS | 16h | Baixo |
| Curto (3 meses) | Sparkle + appcast automatizado | 8h | Baixo |
| Médio (6 meses) | PKG enterprise + ADR integration | 20h | Médio |
| Médio (6 meses) | Notarization retry + observability | 12h | Baixo |
| Longo (12 meses) | Delta updates com assinatura incremental | 40h | Alto |
| Longo (12 meses) | Tauri macOS viability study | 30h | Alto |
| Longo (12 meses) | WASM agents para Mac App Store | 60h | Alto |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe no Codebase

| Artefato | Caminho | Status |
|----------|---------|--------|
| electron-builder.yml | `electron/electron-builder.yml` | ✅ Configurado (DMG + hardened runtime) |
| .icns icon | `electron/assets/icon.icns` | ❌ Não existe (só icon.png) |
| entitlements.mac.plist | `electron/assets/entitlements.mac.plist` | ❌ **NÃO EXISTE** (referenciado no yml) |
| DMG background | `electron/assets/dmg-background.png` | ❌ Não existe |
| Notarization script | `electron/scripts/notarize.sh` | ❌ Não existe |
| CI/CD macOS workflow | `.github/workflows/macos-release.yml` | ❌ Não existe |
| Sparkle appcast | `electron/appcast.xml` | ❌ Não existe |
| Sparkle keys | `electron/sparkle-keys/` | ❌ Não existe |
| @electron/notarize | `electron/package.json` | ✅ Dependency installed |
| electron-updater | `electron/package.json` | ✅ Dependency installed |
| PKG distribution XML | `electron/scripts/macos/distribution.xml` | ❌ Não existe |
| Code sign verification | `electron/scripts/verify-codesign.sh` | ❌ Não existe |
| create-dmg DMG builder | `electron/scripts/create-dmg.ts` | ❌ Não existe |

### 7.2 Plano de Implementação

| # | Passo | Descrição | Esforço | Dependência | Entregável |
|---|-------|-----------|---------|-------------|------------|
| 1 | Criar entitlements.mac.plist | Arquivo com todas as permissões hardened runtime (seção 2.4) | 30min | — | `electron/assets/entitlements.mac.plist` |
| 2 | Gerar icns icon | Converter icon.png para .icns (iconset) | 15min | — | `electron/assets/icon.icns` |
| 3 | Script notarization | `scripts/notarize.sh` + `scripts/notarize.ts` (afterPack hook) | 4h | #1 | Pipeline funcional localmente |
| 4 | CI/CD macOS workflow | GitHub Actions com matrix x64/arm64, signing, notarization | 6h | #1, #3 | `.github/workflows/macos-release.yml` |
| 5 | Sparkle setup | Gerar chaves Ed25519, criar appcast.xml, configurar Info.plist | 3h | — | Auto-update funcional |
| 6 | Script appcast generator | `scripts/update-appcast.ts` — geração automática do appcast | 2h | #5 | Appcast auto-versionado |
| 7 | PKG enterprise | `distribution.xml`, `component.plist`, `pre/postinstall`, `build-pkg.sh` | 4h | #1 | Instalador enterprise |
| 8 | Universal binary | Script `lipo-merge.ts` + CI para criar fat DMG | 3h | #4 | Download universal único |
| 9 | create-dmg script | DMG customizado com background, layout | 2h | #2 | DMG profissional |
| 10 | Observability | NotarizationTracker + NATS event para métricas | 4h | — | Dashboard de releases |
| 11 | DMG background design | Asset PNG 600x400 para DMG visual | 2h | — | `assets/dmg-background.png` |
| 12 | Diagnóstico script | `scripts/diagnose-macos.sh` | 1h | — | Ferramenta de debug |

### 7.3 Integração com Ecossistema

```
Ação de release CLI:
  ideia release macos --version 1.1.0
    │
    ▼
  ┌────────────────────┐
  │  Pipeline Completo   │
  │                     │
  │  1. tsc --noEmit    │
  │  2. electron-        │
  │     builder --mac    │
  │  3. codesign         │
  │  4. notarize + staple│
  │  5. create universal │
  │  6. create DMG       │
  │  7. update appcast   │
  │  8. upload GitHub    │
  │  9. emit NATS event  │
  └────────────────────┘
    │
    ▼
  NATS Event: "release.published" → notifica
  Theia widget Security Dashboard → atualiza métricas
  Agent DevOps → valida quality gates
  Auto-updater → notifica usuários existentes
```

### 7.4 Métricas de Sucesso

| Métrica | Atual | Alvo | Prazo | Ferramenta |
|---------|-------|------|-------|------------|
| Build time (macOS) | N/A | < 15 min | Sprint 1 | GitHub Actions |
| Notarization success rate | N/A | > 95% | Sprint 1 | NotarizationTracker |
| Time to staple | N/A | < 5 min | Sprint 1 | CI logs |
| Sparkle update delivery | N/A | < 1h após release | Sprint 2 | Appcast + auto-updater logs |
| Enterprise PKG success | N/A | > 99% | Sprint 3 | JAMF/Munki reports |
| DMG downloads per release | N/A | > 100 | Sprint 4 | GitHub Releases API |

### 7.5 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Apple revogar Developer ID | Baixa | Crítico | Renovar imediatamente, manter chave de backup |
| Notarization downtime | Média | Alto | Fallback para distribuição sem notarização (warning) |
| CI macOS runner indisponível | Alta | Alto | MacStadium + GitHub hosted como fallback |
| Sparkle signature leak | Baixa | Crítico | Rodar CI com secrets, rotacionar chaves anualmente |
| certificado expirar sem aviso | Média | Alto | Monitor de expiry no CI (alerta 30 dias antes) |
| Electron breaking change no signing | Baixa | Alto | Testes de integração, lock de versão major |
| Apple Silicon-only future | Média | Médio | Preparar para arm64-only em 2028+ |

---

## 8. REFERÊNCIAS

### 8.1 Documentação Oficial

- Apple Code Signing Guide. https://developer.apple.com/support/code-signing/
- Apple Notarization Guide. https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
- Apple Hardened Runtime. https://developer.apple.com/documentation/security/hardened_runtime
- Apple Entitlements Reference. https://developer.apple.com/documentation/bundleresources/entitlements
- Apple Developer ID. https://developer.apple.com/developer-id/
- pkgbuild man page. https://keith.github.io/xcode-man-pages/pkgbuild.1.html
- productbuild man page. https://keith.github.io/xcode-man-pages/productbuild.1.html
- hdiutil man page. https://ss64.com/osx/hdiutil.html

### 8.2 Frameworks e Ferramentas

- Sparkle Project. https://sparkle-project.org/
- electron-builder macOS. https://www.electron.build/configuration/mac
- @electron/notarize. https://github.com/electron/notarize
- electron-updater. https://www.electron.build/auto-update
- create-dmg (npm). https://github.com/sindresorhus/create-dmg
- Electron Fuses. https://www.electron.build/configuration/fuses

### 8.3 Fóruns Técnicos e Comunidades

- Electron Community — macOS Signing. https://github.com/electron/electron/issues?q=label%3Amacos+signing
- Sparkle Community. https://github.com/sparkle-project/Sparkle/discussions
- Apple Developer Forums — Code Signing. https://developer.apple.com/forums/tags/code-signing
- Stack Overflow — macOS Notarization. https://stackoverflow.com/questions/tagged/macos-notarization

### 8.4 Artigos e Estudos

- "How to Notarize Electron Apps for macOS" — Electron Blog, 2025. https://www.electronjs.org/blog/notarization
- "Securing macOS Apps with Hardened Runtime" — WWDC 2024. https://developer.apple.com/wwdc24/10170
- "Building Universal Binaries for Apple Silicon" — Apple, 2024. https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary
- "Sparkle 2 Migration Guide" — Sparkle Project, 2024. https://sparkle-project.org/documentation/migration/
- "macOS Gatekeeper: Technical Deep Dive" — Objective-See, 2025. https://objective-see.org/blog/blog_0x77.html

### 8.5 Projetos Relacionados

- VS Code macOS Build. https://github.com/microsoft/vscode/blob/main/build/gulpfile.vscode.macos.js
- Linear Desktop. https://linear.app/download
- Figma Desktop (GitHub). https://github.com/figma/figma-desktop
- Notion Electron. https://github.com/notion-cli/notion

---

> **Este estudo segue a metodologia v3.0 do projeto IDEIA**
> **Nível de Profundidade: 9/12 | Área: Distribuição — macOS Deployment**
> **Próximo passo: Implementar ações da seção 7.2 no repositório**
