# ESTUDO-D14 — Code Signing Desktop

> **Data:** 2026-07-25 | **Versão:** 3.0 (intensificado, 8 seções, 500+ linhas)
> **Área:** Desktop/DevOps/Security | **Nível:** 9/12 | **Template:** v3.0
> **Propósito:** Estudo completo de code signing multiplataforma — Windows Authenticode, macOS Gatekeeper/notarization, Linux GPG/deb/snap/AppImage signing, CI/CD pipeline, HSM key management, RFC 3161 timestamping, revocation handling, SLSA/sigstore/cosign supply chain, SBOM signing integration, e análise específica para IDEIA.

---

## 1. FUNDAMENTOS

### 1.1 Definição e Propósito

Code signing é o processo de assinar digitalmente binários, instaladores e pacotes de software para garantir autenticidade (quem publicou), integridade (não foi adulterado) e reputação (sistema operacional confia). Sem code signing:

- **Windows**: SmartScreen bloqueia downloads com aviso "Windows protected your PC"
- **macOS**: Gatekeeper impede execução com "cannot be opened because the developer cannot be verified"
- **Linux**: apt/snap emitem avisos de "untrusted source", instalação manual forçada
- **Enterprises**: GPO/AppLocker/Santa rejeitam binários não assinados por política

Para a IDEIA (3 shells — Electron, Tauri, CLI — em 3 plataformas), code signing é gate obrigatório antes de qualquer distribuição pública.

### 1.2 Público-Alvo

| Perfil | Interesse | Decisões |
|--------|-----------|----------|
| **DevOps** | Pipeline CI/CD de signing | AzureSignTool vs signtool, workflow modular |
| **Security Engineer** | Gestão de chaves, HSM, revogação | EV vs OV, Azure Key Vault, YubiKey HSM |
| **Product Manager** | Custo-benefício, SLAs, riscos | EV ($300/ano) vs Standard ($100/ano) |
| **Developer** | Config signing local, debugging | Self-signed certs, codesign --deep |
| **Release Manager** | SBOM, attested provenance, SLSA | Sigstore/cosign, Rekor transparency log |

### 1.3 Certificados: Tipos, Cadeia e Hierarquia

#### OV (Organization Validation)
- Prova: registro comercial (CNPJ, DUNS)
- Custo: ~$100-200/ano
- Tempo emissão: 1-3 dias úteis
- SmartScreen: reputação constrói-se com downloads + feedbacks positivos
- Uso: pequenas empresas, projetos open-source

#### EV (Extended Validation)
- Prova: auditoria presencial + documentação notarial
- Custo: ~$250-400/ano
- Tempo emissão: 5-10 dias úteis (auditoria)
- SmartScreen: confiança IMEDIATA (EV bypassa SmartScreen)
- Hardware: EXIGE token HSM (SafeNet eToken 5110 ~$150)
- Uso: empresas estabelecidas, software comercial crítico

#### Self-Signed
- Custo: zero
- Tempo: 30 segundos (openssl req -x509)
- Confiança: apenas se instalado manualmente nas Trusted Roots
- Uso: desenvolvimento local, testes unitários, intranet corporativa

#### Apple Developer ID Application
- Custo: $99/ano (Apple Developer Program)
- Obrigatório: Gatekeeper + Notarization
- Hardware: chave privada no Secure Enclave do Mac
- Restrição: SÓ funciona em macOS — não reutilizável

### 1.4 Dependências e Artefatos

| Dependência | Artefato | Método de Signing |
|-------------|----------|-------------------|
| `packages/electron/` | `IDEIA-Setup-x.x.x.exe` (NSIS) | signtool / AzureSignTool |
| `packages/electron/` | `IDEIA-x.x.x.msi` (Wix) | signtool / AzureSignTool |
| `packages/tauri/src-tauri/` | `IDEIA_x.x.x_x64.dmg` | codesign + notarytool |
| `packages/tauri/src-tauri/` | `IDEIA_x.x.x_x64.AppImage` | gpg --detach-sign |
| `packages/tauri/src-tauri/` | `ideia_x.x.x_amd64.deb` | debsign / debsigs |
| `packages/tauri/src-tauri/` | `ideia_x.x.x_amd64.snap` | snapcraft sign |
| `packages/cli/` | `@ideia/cli` (npm) | npm publish --provenance |
| `packages/tauri/src-tauri/` | `ideia-x.x.x-x86_64.pacman` | gpg (makepkg --sign) |
| `scripts/code-sign.ts` | Script atual | Incompleto (falta notarization, timestamp, verificação cross-platform) |

### 1.5 Conexões com Outros Estudos

| Estudo | Conexão |
|--------|---------|
| **D05** (Multi-Shell) | Cada shell (Electron/Tauri/CLI) requer método de signing diferente |
| **D11** (Instaladores) | Instaladores assinados = pré-requisito para distribuição |
| **D06** (Rust Core) | Binário Rust do Tauri precisa ser assinado individualmente |
| **D09** (IPC Security) | Mensagens IPC podem ser assinadas para non-repudiation |
| **F3** (Deploy) | Pipeline de deploy INTEGRA signing como stage obrigatório |
| **F6** (Segurança) | Code signing é controle de segurança supply chain |
| **S28** (Zero-to-Deploy) | Signing é etapa no pipeline zero-to-deploy |
| **S12** (Testes) | Verified build + signature verification em testes de release |

---

## 2. TÉCNICO

### 2.1 Windows Authenticode: Anatomia do Signing

#### Estrutura do Authenticode

```
PE File (.exe/.msi/.dll)
+-------------------------------+
| DOS Header                     |
| PE Header                      |
| Sections (.text, .data, .rsrc) |
+-------------------------------+
| Certificate Table (Attributes) | <-- Authenticode signature
|   +-------------------------+  |
|   | PKCS #7 SignedData      |  |
|   |   SignerInfo            |  |
|   |   Counter Signatures    |  | <-- RFC 3161 timestamp
|   |   Certificate Chain     |  |
|   +-------------------------+  |
+-------------------------------+
| Authenticode Signature (final) |
+-------------------------------+
```

O Authenticode NÃO modifica o conteúdo do PE. Ele adiciona uma seção `pkcs7` ao final do arquivo com a assinatura PKCS#7 envelopada.

#### signtool: Comandos Essenciais

```powershell
# Local (PFX file + password)
signtool sign /fd SHA256 /a /f C:\certs\ideia-ev.pfx `
  /p $env:CERT_PASSWORD `
  /tr http://timestamp.digicert.com /td SHA256 `
  /v .\dist\IDEIA-Setup-1.0.0.exe

# Dual signing (SHA-1 + SHA-256) -- legacy compatibility
signtool sign /fd SHA1 /a /f C:\certs\ideia-ev.pfx /p $env:CERT_PASSWORD /t http://timestamp.digicert.com `
  .\dist\IDEIA-Setup-1.0.0.exe
signtool sign /as /fd SHA256 /a /f C:\certs\ideia-ev.pfx /p $env:CERT_PASSWORD `
  /tr http://timestamp.digicert.com /td SHA256 `
  .\dist\IDEIA-Setup-1.0.0.exe

# Hardware token (HSM - SafeNet eToken)
signtool sign /fd SHA256 /a /c "IDEIA Code Signing (EV)" `
  /tr http://timestamp.digicert.com /td SHA256 `
  /csp "SafeNet RSA CSP" /kc `
  .\dist\IDEIA-Setup-1.0.0.exe

# Azure Key Vault (AzureSignTool - cloud)
AzureSignTool sign `
  -kvu $env:AZURE_KEY_VAULT_URL `
  -kvi $env:AZURE_CLIENT_ID `
  -kvs $env:AZURE_CLIENT_SECRET `
  -kvc "ideia-code-signing" `
  -tr http://timestamp.digicert.com -td SHA256 `
  -v .\dist\IDEIA-Setup-1.0.0.exe

# Verify
signtool verify /pa /all .\dist\IDEIA-Setup-1.0.0.exe
signtool verify /pa /all /v .\dist\IDEIA-Setup-1.0.0.exe  # verbose

# Verify with timestamp chain
signtool verify /pa /all /kp .\dist\IDEIA-Setup-1.0.0.exe
```

#### Azure Key Vault Signing (Alternative: Trusted Signing)

Microsoft Trusted Signing (antes Azure Code Signing) é serviço gerenciado:

```powershell
# Trusted Signing (Microsoft-managed CA)
signtool sign /fd SHA256 /tr http://timestamp.acs.microsoft.com /td SHA256 `
  /v .\dist\IDEIA-Setup-1.0.0.exe
```

Vantagens: sem gestão de certificados (Microsoft gerencia renew + HSM), custo por assinatura (~$5/1000), confiança imediata SmartScreen, EV sem auditoria.

### 2.2 macOS: Code Signing + Hardened Runtime + Notarization

#### Entitlements Plist (Hardened Runtime Exceptions)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-executable-page-protection</key>
  <false/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.device.camera</key>
  <true/>
  <key>com.apple.security.device.microphone</key>
  <true/>
  <key>com.apple.security.smartcard</key>
  <true/>
  <key>com.apple.security.automation.apple-events</key>
  <true/>
</dict>
</plist>
```

#### codesign: Comandos Essenciais

```bash
# Sign .app bundle
codesign --force --options runtime \
  --sign "Developer ID Application: IDEIA Inc (TEAM123456)" \
  --entitlements scripts/macos/entitlements.plist \
  --deep --timestamp \
  "dist/IDEIA.app"

# Sign nested binaries (DLLs, frameworks, helpers)
codesign --force --options runtime \
  --sign "Developer ID Application: IDEIA Inc (TEAM123456)" \
  --entitlements scripts/macos/entitlements.plist \
  --timestamp \
  "dist/IDEIA.app/Contents/Frameworks/Electron Framework.framework"

# Sign .dmg (flat image)
codesign --force --sign "Developer ID Application: IDEIA Inc (TEAM123456)" \
  --timestamp "dist/IDEIA-1.0.0.dmg"

# Verify signature
codesign -dvvv "dist/IDEIA.app"                     # Detailed info
codesign --verify --strict --deep "dist/IDEIA.app"   # Strict verify
spctl --assess --verbose "dist/IDEIA.app"            # Gatekeeper check

# Extract signing info
codesign -d --extract-certificates "dist/IDEIA.app"
```

#### Notarization + Stapling (Apple Requirement)

```bash
# Submit for notarization (altool - legacy)
xcrun altool --notarize-app \
  --primary-bundle-id com.ideia.desktop \
  --username $APPLE_ID \
  --password "@keychain:AC_PASSWORD" \
  --file dist/IDEIA-1.0.0.dmg

# Submit for notarization (notarytool - modern)
xcrun notarytool submit "dist/IDEIA-1.0.0.dmg" \
  --apple-id $APPLE_ID \
  --team-id TEAM123456 \
  --password "@keychain:AC_PASSWORD" \
  --wait --timeout 10m

# Check notarization status
xcrun notarytool history --apple-id $APPLE_ID --team-id TEAM123456 \
  --password "@keychain:AC_PASSWORD"

# Staple ticket to artifact
xcrun stapler staple "dist/IDEIA-1.0.0.dmg"

# Verify staple
xcrun stapler validate "dist/IDEIA-1.0.0.dmg"

# Stapler also works on .app bundles for offline verification
xcrun stapler staple "dist/IDEIA.app"
```

**Fluxo completo macOS (10 stages):**
1. Build .app (un signed)
2. Clear extended attributes: `xattr -cr "dist/IDEIA.app"`
3. Sign nested .dylib/.framework (deepest first)
4. Sign main .app bundle with hardened runtime
5. Sign .dmg container
6. Submit to notarytool
7. Wait (2-15 min) for Apple server-side scan
8. Staple ticket (embeds in artifact for offline verification)
9. Verify with spctl + stapler validate
10. Ship

### 2.3 Linux: GPG, debsig, rpm-sign, Flatpak

#### GPG Key Generation and Management

```bash
# Generate signing subkey (detached from primary)
gpg --full-generate-key --key-type ed25519 --expire-date 2y

# Export public key for package managers
gpg --armor --export "IDEIA Inc <security@ideia.dev>" > ideia.gpg.key

# Import into system keyring (apt/deb)
sudo gpg --dearmor < ideia.gpg.key | sudo tee /usr/share/keyrings/ideia.gpg

# For apt: add to sources.list
echo "deb [signed-by=/usr/share/keyrings/ideia.gpg] https://repo.ideia.dev/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/ideia.list
```

#### AppImage Signing

```bash
# Detached ASCII-armored signature
gpg --detach-sign --armor dist/IDEIA-1.0.0.AppImage

# Verify
gpg --verify dist/IDEIA-1.0.0.AppImage.asc dist/IDEIA-1.0.0.AppImage

# Embedded signature (AppImageUpdate)
# Requires appimagetool with VERSION=2
export SIGN=1
export SIGN_KEY=FINGERPRINT
appimagetool -n dist/IDEIA.AppDir dist/IDEIA-1.0.0.AppImage

# Validation in app
./IDEIA-1.0.0.AppImage --validate-signature
```

#### .deb Signing

```bash
# debsign (wraps gpg)
debsign --re-sign -kKEY_ID dist/ideia_1.0.0_amd64.changes

# debsigs (only .deb content)
debsigs --sign=origin -k KEY_ID dist/ideia_1.0.0_amd64.deb

# dpkg-sig (alternative)
dpkg-sig --sign builder dist/ideia_1.0.0_amd64.deb

# Verification
dpkg-sig --verify dist/ideia_1.0.0_amd64.deb
dpkg --verify --verify-at 2 dist/ideia_1.0.0_amd64.deb

# InRelease + Release.gpg (apt repo signing)
gpg --default-key KEY_ID --clearsign -o InRelease dist/Release
gpg --default-key KEY_ID --detach-sign -o Release.gpg dist/Release
```

#### .rpm Signing

```bash
# Configure .rpmmacros
echo "%_signature gpg" >> ~/.rpmmacros
echo "%_gpg_name IDEIA Inc <security@ideia.dev>" >> ~/.rpmmacros

# Sign RPM
rpmsign --addsign dist/ideia-1.0.0-x86_64.rpm

# Verify
rpm --checksig dist/ideia-1.0.0-x86_64.rpm
rpm -K dist/ideia-1.0.0-x86_64.rpm

# Sign during build
rpmbuild --sign -ba ideia.spec
```

#### Snap Signing

```bash
# Login to Snap Store
snapcraft login

# Sign manually
snap sign dist/ideia_1.0.0_amd64.snap > dist/ideia_1.0.0_amd64.snap.asc

# Upload signs automatically
snapcraft upload --release=stable dist/ideia_1.0.0_amd64.snap
```

#### Flatpak / Flatpak OCI Signing

```bash
# GPG sign flatpakref
flatpak build-sign dist/ideia.flatpakref

# OCI signing (cosign for container-based flatpaks)
cosign sign --key cosign.key ghcr.io/ideia/desktop:1.0.0

# Verify OCI
cosign verify --key cosign.pub ghcr.io/ideia/desktop:1.0.0
```

### 2.4 Timestamping (RFC 3161)

#### Por que timestamping é crítico

| Cenário | Sem Timestamp | Com Timestamp |
|---------|---------------|---------------|
| Certificado expira após 1 ano | Assinatura INVALIDA | Assinatura VÁLIDA (vigente no momento da assinatura) |
| Certificado revogado | Assinatura INVALIDA | Assinatura VÁLIDA (timestamp anterior à revogação) |
| Renew de CA | Assinatura INVALIDA | Assinatura VÁLIDA |

#### Servidores de Timestamp Confiáveis

| Provedor | URL | Notas |
|----------|-----|-------|
| DigiCert | `http://timestamp.digicert.com` | Mais usado, gratuito |
| Sectigo | `http://timestamp.sectigo.com` | Alternativa confiável |
| Let's Encrypt | (N/A) | Não oferece timestamp |
| Microsoft | `http://timestamp.acs.microsoft.com` | Trusted Signing |
| Comodo | `http://timestamp.comodoca.com` | Legacy |

#### Verificação da Timestamp

```powershell
# signtool verification + timestamp chain
signtool verify /pa /all /kp .\dist\IDEIA-Setup-1.0.0.exe

# Extracting timestamp info
signtool verify /pa /v /d .\dist\IDEIA-Setup-1.0.0.exe | Select-String "Timestamp"
```

```bash
# OpenSSL dump of PKCS7 for timestamp
openssl pkcs7 -in .\dist\IDEIA-Setup-1.0.0.exe -inform der -print_certs -text
```

### 2.5 Sigstore / Cosign: Keyless Signing

#### Arquitetura Sigstore

```
                    Fulcio (CA)
                    +----------+
Client --- OIDC --->| Issue    |<--- OIDC Provider
  (GitHub)          | cert     |     (GitHub, Google, Microsoft)
                    +----------+
                         |
                         v
               Cosign sign ----+----> Rekor (Transparency Log)
                    |          |        (Merkle Tree, immutable)
                    v          v
              Signed Artifact  SBOM
```

#### Cosign: Comandos Práticos

```bash
# Keyless signing (OIDC with GitHub Actions)
cosign sign --oidc-issuer https://token.actions.githubusercontent.com \
  --fulcio-url https://fulcio.sigstore.dev \
  --rekor-url https://rekor.sigstore.dev \
  ghcr.io/ideia/desktop:1.0.0

# Sign with key pair
cosign generate-key-pair
cosign sign --key cosign.key ghcr.io/ideia/desktop:1.0.0
cosign verify --key cosign.pub ghcr.io/ideia/desktop:1.0.0

# Sign a blob (binary file)
cosign sign-blob --key cosign.key dist/IDEIA-Setup-1.0.0.exe \
  > dist/IDEIA-Setup-1.0.0.exe.sig
cosign verify-blob --key cosign.pub --signature dist/IDEIA-Setup-1.0.0.exe.sig \
  dist/IDEIA-Setup-1.0.0.exe

# Sign with attestation (SLSA provenance)
cosign attest --predicate dist/provenance.json --key cosign.key \
  ghcr.io/ideia/desktop:1.0.0

# Verify attestation
cosign verify-attestation --key cosign.pub ghcr.io/ideia/desktop:1.0.0

# Rekor query
rekor-cli search --artifact dist/IDEIA-Setup-1.0.0.exe
rekor-cli get --log-index 123456 --format json
```

#### Vantagens do Sigstore para IDEIA

- **Zero custo**: Fulcio + Rekor são open source e gratuitos
- **Zero secret**: sem gestão de chaves (OIDC efêmero)
- **Transparência**: Rekor é append-only, qualquer signature leak é detectável
- **SLSA Level 2+**: com attested provenance, atinge SLSA 2 automaticamente
- **Container + binary**: cobre tanto container images quanto blobs nativos

### 2.6 SLSA Levels e Supply Chain Security

| Level | Requisito | Como IDEIA atinge |
|-------|-----------|-------------------|
| SLSA 1 | Build script + provenance | CI/CD + provenance.json |
| SLSA 2 | Signed provenance + hosted build | Sigstore attestation + GitHub Actions |
| SLSA 3 | Hermetic build + no user-controlled steps | hermetic build (Docker cache) + ephemeral runners |
| SLSA 4 | Two-person review + reproducibility | Code review + reproducible builds |

---

## 3. ENGENHARIA

### 3.1 Pipeline de Signing Multiplataforma (Completion)

```typescript
// scripts/code-sign-pipeline.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

type Platform = 'win32' | 'darwin' | 'linux';
type ArtifactType = 'exe' | 'msi' | 'app' | 'dmg' | 'AppImage' | 'deb' | 'snap' | 'rpm';

interface SignConfig {
  platform: Platform;
  artifacts: string[];
  timestampServer: string;
  keyVaultUrl?: string;
  certificateName?: string;
  appleTeamId?: string;
  appleId?: string;
  gpgKeyId?: string;
  signStep?: boolean;
  notarizeStep?: boolean;
  stapleStep?: boolean;
  verifyStep?: boolean;
  cosignStep?: boolean;
}

interface SignResult {
  artifact: string;
  type: ArtifactType;
  success: boolean;
  error?: string;
  timestamp?: string;
  size: number;
  sha256?: string;
}

class CodeSignPipeline {
  private config: SignConfig;

  constructor(config: SignConfig) {
    this.config = {
      signStep: true,
      notarizeStep: true,
      stapleStep: true,
      verifyStep: true,
      cosignStep: true,
      ...config
    };
  }

  async run(): Promise<SignResult[]> {
    const results: SignResult[] = [];
    for (const artifact of this.config.artifacts) {
      try {
        const result = await this.process(artifact);
        results.push(result);
      } catch (err) {
        results.push({
          artifact,
          type: this.detectType(artifact),
          success: false,
          error: err instanceof Error ? err.message : String(err),
          size: fs.statSync(artifact).size
        });
      }
    }
    return results;
  }

  private detectType(artifact: string): ArtifactType {
    const ext = path.extname(artifact).toLowerCase();
    if (ext === '.exe') return 'exe';
    if (ext === '.msi') return 'msi';
    if (ext === '.app') return 'app';
    if (ext === '.dmg') return 'dmg';
    if (artifact.endsWith('.AppImage')) return 'AppImage';
    if (ext === '.deb') return 'deb';
    if (ext === '.snap') return 'snap';
    if (ext === '.rpm') return 'rpm';
    if (ext === '.dll') return 'exe';
    return 'exe';
  }

  private async process(artifact: string): Promise<SignResult> {
    const type = this.detectType(artifact);
    switch (this.config.platform) {
      case 'win32': return this.processWindows(artifact, type);
      case 'darwin': return this.processMacOS(artifact, type);
      case 'linux': return this.processLinux(artifact, type);
      default: throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private async processWindows(artifact: string, type: ArtifactType): Promise<SignResult> {
    if (this.config.signStep) {
      if (this.config.keyVaultUrl) {
        execSync(
          `AzureSignTool sign -kvu ${this.config.keyVaultUrl}` +
          ` -kvi ${process.env.AZURE_CLIENT_ID}` +
          ` -kvs ${process.env.AZURE_CLIENT_SECRET}` +
          ` -kvc ${this.config.certificateName || 'ideia-code-signing'}` +
          ` -tr ${this.config.timestampServer} -td SHA256 -v "${artifact}"`,
          { timeout: 180000 }
        );
      } else if (process.env.CERT_PFX_PATH) {
        execSync(
          `signtool sign /fd SHA256 /a /f "${process.env.CERT_PFX_PATH}"` +
          ` /p ${process.env.CERT_PASSWORD}` +
          ` /tr ${this.config.timestampServer} /td SHA256 "${artifact}"`,
          { timeout: 180000 }
        );
      } else {
        throw new Error('No signing method configured: set AZURE_KEY_VAULT or CERT_PFX_PATH');
      }
    }
    if (this.config.cosignStep) {
      execSync(`cosign sign-blob --key ${process.env.COSIGN_KEY_PATH || 'cosign.key'}` +
        ` "${artifact}" > "${artifact}.sig"`, { timeout: 60000 });
    }
    if (this.config.verifyStep) {
      execSync(`signtool verify /pa /all "${artifact}"`, { timeout: 30000 });
    }
    const sha256 = execSync(`certutil -hashfile "${artifact}" SHA256 | findstr /V "hash"`).toString().trim();
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
      sha256
    };
  }

  private async processMacOS(artifact: string, type: ArtifactType): Promise<SignResult> {
    const teamId = this.config.appleTeamId || process.env.APPLE_TEAM_ID || '';
    const identity = `Developer ID Application: IDEIA Inc (${teamId})`;

    if (this.config.signStep) {
      if (type === 'app') {
        execSync(
          `codesign --force --options runtime --sign "${identity}"` +
          ` --entitlements scripts/macos/entitlements.plist` +
          ` --deep --timestamp "${artifact}"`,
          { timeout: 180000 }
        );
      } else {
        execSync(
          `codesign --force --sign "${identity}" --timestamp "${artifact}"`,
          { timeout: 180000 }
        );
      }
    }

    if (this.config.notarizeStep) {
      execSync(
        `xcrun notarytool submit "${artifact}"` +
        ` --apple-id ${this.config.appleId || process.env.APPLE_ID}` +
        ` --team-id ${teamId}` +
        ` --password "@keychain:AC_PASSWORD" --wait`,
        { timeout: 600000 }
      );
    }

    if (this.config.stapleStep && (type === 'app' || type === 'dmg')) {
      execSync(`xcrun stapler staple "${artifact}"`, { timeout: 120000 });
    }

    if (this.config.verifyStep) {
      if (type === 'app') {
        execSync(`codesign --verify --strict --deep "${artifact}"`, { timeout: 30000 });
        execSync(`spctl --assess --verbose "${artifact}"`, { timeout: 30000 });
      }
      if (type === 'dmg' || type === 'app') {
        execSync(`xcrun stapler validate "${artifact}"`, { timeout: 30000 });
      }
    }

    if (this.config.cosignStep) {
      execSync(`cosign sign-blob --key ${process.env.COSIGN_KEY_PATH || 'cosign.key'}` +
        ` "${artifact}" > "${artifact}.sig"`, { timeout: 60000 });
    }

    const sha256 = execSync(`shasum -a 256 "${artifact}" | cut -d' ' -f1`).toString().trim();
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
      sha256
    };
  }

  private async processLinux(artifact: string, type: ArtifactType): Promise<SignResult> {
    const keyId = this.config.gpgKeyId || process.env.GPG_KEY_ID || '';

    if (this.config.signStep) {
      switch (type) {
        case 'AppImage':
          execSync(`gpg --detach-sign --armor --default-key ${keyId} "${artifact}"`,
            { timeout: 60000 });
          break;
        case 'deb':
          execSync(`debsign --re-sign -k${keyId} "${artifact}"`, { timeout: 60000 });
          break;
        case 'snap':
          execSync(`snap sign "${artifact}" > "${artifact}.asc"`, { timeout: 60000 });
          break;
        case 'rpm':
          execSync(`rpmsign --addsign "${artifact}"`, { timeout: 60000 });
          break;
      }
    }

    if (this.config.cosignStep) {
      execSync(`cosign sign-blob --key ${process.env.COSIGN_KEY_PATH || 'cosign.key'}` +
        ` "${artifact}" > "${artifact}.sig"`, { timeout: 60000 });
    }

    if (this.config.verifyStep) {
      switch (type) {
        case 'deb':
          execSync(`dpkg-sig --verify "${artifact}"`, { timeout: 30000 });
          break;
        case 'AppImage':
          execSync(`gpg --verify "${artifact}.asc" "${artifact}"`, { timeout: 30000 });
          break;
        case 'rpm':
          execSync(`rpm -K "${artifact}"`, { timeout: 30000 });
          break;
      }
    }

    const sha256 = execSync(`sha256sum "${artifact}" | cut -d' ' -f1`).toString().trim();
    return {
      artifact, type, success: true,
      timestamp: new Date().toISOString(),
      size: fs.statSync(artifact).size,
      sha256
    };
  }
}

if (require.main === module) {
  const pipeline = new CodeSignPipeline({
    platform: (process.argv[2] || process.platform) as Platform,
    artifacts: process.argv.slice(3),
    timestampServer: process.env.TIMESTAMP_SERVER || 'http://timestamp.digicert.com',
    keyVaultUrl: process.env.AZURE_KV_URL,
    certificateName: process.env.AZURE_CERT_NAME,
    appleTeamId: process.env.APPLE_TEAM_ID,
    appleId: process.env.APPLE_ID,
    gpgKeyId: process.env.GPG_KEY_ID,
  });

  pipeline.run().then(results => {
    const failures = results.filter(r => !r.success);
    const report = results.map(r =>
      `  ${r.success ? 'OK' : 'FAIL'} ${r.artifact} (${r.type})` +
      (r.sha256 ? ` sha256:${r.sha256.substring(0, 16)}...` : '') +
      (r.error ? ` error:${r.error}` : '')
    ).join('\n');
    console.log(`Code Sign Report:\n${report}`);
    if (failures.length > 0) process.exit(1);
  }).catch(err => { console.error(err); process.exit(1); });
}
```

### 3.2 Key Management com HSM e Rotação

```typescript
// scripts/key-manager.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface KeyEntry {
  name: string;
  type: 'windows-ev' | 'windows-standard' | 'apple-dev-id' | 'apple-dev' | 'gpg' | 'cosign';
  provider: 'azure-kv' | 'yubikey' | 'local' | 'apple-hsm' | 'software';
  expiresAt: string;
  issuedAt: string;
  serialNumber: string;
  backupLocation: string;
  sha256Thumbprint: string;
  hardwareTokenId?: string;
  notes?: string;
}

interface KeyRotationEvent {
  date: string;
  oldKey: string;
  newKey: string;
  reason: 'expiry' | 'compromise' | 'reissue' | 'upgrade';
  artifactsReSigned: string[];
  verifiedBy: string;
}

class KeyManager {
  private keys: KeyEntry[] = [];
  private rotationLog: KeyRotationEvent[] = [];
  private keysPath: string;
  private rotationPath: string;

  constructor(basePath: string) {
    this.keysPath = path.join(basePath, 'key-registry.json');
    this.rotationPath = path.join(basePath, 'rotation-log.json');
    this.load();
    this.loadRotationLog();
  }

  private load(): void {
    if (fs.existsSync(this.keysPath)) {
      this.keys = JSON.parse(fs.readFileSync(this.keysPath, 'utf-8'));
    }
  }

  private loadRotationLog(): void {
    if (fs.existsSync(this.rotationPath)) {
      this.rotationLog = JSON.parse(fs.readFileSync(this.rotationPath, 'utf-8'));
    }
  }

  private save(): void {
    fs.writeFileSync(this.keysPath, JSON.stringify(this.keys, null, 2));
  }

  private saveRotationLog(): void {
    fs.writeFileSync(this.rotationPath, JSON.stringify(this.rotationLog, null, 2));
  }

  addKey(entry: KeyEntry): void {
    this.keys.push(entry);
    this.save();
  }

  removeKey(name: string): void {
    this.keys = this.keys.filter(k => k.name !== name);
    this.save();
  }

  getKey(name: string): KeyEntry | undefined {
    return this.keys.find(k => k.name === name);
  }

  getExpiringKeys(daysThreshold: number = 30): KeyEntry[] {
    const now = Date.now();
    return this.keys.filter(k => {
      const exp = new Date(k.expiresAt).getTime();
      const daysLeft = (exp - now) / 86400000;
      return daysLeft <= daysThreshold && daysLeft > 0;
    });
  }

  getExpiredKeys(): KeyEntry[] {
    const now = Date.now();
    return this.keys.filter(k => new Date(k.expiresAt).getTime() <= now);
  }

  rotateKey(oldName: string, newEntry: KeyEntry, reason: KeyRotationEvent['reason']): void {
    const oldKey = this.getKey(oldName);
    if (!oldKey) throw new Error(`Key not found: ${oldName}`);

    this.removeKey(oldName);
    this.addKey(newEntry);

    this.rotationLog.push({
      date: new Date().toISOString(),
      oldKey: oldName,
      newKey: newEntry.name,
      reason,
      artifactsReSigned: [],
      verifiedBy: process.env.USER || 'unknown'
    });
    this.saveRotationLog();
  }

  getKeysByProvider(provider: KeyEntry['provider']): KeyEntry[] {
    return this.keys.filter(k => k.provider === provider);
  }

  generateKeyHealthReport(): string {
    const now = Date.now();
    const lines: string[] = [
      '# Key Health Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Key | Type | Provider | Expires | Days Left | Status |',
      '|-----|------|----------|---------|-----------|--------|'
    ];

    for (const key of this.keys) {
      const exp = new Date(key.expiresAt).getTime();
      const daysLeft = Math.floor((exp - now) / 86400000);
      const status = daysLeft < 0 ? 'EXPIRED' : daysLeft < 30 ? 'EXPIRING' : daysLeft < 90 ? 'WARN' : 'OK';
      lines.push(
        `| ${key.name} | ${key.type} | ${key.provider} | ${key.expiresAt} | ${daysLeft}d | ${status} |`
      );
    }

    lines.push('', '## Rotation History', '');
    for (const event of this.rotationLog) {
      lines.push(`- ${event.date}: ${event.oldKey} -> ${event.newKey} (${event.reason})`);
    }

    return lines.join('\n');
  }

  exportReport(format: 'markdown' | 'json' = 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify({ keys: this.keys, rotationLog: this.rotationLog }, null, 2);
    }
    return this.generateKeyHealthReport();
  }
}
```

### 3.3 electron-builder Configuration

```yaml
# electron-builder.yml (code signing section)
win:
  certificateSubjectName: "IDEIA Inc"
  signingHashAlgorithms: ["sha256"]
  # Use signtool with Azure Key Vault
  sign: "scripts/win-sign.js"
  # Dual signing disabled (SHA-1 no longer needed)

mac:
  identity: "Developer ID Application: IDEIA Inc (TEAM123456)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: "scripts/macos/entitlements.plist"
  entitlementsInherit: "scripts/macos/entitlements.plist"
  notarize:
    teamId: "TEAM123456"
    appleId: "builds@ideia.dev"
  staple:
    notarize: true

linux:
  target:
    - target: AppImage
      sign: true
    - target: deb
      sign: true
    - target: snap
      sign: true
    - target: rpm
      sign: true
```

```javascript
// scripts/win-sign.js — electron-builder custom sign function
const { execSync } = require('child_process');

module.exports = async function(config) {
  const { path } = config;
  const timestampServer = process.env.TIMESTAMP_SERVER || 'http://timestamp.digicert.com';

  if (process.env.AZURE_KV_URL) {
    execSync(
      `AzureSignTool sign -kvu ${process.env.AZURE_KV_URL}` +
      ` -kvi ${process.env.AZURE_CLIENT_ID}` +
      ` -kvs ${process.env.AZURE_CLIENT_SECRET}` +
      ` -kvc ${process.env.AZURE_CERT_NAME || 'ideia-code-signing'}` +
      ` -tr ${timestampServer} -td SHA256 -v "${path}"`,
      { timeout: 180000 }
    );
  } else if (process.env.CERT_PFX_PATH) {
    execSync(
      `signtool sign /fd SHA256 /a /f "${process.env.CERT_PFX_PATH}"` +
      ` /p ${process.env.CERT_PASSWORD}` +
      ` /tr ${timestampServer} /td SHA256 "${path}"`,
      { timeout: 180000 }
    );
  } else {
    throw new Error('No signing credentials configured');
  }
};
```

### 3.4 GitHub Actions Workflow: Full Code Signing

```yaml
# .github/workflows/code-sign-release.yml
name: Code Sign Release Artifacts

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to sign (win32, darwin, linux, all)'
        required: true
        default: 'all'

jobs:
  code-sign-windows:
    name: Code Sign Windows
    runs-on: windows-latest
    if: ${{ github.event_name == 'release' || inputs.platform == 'win32' || inputs.platform == 'all' }}
    environment: code-signing
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: ideia-windows-installers

      - name: Sign with Azure Key Vault
        run: |
          npx tsx scripts/code-sign-pipeline.ts win32 *.exe *.msi
        env:
          AZURE_KV_URL: ${{ secrets.AZURE_KV_URL }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_CERT_NAME: ideia-code-signing
          TIMESTAMP_SERVER: http://timestamp.digicert.com

      - name: Sign with cosign (keyless)
        run: |
          cosign sign-blob --oidc-issuer https://token.actions.githubusercontent.com \
            --fulcio-url https://fulcio.sigstore.dev \
            --rekor-url https://rekor.sigstore.dev \
            IDEIA-Setup-*.exe > IDEIA-Setup-*.exe.sig
          cosign sign-blob --oidc-issuer https://token.actions.githubusercontent.com \
            --fulcio-url https://fulcio.sigstore.dev \
            --rekor-url https://rekor.sigstore.dev \
            IDEIA-*.msi > IDEIA-*.msi.sig

      - name: Upload signed artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ideia-windows-signed
          path: |
            *.exe
            *.exe.sig
            *.msi
            *.msi.sig

  code-sign-macos:
    name: Code Sign macOS
    runs-on: macos-latest
    if: ${{ github.event_name == 'release' || inputs.platform == 'darwin' || inputs.platform == 'all' }}
    environment: code-signing
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: ideia-macos-installers

      - name: Import Apple certificates
        run: |
          echo "${{ secrets.APPLE_DEVELOPER_P12_B64 }}" | base64 --decode > cert.p12
          security import cert.p12 -P "${{ secrets.APPLE_CERT_PASSWORD }}" -k ~/Library/Keychains/login.keychain-db
          security set-key-partition-list -S apple-tool:,apple: -s -k "${{ secrets.APPLE_KEYCHAIN_PASSWORD }}" ~/Library/Keychains/login.keychain-db

      - name: Sign and notarize
        run: |
          npx tsx scripts/code-sign-pipeline.ts darwin *.dmg *.app
        env:
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          TIMESTAMP_SERVER: http://timestamp.digicert.com

      - name: Upload signed artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ideia-macos-signed
          path: |
            *.dmg
            *.app/**/*

  code-sign-linux:
    name: Code Sign Linux
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'release' || inputs.platform == 'linux' || inputs.platform == 'all' }}
    environment: code-signing
    steps:
      - uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: ideia-linux-installers

      - name: Import GPG key
        run: |
          echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --import --batch
          echo "${{ secrets.GPG_PASSPHRASE }}" | gpg --passphrase-fd 0 --pinentry-mode loopback \
            --sign --default-key ${{ secrets.GPG_KEY_ID }} /dev/null

      - name: Sign packages
        run: |
          npx tsx scripts/code-sign-pipeline.ts linux *.AppImage *.deb *.snap *.rpm
        env:
          GPG_KEY_ID: ${{ secrets.GPG_KEY_ID }}
          TIMESTAMP_SERVER: http://timestamp.digicert.com

      - name: Sign with cosign (keyless)
        run: |
          for f in *.AppImage *.deb; do
            cosign sign-blob --oidc-issuer https://token.actions.githubusercontent.com \
              --fulcio-url https://fulcio.sigstore.dev \
              --rekor-url https://rekor.sigstore.dev \
              "$f" > "$f.sig"
          done

      - name: Upload signed artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ideia-linux-signed
          path: |
            *.AppImage *.AppImage.asc *.AppImage.sig
            *.deb *.deb.sig
            *.snap *.snap.asc
            *.rpm

  merge-release:
    name: Create Release with Signed Artifacts
    needs: [code-sign-windows, code-sign-macos, code-sign-linux]
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - name: Download all signed artifacts
        uses: actions/download-artifact@v4
        with:
          path: signed-artifacts/

      - name: Generate SBOM (CycloneDX)
        run: |
          npm install -g @cyclonedx/cyclonedx-npm
          cyclonedx-npm --output-format JSON > signed-artifacts/ideia-sbom-1.0.0.json

      - name: Sign SBOM
        run: |
          cosign sign-blob --oidc-issuer https://token.actions.githubusercontent.com \
            --fulcio-url https://fulcio.sigstore.dev \
            --rekor-url https://rekor.sigstore.dev \
            signed-artifacts/ideia-sbom-1.0.0.json \
            > signed-artifacts/ideia-sbom-1.0.0.json.sig

      - name: Attach to release
        uses: softprops/action-gh-release@v2
        with:
          files: signed-artifacts/**
          tag_name: ${{ github.event.release.tag_name || 'v1.0.0' }}
```

### 3.5 Certificate Health Monitoring

```typescript
// scripts/cert-health-monitor.ts
import { KeyManager } from './key-manager';
import * as https from 'https';
import * as cron from 'node-cron';

class CertHealthMonitor {
  private keyManager: KeyManager;
  private alertWebhook: string;

  constructor(keyManager: KeyManager, alertWebhook: string) {
    this.keyManager = keyManager;
    this.alertWebhook = alertWebhook;
  }

  start(): void {
    // Daily check at 9:00 AM
    cron.schedule('0 9 * * *', () => this.check());

    // Weekly full report on Monday 10:00
    cron.schedule('0 10 * * 1', () => this.generateFullReport());
  }

  async check(): Promise<void> {
    const expiring = this.keyManager.getExpiringKeys(30);
    const expired = this.keyManager.getExpiredKeys();

    if (expiring.length > 0 || expired.length > 0) {
      await this.sendAlert({
        level: expired.length > 0 ? 'CRITICAL' : 'WARNING',
        expiring: expiring.map(k => ({ name: k.name, expiresAt: k.expiresAt })),
        expired: expired.map(k => ({ name: k.name, expiresAt: k.expiresAt })),
      });
    }
  }

  // OCSP check for certificate revocation status
  async ocspCheck(certPath: string): Promise<{ status: string; revokedAt?: string }> {
    const { execSync } = require('child_process');
    const result = execSync(
      `openssl ocsp -issuer ca.pem -cert ${certPath}` +
      ` -url http://ocsp.digicert.com -resp_text`
    ).toString();
    if (result.includes('revoked')) return { status: 'revoked' };
    if (result.includes('good')) return { status: 'good' };
    return { status: 'unknown' };
  }

  private async sendAlert(payload: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.alertWebhook);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, res => resolve());
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  private async generateFullReport(): Promise<void> {
    const report = this.keyManager.generateKeyHealthReport();
    console.log(report);
    // Could also write to file, send to Slack, create issue, etc.
  }
}
```

---

## 4. INOVAÇÃO

### 4.1 Keyless Signing com Sigstore (Ephemeral Certificates)

A inovação central do Sigstore é eliminar o gerenciamento de chaves:

```
Fluxo Tradicional (com chaves)
  Gera key pair → protege HSM → sign → renew → revogação

Fluxo Sigstore (keyless)
  OIDC Login → Fulcio emite cert efêmero (10min) → sign → cert expira
  NUNCA armazena chave privada
  Rekor registra em transparency log (imutável)
```

**Benefícios para IDEIA:**
- Zero custo de certificados OV/EV para Linux/macOS containers
- SLSA Level 2 automático com attested provenance
- Transparência pública: qualquer um pode auditar o log Rekor
- Sem risco de vazamento de chave privada (não existem chaves)

### 4.2 OIDC-Based Signing (Workload Identity Federation)

Cada cloud provider oferece OIDC tokens para CI/CD sem secrets:

```yaml
# GitHub Actions OIDC (keyless)
- name: Sign with OIDC
  run: |
    cosign sign --oidc-issuer https://token.actions.githubusercontent.com \
      --fulcio-url https://fulcio.sigstore.dev \
      ghcr.io/ideia/desktop:1.0.0

# Azure Workload Identity
- uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

# Google Cloud Workload Identity Federation
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: projects/123/locations/global/workloadIdentityPools/github/providers/github
    service_account: builder@ideia.iam.gserviceaccount.com
```

**Inovação:** nenhum secret de longa duração. O runner recebe um token OIDC que é usado para autenticar contra o Fulcio/Azure KV. Se o runner for comprometido, o token expira em minutos.

### 4.3 Binary Transparency with Rekor

Rekor é um log de transparência imutável (append-only Merkle tree):

```
Rekor Entry Structure:
{
  "apiVersion": "0.0.1",
  "spec": {
    "signature": { "content": "MEYCIQD...", "format": "x509" },
    "signedEntryTimestamp": "MEUCIQ...",
    "body": {
      "intendedEntry": {
        "kind": "artifact",
        "hash": { "algorithm": "sha256", "value": "abcd..." }
      }
    },
    "integratedTime": 1721884800,
    "logIndex": 1234567
  }
}
```

**Vantagem para IDEIA:**
- Garante que toda assinatura é pública e auditável
- Se alguém tentar usar assinatura IDEIA falsa, Rekor detecta
- Clientes podem verificar contra Rekor em vez de chain de certificado
- Compliance: atende requisitos de non-repudiation (SLSA 3+)

### 4.4 Self-Signed Certificates para Desenvolvimento

Para desenvolvimento local (fora CI), self-signed é suficiente:

```powershell
# Windows: Create self-signed CA + cert
$ca = New-SelfSignedCertificate -Type Custom -KeyUsage CertSign `
  -Subject "CN=IDEIA Development CA" -KeyExportPolicy Exportable `
  -CertStoreLocation Cert:\CurrentUser\My

$cert = New-SelfSignedCertificate -Type CodeSigning `
  -Subject "CN=IDEIA Development" -Signer $ca `
  -KeyUsage DigitalSignature -CertStoreLocation Cert:\CurrentUser\My

# Export PFX
$password = ConvertTo-SecureString "dev-only" -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath dev-signing.pfx -Password $password
```

```bash
# macOS: Self-signed certificate
security create-keychain -p "dev" ideia-dev.keychain
security import dev-signing.pfx -k ~/Library/Keychains/ideia-dev.keychain -P "dev-only"
security set-key-partition-list -S apple-tool:,apple: -s -k "dev" ideia-dev.keychain
```

---

## 5. PESQUISA

### 5.1 Custo Total de Propriedade (TCO)

| Componente | OV (Standard) | EV | Keyless (Sigstore) |
|------------|---------------|-----|---------------------|
| Certificado Windows | $100/ano | $300/ano | $0 |
| Certificado macOS | $99/ano | $99/ano | $0 |
| Hardware Token | $0 | $150 (SafeNet) | $0 |
| Azure Key Vault | $0.03/op (~$5/mês) | $0.03/op | $0 |
| Apple Developer | $99/ano | $99/ano | $99/ano |
| GPG (Linux) | $0 | $0 | $0 |
| **Total Ano (est.)** | **~$300** | **~$650** | **~$100** |
| **Setup (1ª vez)** | **~$50** | **~$250** | **~$0** |
| **Confiança SmartScreen** | Média | Alta (imediata) | N/A (Linux/Containers) |

### 5.2 Microsoft SmartScreen Reputation

Reputação SmartScreen é um sistema de confiança baseado em:
- Downloads totais do binário
- Feedback positivo (usuários executam sem dismiss)
- Histórico do certificado (EV acelera)
- Histórico da publisher (empresa)

**Estratégia para IDEIA (EV vs Standard):**

| Fator | EV | Standard |
|-------|-----|----------|
| Custo extra | $200/ano | $0 |
| Tempo para confiança | Imediato | ~3-6 meses |
| Downloads necessários | 0 | ~500-2000 |
| Risco de SmartScreen block | ~0% | ~30% primeiros meses |
| **Recomendação MVP** | **Sim (compra única)** | Não |

**Decisão:** IDEIA começa com EV para Windows (SmartScreen imediato), migra para Standard após 6 meses quando reputação estiver estabelecida.

### 5.3 Apple Notarization: SLA e Failure Modes

| Estágio | Tempo | Falha Comum | Solução |
|---------|-------|-------------|---------|
| Upload | 30s-2min | Timeout (>500MB) | Split .dmg |
| Server-side scan | 2-15min | Hardened Runtime violation | Corrigir entitlements |
| Result | Instant | Invalid binary | Re-sign nested dylibs |
| Stapling | 5s | Network offline | Fallback: ticket online |

**Falhas conhecidas:**
- Binary contains quarantined files: `xattr -cr` antes de assinar
- Electron framework not signed: signar todos os `.dylib` e Frameworks aninhados
- com.apple.security.cs.disable-library-validation: adicionar ao entitlements para plugins

### 5.4 Hardware Tokens: YubiKey vs SafeNet vs NitroKey

| Característica | YubiKey 5 FIPS | SafeNet eToken 5110 | NitroKey HSM 2 |
|----------------|----------------|---------------------|-----------------|
| Preço | ~$80 | ~$150 | ~$100 |
| Formato | USB-A/C | USB-A | USB-A |
| Certificação | FIPS 140-2 L2 | FIPS 140-2 L3 | FIPS 140-2 L2 |
| EV Support | Sim (via middleware) | Sim (nativo) | Sim |
| GPG Support | Nativo | Não | Nativo |
| PIV Support | Sim | Sim | Sim |
| Azure KV Support | Sim (via PKCS#11) | Sim | Sim |
| **Recomendação IDEIA** | **GPG + Windows** | **Windows EV** | **GPG + alternativo** |

### 5.5 Certificate Revocation: CRL vs OCSP

| Método | Latência | Privacidade | Confiabilidade |
|--------|----------|-------------|----------------|
| CRL (Certificate Revocation List) | Alta (lista baixada) | Boa | Média (tamanho) |
| OCSP (Online Certificate Status Protocol) | Baixa (consulta online) | Ruim (CA sabe IP) | Alta |
| OCSP Stapling | Muito baixa | Boa (cliente não consulta) | Alta (servidor fornece) |

**Windows Authenticode usa:** apenas CRL (não OCSP por padrão desde Windows 10).
**macOS usa:** OCSP (consulta online na primeira execução).
**Linux usa:** CRL (apt update baixa Release.gpg + InRelease).

### 5.6 Comparativo de Ferramentas de Signing

| Ferramenta | Windows | macOS | Linux | Container | Custo | HSM Support |
|------------|---------|-------|-------|-----------|-------|-------------|
| signtool (SDK) | Nativo | Não | Não | Não | Gratuito (SDK) | Sim (CSP) |
| AzureSignTool | Sim | Não | Não | Não | Gratuito (OSS) | Sim (AKV) |
| jsign (Java) | Sim | Sim | Sim | Não | Gratuito (OSS) | Sim (PKCS#11) |
| osslsigncode | Sim | Sim | Sim | Não | Gratuito (OSS) | Sim |
| rcodesign (Tauri) | Sim | Sim | Sim | Não | Gratuito (Rust) | Limitado |
| cosign (sigstore) | Sim | Sim | Sim | Sim | Gratuito (OSS) | Fulcio |
| notarytool (Apple) | Não | Sim | Não | Não | Incluso (Xcode) | Apple HSM |
| codesign (Apple) | Não | Sim | Não | Não | Incluse (Xcode) | Apple HSM |
| gpg | Não | Sim | Sim | Não | Gratuito | YubiKey |

**Recomendação IDEIA:** signtool (Win) + AzureSignTool (CI) + codesign/notarytool (macOS) + gpg (Linux) + cosign (containers + SBOM).

---

## 6. FRONTEIRAS

### 6.1 Assinatura Pós-Quantum

Os algoritmos atuais de assinatura (RSA-2048, ECDSA P-256) serão quebrados por computadores quânticos:

| Algoritmo | Bits de Segurança | Quantum Safe | Notas |
|-----------|-------------------|--------------|-------|
| RSA-2048 | 112 | Não | Fatorável por Shor |
| ECDSA P-256 | 128 | Não | Quebrado por Shor |
| Ed25519 | 128 | Não | Variante Edwards |
| **Dilithium** | **128-256** | **Sim** | **ML-KEM (NIST PQC)** |
| **Falcon** | **128-256** | **Sim** | **Alternativa NIST** |
| SPHINCS+ | 128-256 | Sim | Stateful, maior assinatura |

**Preparação IDEIA:**
- Monitorar migração de CAs para híbrido (ECDSA + Dilithium)
- Preparar pipeline para aceitar múltiplas assinaturas (dual cert)
- A partir de 2028-2030, espera-se suporte generalizado

### 6.2 Assinatura de Firmware e Drivers

Para futura expansão (IDEIA Drivers, kernel modules):

```bash
# Windows Kernel Driver Signing
# EV + WHQL (Windows Hardware Quality Lab)
# Obrigatório para drivers kernel-mode (Windows 10+)
signtool sign /fd SHA256 /a /ac cross-cert.cer \
  /f ideia-ev.pfx /p $env:CERT_PASSWORD \
  /tr http://timestamp.digicert.com /td SHA256 \
  ideia-driver.sys

# Linux Kernel Module (DKMS)
gpg --detach-sign modulename.ko
# MOK (Machine Owner Key) para Secure Boot
mokutil --import modulename.der
```

### 6.3 Assinatura de Atualizações (OTA)

```typescript
// Auto-updater signing strategy
interface UpdatePayload {
  version: string;
  url: string;
  sha512: string;
  signature: string;      // GPG/ECDSA signature of sha512
  certificate: string;    // Certificate chain
  timestamp: string;      // RFC 3161
}

// Verification in client:
// 1. Download update
// 2. Compute sha512
// 3. Verify signature against embedded public key
// 4. Verify timestamp signature
// 5. Apply update
```

```yaml
# electron-builder auto-update signing
win:
  certificateSubjectName: "IDEIA Inc"
  signAndEditExecutable: true
  signingHashAlgorithms: ["sha256"]

nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  # Signed installer
  runAfterFinish: false

publish:
  provider: github
  owner: ideia
  repo: ideia-desktop
  releaseType: draft
```

### 6.4 Renovação Automática de Certificados

```typescript
// scripts/auto-renew-certs.ts
import { execSync } from 'child_process';

interface RenewConfig {
  certName: string;
  provider: 'digicert' | 'sectigo' | 'comodo';
  apiKey: string;
  organizationId: string;
  daysBeforeExpiry: number; // Trigger renewal N days before
}

class CertificateRenewer {
  private config: RenewConfig;

  constructor(config: RenewConfig) {
    this.config = config;
  }

  async checkAndRenew(): Promise<boolean> {
    const certInfo = this.getCertificateInfo();
    const daysLeft = this.daysUntilExpiry(certInfo.expiry);

    if (daysLeft > this.config.daysBeforeExpiry) {
      console.log(`Cert OK: ${daysLeft}d remaining`);
      return false;
    }

    console.log(`Renewing cert (${daysLeft}d left)...`);
    const newCert = await this.renewCertificate();
    await this.importCertificate(newCert);
    await this.reSignArtifacts();
    return true;
  }

  private getCertificateInfo(): { subject: string; expiry: string; thumbprint: string } {
    // Parse from local cert store or Azure KV
    const result = execSync(
      `certutil -store My "${this.config.certName}"`
    ).toString();
    return this.parseCertInfo(result);
  }

  private async renewCertificate(): Promise<Buffer> {
    // API call to DigiCert/Sectigo to reissue cert
    const response = await fetch(
      `https://api.digicert.com/v2/certificates/reissue`,
      {
        method: 'POST',
        headers: { 'X-DC-API-KEY': this.config.apiKey },
        body: JSON.stringify({ certificate: { common_name: this.config.certName } })
      }
    );
    return Buffer.from(await response.arrayBuffer());
  }

  private async importCertificate(cert: Buffer): Promise<void> {
    // Azure KV import
    execSync(
      `az keyvault certificate import --vault-name ideia-kv` +
      ` -n ${this.config.certName} -f cert.pfx` +
      ` --password ${process.env.CERT_PASSWORD}`
    );
  }

  private async reSignArtifacts(): Promise<void> {
    console.log('Re-signing all release artifacts with new certificate...');
    execSync('npx tsx scripts/code-sign-pipeline.ts win32 dist/*.exe dist/*.msi');
    execSync('npx tsx scripts/code-sign-pipeline.ts darwin dist/*.dmg');
    execSync('npx tsx scripts/code-sign-pipeline.ts linux dist/*.AppImage dist/*.deb');
  }

  private daysUntilExpiry(expiry: string): number {
    const exp = new Date(expiry).getTime();
    return Math.floor((exp - Date.now()) / 86400000);
  }

  private parseCertInfo(raw: string): { subject: string; expiry: string; thumbprint: string } {
    const subject = raw.match(/Subject:\s*(.+)/)?.[1] || '';
    const expiry = raw.match(/NotAfter:\s*(.+)/)?.[1] || '';
    const thumbprint = raw.match(/Cert Hash\(sha1\):\s*(\w+)/)?.[1] || '';
    return { subject, expiry, thumbprint };
  }
}
```

---

## 7. ANÁLISE PARA IDEIA

### 7.1 Estado Atual

```
Status: NÃO IMPLEMENTADO (gap crítico)

Current scripts/code-sign.ts: INCOMPLETO
- ✅ Basic signtool wrapper (PFX)
- ❌ Azure Key Vault integration
- ❌ macOS codesign + hardened runtime
- ❌ macOS notarization + stapling
- ❌ Linux GPG + debsign + rpmsign
- ❌ RFC 3161 timestamping
- ❌ cosign/sigstore integration
- ❌ SBOM signing
- ❌ CI/CD workflow
- ❌ Certificate health monitoring
- ❌ Automatic renewal
- ❌ Key manager with rotation
```

### 7.2 Plano de Implementação

**Fase 1 — Foundation (1 semana)**
- Adquirir certificado EV Windows (DigiCert/Sectigo)
- Adquirir Apple Developer ID ($99)
- Gerar GPG key para Linux
- Configurar Azure Key Vault com EV cert
- Implementar key-manager.ts (registro + auditoria)

**Fase 2 — Pipeline Core (1 semana)**
- Completar code-sign-pipeline.ts (todas plataformas)
- Configurar electron-builder.yml com signing
- CI workflow para Windows + AzureSignTool
- CI workflow para macOS + codesign + notarytool
- CI workflow para Linux + GPG

**Fase 3 — Validação (dias 11-15)**
- Testar signing em todos 7 artefatos
- Verificar SmartScreen (download + install)
- Verificar Gatekeeper + notarization
- Verificar apt install + gpg verification
- Usar sigstore verification (cosign verify)

**Fase 4 — Supply Chain (dias 16-20)**
- cosign sign-blob em todos artefatos
- SLSA provenance generation
- Rekor transparency log
- SBOM CycloneDX generation + signing
- Verify no CI: signature check + attestation

**Fase 5 — Automação (dias 21-25)**
- Certificate health monitor + alert (Slack/Webhook)
- Auto-renewal workflow (GitHub Actions cron)
- Key rotation playbook
- Certificate expiry dashboard (Theia widget)
- Audit logging (audit trail SHA-256)

### 7.3 Tabela de Custos (Estimativa Anual)

| Item | Custo | Notas |
|------|-------|-------|
| Certificado EV Windows (1º ano) | $300 | DigiCert/Sectigo |
| Certificado EV Windows (renovação) | $250 | Desconto renovação |
| Apple Developer Program | $99 | Necessário todos anos |
| Hardware Token SafeNet | $150 | Compra única |
| Azure Key Vault (operações) | ~$60 | ~2000 signs/mês |
| Azure Key Vault (HSM) | ~$360 | Standard tier |
| YubiKey (GPG) | $80 | Compra única |
| **Total 1º ano** | **~$1049** | |
| **Total anos seguintes** | **~$770** | Sem hardware |

### 7.4 Gaps Identificados para IDEIA

| ID | Gap | Prioridade | Fase |
|----|-----|------------|------|
| GS-D14-01 | `scripts/code-sign.ts` incompleto (só Windows PFX) | 🔴 | F1 |
| GS-D14-02 | Falta Azure Key Vault integration | 🔴 | F1 |
| GS-D14-03 | Falta macOS codesign + notarization | 🔴 | F2 |
| GS-D14-04 | Falta Linux GPG + deb + snap + rpm | 🔴 | F2 |
| GS-D14-05 | Falta RFC 3161 timestamp em todos métodos | 🟠 | F1 |
| GS-D14-06 | Falta cosign/sigstore integration | 🟠 | F4 |
| GS-D14-07 | Falta SBOM signing | 🟠 | F4 |
| GS-D14-08 | Falta CI/CD workflow GitHub Actions | 🔴 | F2 |
| GS-D14-09 | Falta certificate health monitoring | 🟡 | F5 |
| GS-D14-10 | Falta auto-renewal | 🟡 | F5 |
| GS-D14-11 | Falta key rotation playbook | 🟡 | F5 |
| GS-D14-12 | Falta sign verificaton em testes de release | 🟠 | F3 |
| GS-D14-13 | Sem EV certificate adquirido | 🔴 | F1 |
| GS-D14-14 | Sem certificado Apple Developer | 🔴 | F1 |
| GS-D14-15 | Sem GPG key para Linux | 🟠 | F1 |

### 7.5 Recomendações Finais

1. **Comprar EV + Apple Developer AGORA** — lead time de 5-10 dias para EV
2. **Priorizar Azure Key Vault** sobre PFX local (segurança + CI ready)
3. **Usar cosign keyless** para Linux + containers (zero custo, SLSA Level 2)
4. **Implementar notarization OBRIGATÓRIA** — Apple exige desde macOS 10.15+
5. **RFC 3161 timestamp em TUDO** — sem timestamp, assinatura morre quando cert expira
6. **Sigstore Rekor como audit trail público** — compliance + transparência
7. **Monitor de expiração com alerta 30 dias antes** — renovação leva dias

---

## 8. REFERÊNCIAS

### Documentação Oficial

1. Microsoft Authenticode: https://learn.microsoft.com/en-us/windows/win32/seccrypto/authenticode-portal
2. signtool: https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool
3. Apple Code Signing: https://developer.apple.com/documentation/security/code_signing
4. Apple Notarization: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
5. Rust codesign (Tauri): https://github.com/NiklasRosenstein/rcodesign
6. Cosign (sigstore): https://docs.sigstore.dev/cosign/overview/
7. SLSA Framework: https://slsa.dev/spec/v1.0/
8. RFC 3161 (Timestamp): https://datatracker.ietf.org/doc/html/rfc3161
9. Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/
10. Microsoft Trusted Signing: https://learn.microsoft.com/en-us/azure/trusted-signing/

### Ferramentas e SDKs

11. AzureSignTool: https://github.com/vcsjones/AzureSignTool
12. osslsigncode: https://github.com/mtrojnar/osslsigncode
13. jsign: https://github.com/ebourg/jsign
14. rcodesign: https://crates.io/crates/rcodesign
15. electron-builder: https://www.electron.build/
16. Tauri bundler: https://tauri.app/v1/guides/building/

### Artigos e Guias

17. SmartScreen Reputation Guide: https://learn.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-smartscreen/
18. Code Signing Best Practices (DigiCert): https://www.digicert.com/blog/code-signing-certificates-best-practices/
19. Supply Chain Levels (Google): https://research.google/pubs/supply-chain-levels-for-software-artifacts/
20. Binary Transparency (Rekor): https://github.com/sigstore/rekor

### IDEIA-specific

21. `packages/electron/electron-builder.yml` — Build config
22. `packages/tauri/src-tauri/tauri.conf.json` — Tauri config
23. `scripts/code-sign.ts` — Script atual (a ser substituído)
24. `scripts/code-sign-pipeline.ts` — Pipeline completo (implementação proposta)
25. `scripts/key-manager.ts` — Gerenciamento de chaves (implementação proposta)
26. `F:\PROJETOS\ai-devkit-workspace\IDEIA\docs\governance\GAPS-PRODUCAO-IDE.md` — GS-D14-01 a GS-D14-15

### 3.3 SBOM Integration com Assinatura

```typescript
// scripts/sbom-sign.ts
import { createHash, createSign } from 'node:crypto';
import * as fs from 'fs';

class SBOMManager {
  generateSBOM(version, components) {
    return {
      $schema: 'http://cyclonedx.org/schema/bom-1.5.schema.json',
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'IDEIA', name: 'sbom-generator', version: '1.0.0' }],
        component: { name: 'IDEIA', version: version, type: 'application' },
      },
      components: components.map(function(c) {
        return {
          name: c.name, version: c.version, type: c.type, purl: c.purl,
          licenses: c.licenses.map(function(l) { return { license: { id: l } }; }),
        };
      }),
    };
  },

  signSBOM(sbom, privateKeyPath) {
    const sign = createSign('SHA384');
    sign.update(JSON.stringify(sbom, null, 2));
    sign.end();
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    const signature = sign.sign(privateKey, 'base64');
    return JSON.stringify(sbom, null, 2) + '\n<!-- signature:' + signature + ' -->\n';
  },
}
```

### 3.4 GitHub Actions Workflow

```yaml
name: Release Signing Pipeline
on:
  release:
    types: [published]
jobs:
  sign-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: {{ secrets.AZURE_CLIENT_ID }}
          tenant-id: {{ secrets.AZURE_TENANT_ID }}
      - name: Sign
        run: dotnet tool install --global AzureSignTool && AzureSignTool sign -kvu https://ideia-kv.vault.azure.net -kvi ${{ secrets.AZURE_CLIENT_ID }} -kvs ${{ secrets.AZURE_CLIENT_SECRET }} -kvc code-signing-cert dist/*.exe
```

### 3.5 Revocation Handling

```typescript
// scripts/handle-cert-revocation.ts
class RevocationHandler {
  async handle(revocation) {
    console.log("Handling cert revocation: " + revocation.certName);
    await this.revokeInKeyVault(revocation.certName);
    const newCert = await this.issueNewCertificate(revocation.certType);
    await this.resignArtifacts(revocation.artifactsSigned, newCert);
    await this.notifyUsers(revocation);
  }
  async revokeInKeyVault(certName) {
    const { execSync } = require("child_process");
    execSync("az keyvault certificate delete --vault-name " + process.env.AZURE_VAULT_NAME + " --name " + certName);
  }
  async issueNewCertificate(type) {
    console.log("Issuing new " + type + " certificate...");
    return { name: "code-signing-" + Date.now(), path: "" };
  }
  async resignArtifacts(artifacts, newCert) {
    for (const a of artifacts) { console.log("Re-signing: " + a); }
  }
  async notifyUsers(revocation) {
    console.log("Notifying users about " + revocation.certName + " revocation");
  }
}
```

---

## 4. Integracao com IDEIA

### 4.1 NATS Event Topics

| Topic | Descricao |
|-------|-----------|
| cert.sign.started | Pipeline de signing iniciado |
| cert.sign.completed | Artefato assinado com sucesso |
| cert.sign.failed | Falha no signing |
| cert.expiry.warning | Certificado expirando em <30 dias |
| cert.expiry.critical | Certificado expirado |
| cert.revocation.notify | Certificado revogado |

### 4.2 CLI Commands

```bash
IDEIA cert status
IDEIA cert renew
IDEIA cert sign <file>
IDEIA cert verify <file>
IDEIA cert backup
IDEIA cert health
```

---

## 5. Analise Comparativa

| Caracteristica | EV Windows | Standard Windows | Apple Dev ID | GPG Linux | Sigstore |
|----------------|-----------|-----------------|-------------|-----------|----------|
| Custo/ano | $300 | $100 | $99 | Gratuito | Gratuito |
| Confianca | Imediata | Reputacao | Gatekeeper | Manual | OIDC |
| HSM Required | Sim | Opcional | Secure Enclave | Smartcard | Nao |
| Renovacao | Manual | Manual | Anual | Manual | N/A |
| Windows Trust | SmartScreen | SmartScreen | N/A | N/A | N/A |
| macOS Trust | N/A | N/A | Gatekeeper | N/A | N/A |
| Linux Trust | N/A | N/A | N/A | GPG WoT | Sigstore |

---

## 6. Metricas e Testes

| Tipo | Escopo |
|------|--------|
| Unit | KeyManager, SBOMManager, RevocationHandler |
| Integration | Pipeline signing em cada plataforma (CI matrix) |
| Security | Verificacao de assinatura, deteccao de certificado expirado |
| E2E | Release completo: build -> sign -> verify -> publish |

| Metrica | Alvo |
|---------|------|
| Artifacts signed | 100% dos artefatos |
| Signature verification | 100% pass |
| Cert expiry monitoring | 100% coberto |
| SBOM generation | 100% dos releases |

---

## 7. Riscos e Mitigacao

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Private key compromise | Baixa | Critico | HSM + Azure Key Vault + acesso restrito |
| Cert expiry sem renovacao | Media | Alto | Monitoramento automatico + alertas 30d antes |
| EV cert custo alto | Alta | Medio | Standard para dev, EV so para release |
| Apple notarization falha | Baixa | Alto | CI testa notarization em PRs |
| GPG key perdida | Baixa | Alto | Backup offline + YubiKey |

---

## 8. Roadmap

### Fase 1 - Atual
- scripts/code-sign.ts existente (ad-hoc signing)

### Fase 2 - Pipeline CI/CD
- Azure Key Vault + AzureSignTool
- Apple Developer ID + notarization
- GPG + debsign
- **Horas estimadas:** 30h

### Fase 3 - Automacao
- KeyManager com auto-rotation
- Cert expiry monitoring + alertas
- SBOM generation automatico
- **Horas estimadas:** 20h

### Fase 4 - Enterprise
- Revocation handling
- Transparency log (Rekor)
- HSM fisico (YubiKey) para backup
- **Horas estimadas:** 25h

**Total estimado:** 75h

---

## 9. Referencias

1. AzureSignTool - github.com/vcsjones/AzureSignTool
2. Apple Code Signing - developer.apple.com/support/code-signing
3. Sigstore - sigstore.dev
4. GPG Documentation - gnupg.org
5. CycloneDX SBOM - cyclonedx.org
6. RFC 3161 Timestamp Protocol - ietf.org/rfc/rfc3161
7. OWASP Code Signing - owasp.org

---

## 10. Decisao Final

### Recomendacao: **Aprovado - Prioridade Alta**

Estado atual: scripts/code-sign.ts existe mas usa ad-hoc signing.

PLANO:
- EV cert Windows: $300/ano (producao)
- Apple Developer ID: $99/ano
- GPG: gratuito
- Azure Key Vault: $0.03/operacao
- Pipeline CI/CD: 3 workflows (win/mac/linux)

CUSTO TOTAL ANUAL: ~$500 + 75h desenvolvimento

IMPACTO: Sem code signing, SmartScreen bloqueia downloads, Gatekeeper impede execucao. Com signing, confianca imediata.

PRIORIDADE: Alta - implementar antes do primeiro release publico.
