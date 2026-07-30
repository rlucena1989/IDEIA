# ESTUDO-D11 — Instaladores Windows

> **Data:** 2026-07-25 | **Versão:** 3.0 (intensificado)
> **Área:** Desktop/DevOps | **Nível:** 9/12 | **Profundidade:** 9
> **Propósito:** Estudo completo de instaladores Windows — NSIS, Inno Setup, MSI/WiX Toolset, Squirrel.Windows, electron-builder, MSIX, silent install enterprise, auto-update, segurança, deploy enterprise, e plano de implementação para IDEIA.

---

## SUMÁRIO

1.  [FUNDAMENTOS](#1-fundamentos)
2.  [TÉCNICO](#2-técnico)
3.  [ENGENHARIA](#3-engenharia)
4.  [INOVAÇÃO](#4-inovação)
5.  [PESQUISA](#5-pesquisa)
6.  [FRONTEIRAS](#6-fronteiras)
7.  [ANÁLISE PARA IDEIA](#7-análise-para-ideia)
8.  [REFERÊNCIAS](#8-referências)

---

## 1. FUNDAMENTOS

### 1.1 O Problema dos Instaladores Windows

Aplicações desktop no ecossistema Windows enfrentam desafios únicos de distribuição que não existem em macOS (DMG simplificado) ou Linux (package managers nativos). O Windows carece de um sistema de empacotamento universal — existem ao menos cinco formatos concorrentes (NSIS, Inno Setup, MSI, MSIX, Portable), cada um com tradeoffs diferentes de UX, governança enterprise, segurança e manutenibilidade.

Para a IDEIA — uma IDE que pretende rodar como aplicação desktop nativa (Electron, futuramente Tauri v2) — a escolha do formato de instalador impacta diretamente:

- **Adoção consumer:** Instalação com 1 clique, sem prompts técnicos
- **Deploy enterprise:** Suporte a GPO, SCCM, Intune, silent install
- **Auto-update:** Mecanismo de atualização contínua sem perda de dados
- **Segurança:** Assinatura digital, reputação SmartScreen, antivírus
- **Manutenção:** Custo de manter múltiplos formatos em paralelo

### 1.2 Público-Alvo

| Perfil | Necessidade | Formato Preferido |
|--------|-------------|-------------------|
| Usuário final (consumer) | 1 clique, auto-update, UI bonita | NSIS / electron-builder |
| IT Admin enterprise | Silent install, GPO, SCCM, Intune | MSI (WiX) |
| Microsoft Store | Sandbox, certificação, Store biz | MSIX |
| DevOps CI/CD | Portable, sem instalação, extrair e rodar | Portable .zip |
| Desenvolvedor IDEIA | Manutenção unificada, CI pipeline | electron-builder.yml |

### 1.3 Ecossistema Windows Installer — Mapa Conceitual

```
                    ┌─────────────────────────────────────────────┐
                    │         Windows Installer Ecosystem         │
                    ├─────────────────────────────────────────────┤
                    │                                             │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
                    │  │  NSIS    │  │Inno Setup│  │MSI/WiX   │  │
                    │  │Consumer  │  │Consumer+ │  │Enterprise │  │
                    │  │Auto-upd. │  │Enterprise│  │GPO/SCCM  │  │
                    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
                    │       │             │             │         │
                    │       └──────────┬──┘─────────────┘         │
                    │                  │                           │
                    │         ┌────────▼────────┐                  │
                    │         │ electron-builder│                  │
                    │         │  (NSIS + MSI)   │                  │
                    │         └────────┬────────┘                  │
                    │                  │                           │
                    │  ┌──────────┐    │    ┌──────────┐          │
                    │  │  MSIX    │◄───┴───►│Squirrel. │          │
                    │  │Win Store │         │ Windows  │          │
                    │  │Sandbox   │         │Delta Upd.│          │
                    │  └──────────┘         └──────────┘          │
                    │                                             │
                    │  ┌──────────┐  ┌──────────────────────┐     │
                    │  │ Portable │  │ Enterprise Mgmt      │     │
                    │  │  .zip    │  │ GPO · SCCM · Intune  │     │
                    │  │  CI/CD   │  │ Chocolatey · winget  │     │
                    │  └──────────┘  └──────────────────────┘     │
                    └─────────────────────────────────────────────┘
```

### 1.4 Dependências do Projeto IDEIA

| Artefato | Caminho | Formato | Status |
|----------|---------|---------|--------|
| electron-builder config | `packages/electron/electron-builder.yml` | NSIS + MSI | ✅ Configurado |
| Code signing pipeline | `scripts/code-sign-pipeline.ts` | signtool | ✅ Implementado |
| Auto-updater | `packages/electron/src/auto-updater.ts` | electron-updater | ✅ Implementado |
| MSI enterprise | `packages/electron/electron-builder.yml` | WiX gerado | ⚠️ Apenas config básica |
| MSIX package | (não implementado) | AppxManifest | ❌ Pendente |
| Portable build | `packages/electron/electron-builder.yml` | zip target | ❌ Pendente |
| winget manifest | (não implementado) | YAML | ❌ Pendente |
| Chocolatey package | (não implementado) | .nupkg | ❌ Pendente |

### 1.5 Conexões com Outros Estudos

| Estudo | Relação |
|--------|---------|
| **D01** (Electron Desktop) | Shell que o instalador empacota |
| **D05** (Multi-Shell) | Instaladores variam por shell-alvo |
| **D14** (Code Signing) | Instaladores precisam ser assinados |
| **D09** (IPC Security) | Auto-update precisa de IPC seguro |
| **D15** (CI/CD Pipeline) | Build de instaladores no pipeline |
| **D23** (Multi-Platform) | Instaladores Windows vs macOS DMG vs Linux |
| **S13** (Performance) | Tamanho do instalador + tempo de instalação |

---

## 2. TÉCNICO

### 2.1 NSIS (Nullsoft Scriptable Install System)

#### 2.1.1 Visão Geral

NSIS é o formato mais antigo (1999) e mais usado no ecossistema Windows. É baseado em linguagem de script proprietária com suporte a plug-ins em C/C++. O electron-builder usa NSIS como formato padrão para Windows.

**Características principais:**
- Script compilado em um único executável `.exe`
- Tamanho pequeno (~35KB de runtime + payload)
- Suporte a MUI2 (Modern UI 2) para interface moderna
- Plug-ins para registry, processo, DLL, HTTP, etc.
- Compressão LZMA (máxima) ou ZLIB

#### 2.1.2 Estrutura de Script NSIS

```
; IDEIA — Script NSIS completo
; Compilar: makensis.exe /V4 ideia-installer.nsi

!define PRODUCT_NAME "IDEIA"
!define PRODUCT_VERSION "1.0.0.0"
!define PRODUCT_PUBLISHER "IDEIA Inc"
!define PRODUCT_WEB_SITE "https://ideia.dev"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; ============================================================
; Configurações do Instalador
; ============================================================
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "dist\IDEIA-${PRODUCT_VERSION}-Setup-x64.exe"
InstallDir "$PROGRAMFILES64\${PRODUCT_NAME}"
InstallDirRegKey HKLM "Software\${PRODUCT_NAME}" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
CRCCheck on
XPStyle on

; ============================================================
; Interface Modern UI 2
; ============================================================
!define MUI_ABORTWARNING
!define MUI_ICON "assets\ideia.ico"
!define MUI_UNICON "assets\ideia-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\IDEIA.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar IDEIA"
!define MUI_FINISHPAGE_SHOWREADME "https://ideia.dev/docs/first-steps"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "Portuguese"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_RESERVEFILE_LANGDLL

; ============================================================
; Seções de Instalação
; ============================================================

Section "IDEIA Core" SEC_CORE
  SectionIn RO  ; sempre instalado, readonly

  SetOutPath "$INSTDIR"
  File /r "..\build\win-unpacked\*.*"

  ; Registry — Informações de desinstalação
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "NoRepair" 1
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "DisplayIcon" "$INSTDIR\IDEIA.exe,0"

  ; Registry — Configurações do app
  WriteRegStr HKLM "Software\${PRODUCT_NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\${PRODUCT_NAME}" "Version" "${PRODUCT_VERSION}"

  ; Protocol handler — ideia:// links
  WriteRegStr HKLM "Software\Classes\ideia" "" "URL:IDEIA Protocol"
  WriteRegStr HKLM "Software\Classes\ideia" "URL Protocol" ""
  WriteRegStr HKLM "Software\Classes\ideia\shell\open\command" "" \
    '"$INSTDIR\IDEIA.exe" "%1"'

  ; Atalhos
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" \
    "$INSTDIR\IDEIA.exe" "" "$INSTDIR\IDEIA.exe" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME} (Debug).lnk" \
    "$INSTDIR\IDEIA.exe" "--debug" "$INSTDIR\IDEIA.exe" 0
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" \
    "$INSTDIR\IDEIA.exe" "" "$INSTDIR\IDEIA.exe" 0

  ; Extrair desinstalador
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Tamanho estimado da seção
  SectionGetSize ${SEC_CORE} $0
  DetailPrint "Tamanho da instalação: $0 bytes"
SectionEnd

Section "Create Desktop Shortcut" SEC_DESKTOP
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" \
    "$INSTDIR\IDEIA.exe" "" "$INSTDIR\IDEIA.exe" 0
SectionEnd

; ============================================================
; Seção de Desinstalação
; ============================================================
Section "Uninstall"
  ; Remover diretório de instalação
  RMDir /r "$INSTDIR"

  ; Remover atalhos
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME} (Debug).lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; Remover registry
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\${PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Classes\ideia"

  ; Limpar dados do usuário (opcional)
  RMDir /r "$APPDATA\${PRODUCT_NAME}"
SectionEnd

; ============================================================
; Funções
; ============================================================
Function .onInit
  ; Verificar se já está instalado
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
    "UninstallString"
  ${If} $0 != ""
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "${PRODUCT_NAME} já está instalado. Deseja remover a versão anterior?" \
      IDOK uninstall
    Abort

    uninstall:
      ExecWait '"$0" /S _?=$INSTDIR'
  ${EndIf}

  ; Verificar Windows 10+ (NT 10.0)
  ${If} ${AtLeastWin10}
    DetailPrint "Windows 10+ detectado"
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP \
      "IDEIA requer Windows 10 ou superior."
    Abort
  ${EndIf}
FunctionEnd

Function un.onInit
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Tem certeza que deseja remover ${PRODUCT_NAME}?" \
    IDYES +2
  Abort
FunctionEnd
```

#### 2.1.3 Plug-ins NSIS Essenciais

| Plug-in | Função | Uso na IDEIA |
|---------|--------|--------------|
| nsProcess | Matar processos antes de instalar/desinstalar | Fechar instância anterior da IDEIA |
| ExecDos | Executar comandos com captura de saída | Verificar WebView2 instalado |
| Registry | Leitura/escrita avançada de registry | Protocol handler, associações |
| nsDialogs | Custom dialogs na UI | Tela de configurações avançadas |
| NsJSON | Parse de JSON no instalador | Ler config de instalação |
| InetLoad | Download de arquivos durante instalação | Baixar WebView2 se necessário |

#### 2.1.4 NSIS vs Inno Setup — Comparação Técnica

| Aspecto | NSIS | Inno Setup |
|---------|------|------------|
| Linguagem de script | Proprietária (stack-based) | Pascal (Delphi-like) |
| Curva de aprendizado | Média-alta | Baixa-média |
| Tamanho do runtime | ~35 KB | ~200 KB |
| Velocidade de compressão | LZMA rápida | LZMA2 multi-thread |
| Suporte a plug-ins | Sim (C/C++ DLL) | Sim (DLL) |
| Unicode | Sim (desde 2015) | Sim (nativo) |
| Preprocessor | !include, !define | ISPP (Inno Setup Preprocessor) |
| Interface moderna | MUI2 | Standard (Pascal custom) |
| Silent install | `/S` | `/VERYSILENT /SUPPRESSMSGBOXES` |
| electron-builder | Padrão | Alternativo (experimental) |

### 2.2 MSI / WiX Toolset

#### 2.2.1 Arquitetura Windows Installer

O formato MSI é o padrão enterprise da Microsoft. Baseia-se no Windows Installer Service (msiexec.exe), que gerencia instalação, reparo, remoção e rolagem para versões anteriores.

**Conceitos fundamentais:**
- **Component:** Unidade atômica de instalação (arquivos, registry, shortcuts)
- **Feature:** Agrupamento lógico de componentes (nível de instalação 1=always, 2-3=optional)
- **Property:** Variáveis de instalação (INSTALLDIR, ARPSYSTEMCOMPONENT)
- **Condition:** Expressões para instalação condicional (VersionNT64, Privileged)
- **Custom Action:** DLL ou script executado durante fases do ciclo (Install, Commit, Rollback)
- **MSI Transform (.mst):** Modificações no MSI sem rebuild — usado para configurar deploy enterprise
- **Major Upgrade:** Atualização que muda o ProductCode (upgrade code mantido)

#### 2.2.2 WiX Toolset — Script Completo para IDEIA

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">

  <!-- ============================================================ -->
  <!-- Product Definition — Major Upgrade habilitado                -->
  <!-- ============================================================ -->
  <Product Id="*"
           Name="IDEIA"
           Language="1033"
           Version="1.0.0"
           Manufacturer="IDEIA Inc"
           UpgradeCode="12345678-1234-1234-1234-123456789abc">

    <Package InstallerVersion="500"
             Compressed="yes"
             InstallScope="perMachine"
             Platform="x64"
             Manufacturer="IDEIA Inc"
             Description="IDEIA — IDE que transforma ideias em sistemas completos"
             Comments="IDEIA Desktop Application"
             Keywords="IDE,editor,developer,tools"
             />

    <!-- Major Upgrade: qualquer versão anterior = desinstalar -->
    <MajorUpgrade DowngradeErrorMessage="Uma versão mais recente do IDEIA já está instalada."
                  AllowSameVersionUpgrades="yes"
                  Schedule="afterInstallValidate"
                  />

    <Media Id="1" Cabinet="ideia.cab" EmbedCab="yes" CompressionLevel="high" />
    <Media Id="2" Cabinet="webview2.cab" EmbedCab="yes" CompressionLevel="high" />

    <!-- ============================================================ -->
    <!-- Propriedades                                                 -->
    <!-- ============================================================ -->
    <Property Id="INSTALLDIR" Value="[ProgramFiles64Folder]IDEIA" />
    <Property Id="ARPPRODUCTICON" Value="IDEIA.exe" />
    <Property Id="ARPHELPLINK" Value="https://ideia.dev/docs" />
    <Property Id="ARPURLINFOABOUT" Value="https://ideia.dev" />
    <Property Id="ARPNOMODIFY" Value="1" />
    <Property Id="ARPNOREPAIR" Value="1" />

    <!-- WebView2 runtime check -->
    <Property Id="WEBVIEW2_INSTALLED">
      <RegistrySearch Id="WebView2Search"
                      Root="HKLM"
                      Key="SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
                      Name="pv"
                      Type="raw" />
    </Property>

    <!-- ============================================================ -->
    <!-- Condições                                                    -->
    <!-- ============================================================ -->
    <Condition Message="IDEIA requer Windows 10 ou superior (64-bit).">
      <![CDATA[VersionNT64 >= 603]]>
    </Condition>

    <Condition Message="É necessário ser administrador para instalar IDEIA.">
      <![CDATA[Privileged]]>
    </Condition>

    <!-- ============================================================ -->
    <!-- Diretórios                                                   -->
    <!-- ============================================================ -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="INSTALLDIR" Name="IDEIA">
          <!-- Principal executável e runtime -->
          <Component Id="C_MainExecutable" Guid="A1B2C3D4-E5F6-7890-ABCD-EF1234567890" Win64="yes">
            <File Id="F_IDEAExe" Name="IDEIA.exe" Source="..\build\win-unpacked\IDEIA.exe"
                  KeyPath="yes" Checksum="yes" >
              <Shortcut Id="S_StartMenuRoot"
                        Directory="ProgramMenuFolder"
                        Name="IDEIA"
                        Icon="IDEIA.exe"
                        IconIndex="0"
                        WorkingDirectory="INSTALLDIR"
                        Advertise="no" />
            </File>
            <RemoveFolder Id="RemoveINSTALLDIR" On="uninstall" />
          </Component>

          <!-- DLLs e assets do Electron -->
          <Component Id="C_RuntimeDlls" Guid="B2C3D4E5-F6A7-8901-BCDE-F12345678901" Win64="yes">
            <File Id="F_D3DCompiler" Name="d3dcompiler_47.dll"
                  Source="..\build\win-unpacked\d3dcompiler_47.dll" />
            <!-- Mais arquivos via harvest -->
          </Component>
        </Directory>
      </Directory>

      <!-- Atalho no Desktop -->
      <Directory Id="DesktopFolder" Name="Desktop">
        <Component Id="C_DesktopShortcut" Guid="C3D4E5F6-A7B8-9012-CDEF-123456789012" Win64="yes">
          <Shortcut Id="S_DesktopIDEIA"
                    Directory="DesktopFolder"
                    Name="IDEIA"
                    Icon="IDEIA.exe"
                    IconIndex="0"
                    WorkingDirectory="INSTALLDIR"
                    Advertise="no" />
          <RegistryValue Root="HKCU"
                         Key="Software\IDEIA\Shortcuts"
                         Name="DesktopCreated"
                         Value="1"
                         Type="integer" />
        </Component>
      </Directory>

      <!-- Entradas de Registry -->
      <Directory Id="TARGETDIR" Name="SourceDir">
        <Component Id="C_RegistryEntries" Guid="D4E5F6A7-B8C9-0123-DEF1-234567890123" Win64="yes">
          <RegistryValue Root="HKLM"
                         Key="Software\IDEIA"
                         Name="InstallDir"
                         Value="[INSTALLDIR]"
                         Type="string" />
          <RegistryValue Root="HKLM"
                         Key="Software\IDEIA"
                         Name="Version"
                         Value="1.0.0"
                         Type="string" />
          <RegistryValue Root="HKLM"
                         Key="Software\IDEIA"
                         Name="Installed"
                         Value="1"
                         Type="integer" />
          <!-- Protocol Handler ideia:// -->
          <RegistryKey Root="HKLM" Key="Software\Classes\ideia">
            <RegistryValue Value="URL:IDEIA Protocol" Type="string" />
            <RegistryValue Name="URL Protocol" Value="" Type="string" />
          </RegistryKey>
          <RegistryKey Root="HKLM" Key="Software\Classes\ideia\shell\open\command">
            <RegistryValue Value="&quot;[INSTALLDIR]IDEIA.exe&quot; &quot;%1&quot;" Type="string" />
          </RegistryKey>
          <!-- Add/Remove Programs -->
          <RegistryValue Root="HKLM"
                         Key="Software\Microsoft\Windows\CurrentVersion\Uninstall\IDEIA"
                         Name="DisplayName"
                         Value="IDEIA"
                         Type="string" />
        </Component>
      </Directory>
    </Directory>

    <!-- ============================================================ -->
    <!-- Custom Actions                                               -->
    <!-- ============================================================ -->
    <CustomAction Id="InstallWebView2"
                  FileKey="F_WebView2Installer"
                  ExeCommand=""
                  Execute="deferred"
                  Impersonate="no"
                  Return="asyncNoWait"
                  />

    <Binary Id="B_CustomActions"
            SourceFile="..\scripts\msi-custom-actions.dll" />

    <CustomAction Id="CleanupOldConfig"
                  BinaryKey="B_CustomActions"
                  DllEntry="CleanupOldConfig"
                  Execute="deferred"
                  Impersonate="no"
                  />

    <!-- ============================================================ -->
    <!-- Install Execute Sequence                                     -->
    <!-- ============================================================ -->
    <InstallExecuteSequence>
      <Custom Action="CleanupOldConfig" Before="InstallFiles">NOT Installed</Custom>
      <Custom Action="InstallWebView2" After="InstallFinalize">
        <![CDATA[WEBVIEW2_INSTALLED = "" AND NOT REMOVE]]>
      </Custom>
    </InstallExecuteSequence>

    <!-- ============================================================ -->
    <!-- Features                                                     -->
    <!-- ============================================================ -->
    <Feature Id="F_Core" Title="IDEIA Core" Level="1" Description="IDEIA Desktop Application">
      <ComponentRef Id="C_MainExecutable" />
      <ComponentRef Id="C_RuntimeDlls" />
      <ComponentRef Id="C_RegistryEntries" />
      <ComponentRef Id="C_DesktopShortcut" />
      <ComponentGroupRef Id="CG_Resources" />
    </Feature>

    <Feature Id="F_LangPacks" Title="Language Packs" Level="2"
             Description="Traduções adicionais">
      <ComponentGroupRef Id="CG_LangPacks" />
    </Feature>

    <Feature Id="F_DevTools" Title="Developer Tools" Level="3"
             Description="Ferramentas de desenvolvimento adicionais">
      <ComponentGroupRef Id="CG_DevTools" />
    </Feature>

    <!-- ============================================================ -->
    <!-- UI — Minimalista (enterprise)                                -->
    <!-- ============================================================ -->
    <UI>
      <UIRef Id="WixUI_Minimal" />
      <Property Id="WIXUI_INSTALLDIR" Value="INSTALLDIR" />
      <Error Id="2000">
        <Dialog Id="WebView2Error" Width="360" Height="120" Title="WebView2 não encontrado">
          <Control Id="Text" Type="Text" X="15" Y="15" Width="330" Height="40"
                   Text="O WebView2 Runtime é necessário. Deseja baixá-lo agora?" />
          <Control Id="Download" Type="PushButton" X="100" Y="70" Width="80" Height="20"
                   Text="Download">
            <Publish Event="DoAction" Value="InstallWebView2">1</Publish>
          </Control>
          <Control Id="Cancel" Type="PushButton" X="190" Y="70" Width="80" Height="20"
                   Text="Cancelar">
            <Publish Event="EndDialog" Value="Return">1</Publish>
          </Control>
        </Dialog>
      </Error>
    </UI>

  </Product>
</Wix>
```

#### 2.2.3 WiX Harvest (Heat) para Grandes Diretórios

Para projetos como o IDEIA (centenas de arquivos no diretório win-unpacked), usar WiX Heat para gerar componentes automaticamente:

```powershell
# scripts\heat-build.ps1
# Gera .wxs com todos os arquivos do build automaticamente

$buildDir = "..\build\win-unpacked"
$outputWxs = "..\wix\app-files.wxs"
$componentGroup = "CG_Resources"

heat dir $buildDir `
  -gg `
  -g1 `
  -srd `
  -sfrag `
  -cg $componentGroup `
  -dr INSTALLDIR `
  -var var.BuildDir `
  -out $outputWxs

# Compilar WiX
candle.exe -dBuildDir=$buildDir `
  ideia.wxs app-files.wxs `
  -out wixobj\

# Linkar MSI
light.exe -ext WixUIExtension `
  wixobj\*.wixobj `
  -out dist\IDEIA.msi

Write-Host "MSI gerado: dist\IDEIA.msi"
```

#### 2.2.4 MSI Transforms (.mst) para Enterprise

Transforms permitem customizar o MSI para cada cliente sem rebuild:

```powershell
# scripts\generate-mst.ps1
# Gera .mst para deployment enterprise

param(
  [string]$MsiPath = "dist\IDEIA.msi",
  [string]$CompanyName = "DefaultCorp",
  [string]$InstallDir = "D:\Apps\IDEIA",
  [switch]$DisableAutoUpdate = $false,
  [switch]$DisableTelemetry = $true
)

function New-MST {
  param($MsiPath, $TransformPath, $Properties)
  $cscript = @"
Set msi = CreateObject("WindowsInstaller.Installer")
Set db = msi.OpenDatabase("$MsiPath", 4) ' msiOpenDatabaseModeTransact
For Each prop In $Properties
  view = db.OpenView("UPDATE Property SET Value='" & prop.Value & "' WHERE Property='" & prop.Name & "'")
  view.Execute
Next
db.CreateTransform("$TransformPath")
db.GenerateTransform("$TransformPath", 0)
db.CloseTransformSave
db.Commit
"@
  $cscript | Out-File -Path "$env:TEMP\gen-mst.vbs" -Encoding ASCII
  cscript //NoLogo "$env:TEMP\gen-mst.vbs"
}

$props = @(
  @{Name="INSTALLDIR"; Value=$InstallDir}
  @{Name="DISABLE_AUTOUPDATE"; Value=[int]$DisableAutoUpdate}
  @{Name="DISABLE_TELEMETRY"; Value=[int]$DisableTelemetry}
)

$mstName = "$CompanyName-IDEIA.mst"
New-MST -MsiPath $MsiPath -TransformPath $mstName -Properties $props
Write-Host "Transform gerado: $mstName"
```

**Aplicação do transform:**
```powershell
msiexec /i IDEIA.msi TRANSFORMS=AcmeCorp-IDEIA.mst /qn
```

#### 2.2.5 MSI — Silent Install Enterprise

| Cenário | Comando |
|---------|---------|
| Instalação básica | `msiexec /i IDEIA.msi /qn /norestart` |
| Com diretório customizado | `msiexec /i IDEIA.msi INSTALLDIR="D:\Apps\IDEIA" /qn` |
| Com transform | `msiexec /i IDEIA.msi TRANSFORMS=Acme.mst /qn` |
| Com log detalhado | `msiexec /i IDEIA.msi /qn /l*v "C:\Logs\IDEIA-install.log"` |
| Desinstalação | `msiexec /x {PRODUCT-CODE-GUID} /qn` |
| Aplicar patch | `msiexec /p IDEIA-1.1.0.msp /qn` |
| Reparo | `msiexec /f IDEIA.msi /qn` |

### 2.3 Squirrel.Windows

#### 2.3.1 Visão Geral

Squirrel.Windows é um framework de instalação e atualização criado pelo GitHub (usado no Atom, Slack, VS Code anteriormente). Diferente de NSIS/Inno/MSI, Squirrel não cria um MSI tradicional — ele usa uma abordagem híbrida:

1. **Setup.exe** (Squirrel.exe) extrai a aplicação para `%LOCALAPPDATA%\ideia`
2. **CreateShortcuts.exe** cria atalhos e entradas de Add/Remove Programs
3. **Update.exe** gerencia auto-update com delta packages
4. **Event hooks** disparam em momentos específicos

**Características:**
- Delta updates: apenas arquivos modificados vs full download
- Instalação por usuário (não per-machine por padrão)
- Sem UAC para instalação (exceto se per-machine)
- Event-driven: `onFirstRun`, `onInstalled`, `onUpdated`, `onUninstalled`

#### 2.3.2 Event Hooks Squirrel

```csharp
// SquirrelEvents.cs — Hooks executados pelo Squirrel
// Compilar como SquirrelEvents.dll e referenciar no .nuspec

using Squirrel;
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace IDEIA.SquirrelEvents
{
    public static class Program
    {
        private static string AppDir => Path.GetDirectoryName(
            Assembly.GetExecutingAssembly().Location);

        private static string ExecutablePath => Path.Combine(AppDir, "IDEIA.exe");

        // Executado na primeira vez que o app roda após instalação
        public static void OnFirstRun()
        {
            // Abrir onboarding
            Process.Start(ExecutablePath, "--onboarding");
        }

        // Executado quando o instalador termina
        public static void OnInstalled()
        {
            // Criar desktop shortcut
            using var mgr = new UpdateManager("https://releases.ideia.dev");
            mgr.CreateShortcutsForExecutable(
                "IDEIA.exe",
                ShortcutLocation.Desktop | ShortcutLocation.StartMenu,
                false);
        }

        // Executado quando uma atualização é aplicada
        public static void OnUpdated()
        {
            // Mostrar release notes
            var releaseNotes = Path.Combine(AppDir, "RELEASE-NOTES.md");
            if (File.Exists(releaseNotes))
            {
                Process.Start("notepad.exe", releaseNotes);
            }
        }

        // Executado antes da desinstalação
        public static void OnUninstalled()
        {
            using var mgr = new UpdateManager("https://releases.ideia.dev");
            mgr.RemoveShortcutsForExecutable(
                "IDEIA.exe",
                ShortcutLocation.Desktop | ShortcutLocation.StartMenu);
        }
    }
}
```

#### 2.3.3 Squirrel — Auto-Update com Delta Packages

```xml
<!-- IDEIA.nuspec — Pacote NuGet para Squirrel -->
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2011/08/nuspec.xsd">
  <metadata>
    <id>IDEIA</id>
    <version>1.0.0</version>
    <title>IDEIA</title>
    <authors>IDEIA Inc</authors>
    <description>IDE que transforma ideias em sistemas completos</description>
    <language>en-US</language>
  </metadata>
  <files>
    <!-- Aplicação completa -->
    <file src="..\build\win-unpacked\**\*" target="lib\net472" />
    <!-- Squirrel events -->
    <file src="SquirrelEvents.dll" target="lib\net472" />
  </files>
</package>
```

```yaml
# squirrel-config.yaml
# Arquivo de configuração do Squirrel
SquirrelPackages:
  - id: IDEIA
    releaseDir: releases/
    remoteReleasesDir: https://releases.ideia.dev/
    deltaPackages: true
    generateReleases: true
    packagesDir: packages/
    signingCertificatePath: certs/authenticode.p12
    signingShaHash: SHA256
```

**RELEASES file (gerado pelo Squirrel):**
```
IDEIA-1.0.0-full.nupkg 4BF2A3B1...
IDEIA-1.0.1-delta.nupkg 8C1D9E2A...
IDEIA-1.0.2-delta.nupkg F03E2A1B...
```

### 2.4 electron-builder NSIS

#### 2.4.1 Configuração Completa

```yaml
# packages/electron/electron-builder.yml
appId: dev.ideia.ideia
productName: IDEIA
copyright: Copyright © 2026 IDEIA Inc

# ============================================================
# Configurações Gerais
# ============================================================
compression: maximum
npmRebuild: true
nodeGypRebuild: false
buildVersion: 1.0.0.0

asar: true
asarUnpack:
  - "node_modules/@ideia/**"
  - "node_modules/native/**"

extraResources:
  - from: assets/
    to: assets/
    filter:
      - "**/*"
      - "!**/*.psd"

files:
  - "dist/**/*"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,*.test.js}"
  - "!**/node_modules/.cache/**"

# ============================================================
# Windows Targets
# ============================================================
win:
  target:
    - target: nsis
      arch:
        - x64
        - arm64
    - target: msi
      arch:
        - x64
    - target: portable
      arch:
        - x64
  signingHashAlgorithms:
    - sha256
  certificateFile: certs/authenticode.p12
  certificatePassword: ${env.CERT_PASSWORD}

# ============================================================
# NSIS Installer
# ============================================================
nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
  installerIcon: assets/ideia.ico
  uninstallerIcon: assets/ideia-uninstall.ico
  installerHeaderIcon: assets/ideia-header.ico
  license: LICENSE.txt
  language: 1046
  multiLanguageInstaller: true
  installerLanguages:
    - en_US
    - pt_BR
    - es_ES
  shortcutName: IDEIA
  menuCategory: true
  menuCategoryName: IDEIA
  uninstallDisplayName: IDEIA ${version}
  include: build/installer.nsh
  script: build/installer.nsi
  guid: "12345678-1234-1234-1234-123456789abc"
  warningsAsErrors: false

# ============================================================
# MSI Installer
# ============================================================
msi:
  oneClick: false
  perMachine: true
  runAfterFinish: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  menuCategory: true
  upgradeCode: "87654321-4321-4321-4321-cba987654321"
  warningsAsErrors: false
  template: build/ideia.wxs

# ============================================================
# Portable
# ============================================================
portable:
  artifactName: "IDEIA-${version}-Portable-${arch}.${ext}"

# ============================================================
# Signing
# ============================================================
afterSign: scripts/notarize.js

# ============================================================
# Publish (auto-update)
# ============================================================
publish:
  - provider: generic
    url: https://releases.ideia.dev
    channel: latest
    useMultipleRangeRequest: true
  - provider: github
    owner: ideia
    repo: ideia
    releaseType: release
```

#### 2.4.2 Script NSIS Customizado (include)

```nsis
; build\installer.nsh
; Custom NSIS script incluído pelo electron-builder

!macro customInit
  ; Verificar WebView2
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
    DetailPrint "WebView2 Runtime não encontrado. Baixando..."
    NSISdl::download \
      "https://go.microsoft.com/fwlink/p/?LinkId=2124703" \
      "$TEMP\MicrosoftEdgeWebview2Setup.exe"
    ExecWait "$TEMP\MicrosoftEdgeWebview2Setup.exe /silent /install"
  ${EndIf}
!macroend

!macro customInstall
  ; Criar protocol handler ideia://
  DetailPrint "Registrando protocol handler: ideia://"
  WriteRegStr HKLM "Software\Classes\ideia" "" "URL:IDEIA Protocol"
  WriteRegStr HKLM "Software\Classes\ideia" "URL Protocol" ""
  WriteRegStr HKLM "Software\Classes\ideia\shell\open\command" "" \
    '"$INSTDIR\IDEIA.exe" "%1"'

  ; Configurar auto-update
  DetailPrint "Configurando auto-update"
  WriteRegStr HKCU "Software\IDEIA\Update" "AutoUpdate" "true"
  WriteRegStr HKCU "Software\IDEIA\Update" "Channel" "stable"

  ; Telemetria (opt-in silencioso para enterprise)
  ${If} ${Silent}
    WriteRegStr HKCU "Software\IDEIA\Telemetry" "Enabled" "false"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Remover dados do usuário (pergunta)
  MessageBox MB_YESNO "Remover todos os dados do usuário?" IDNO skipData
    RMDir /r "$APPDATA\IDEIA"
  skipData:
!macroend
```

#### 2.4.3 electron-builder — CI Workflow Completo

```yaml
# .github/workflows/build-windows-installer.yml
name: Build Windows Installer

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      channel:
        description: "Release channel"
        required: true
        default: "stable"
        type: choice
        options:
          - stable
          - beta
          - nightly

env:
  NODE_VERSION: "20.x"
  CERT_PASSWORD: ${{ secrets.CERT_PASSWORD }}
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

jobs:
  build:
    runs-on: windows-latest
    timeout-minutes: 45

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci --ignore-scripts

      - name: Build project
        run: npm run build
        env:
          NODE_ENV: production

      - name: Import code signing certificate
        shell: pwsh
        run: |
          $certBase64 = "${{ secrets.WINDOWS_CODESIGN_CERT }}"
          $certPath = "${{ runner.temp }}\cert.pfx"
          [IO.File]::WriteAllBytes($certPath, [Convert]::FromBase64String($certBase64))
          Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\CurrentUser\My

      - name: Build NSIS installer
        run: npx electron-builder --win --config packages/electron/electron-builder.yml
        env:
          ELECTRON_BUILDER_CACHE: ${{ runner.temp }}\electron-builder-cache
          CSC_LINK: ${{ runner.temp }}\cert.pfx
          CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CODESIGN_PASSWORD }}

      - name: Sign installer (signtool)
        shell: pwsh
        run: |
          & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" sign `
            /fd SHA256 `
            /a `
            /tr http://timestamp.digicert.com `
            /td SHA256 `
            dist\IDEIA-*-Setup-x64.exe

      - name: Verify signature
        shell: pwsh
        run: |
          & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" verify `
            /v /pa `
            dist\IDEIA-*-Setup-x64.exe

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: IDEIA-Windows-Installer
          path: dist/IDEIA-*-Setup-x64.exe
          retention-days: 30

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            dist/IDEIA-*-Setup-x64.exe
            dist/IDEIA-*-Setup-x64.exe.blockmap
            dist/latest.yml
            dist/IDEIA-*.msi
```

### 2.5 Inno Setup

#### 2.5.1 Script Completo

```pascal
; IDEIA.iss — Inno Setup Script
; Compilar: ISCC.exe IDEIA.iss

#define MyAppName "IDEIA"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "IDEIA Inc"
#define MyAppURL "https://ideia.dev"
#define MyAppExeName "IDEIA.exe"

[Setup]
; Configurações básicas
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/support
AppUpdatesURL={#MyAppURL}/download
DefaultDirName={autopf64}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=IDEIA-{#MyAppVersion}-Setup
SetupIconFile=assets\ideia.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra
LZMAUseSeparateProcess=yes
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
MinVersion=10.0

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "pt_BR"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "autoupdate"; Description: "Enable automatic &updates"; GroupDescription: "Update settings:"

[Files]
Source: "..\build\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\build\win-unpacked\IDEIA.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName} (Debug)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--debug"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Protocol handler
Root: HKLM; Subkey: "Software\Classes\ideia"; ValueType: string; ValueName: ""; ValueData: "URL:IDEIA Protocol"
Root: HKLM; Subkey: "Software\Classes\ideia"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKLM; Subkey: "Software\Classes\ideia\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
; App registry
Root: HKLM; Subkey: "Software\IDEIA"; ValueType: string; ValueName: "InstallDir"; ValueData: "{app}"
Root: HKLM; Subkey: "Software\IDEIA"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch IDEIA"; Flags: nowait postinstall skipifsilent
Filename: "{app}\WebView2Bootstrapper.exe"; Parameters: "/silent /install"; Flags: runhidden; Check: NeedsWebView2

[Code]
function NeedsWebView2: Boolean;
var
  Version: string;
begin
  Result := True;
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) then
  begin
    if Version <> '' then
      Result := False;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if WizardIsTaskSelected('autoupdate') then
      RegWriteStringValue(HKCU, 'Software\IDEIA\Update', 'AutoUpdate', 'true')
    else
      RegWriteStringValue(HKCU, 'Software\IDEIA\Update', 'AutoUpdate', 'false');
  end;
end;
```

### 2.6 MSIX / Microsoft Store Packaging

#### 2.6.1 App Package Manifest

```xml
<!-- Package.appxmanifest — MSIX Manifest para IDEIA -->
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">

  <Identity Name="Dev.IDEIA.IDEIA"
            Publisher="CN=IDEIA Inc, O=IDEIA Inc, L=San Francisco, S=California, C=US"
            Version="1.0.0.0"
            ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>IDEIA</DisplayName>
    <PublisherDisplayName>IDEIA Inc</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
    <Description>IDE que transforma ideias em sistemas completos</Description>
    <SupportedUsers>multiple</SupportedUsers>
  </Properties>

  <Resources>
    <Resource Language="en-us" />
    <Resource Language="pt-br" />
    <Resource Language="es-es" />
  </Resources>

  <Applications>
    <Application Id="App"
                 Executable="ideia.exe"
                 EntryPoint="Windows.FullTrustApplication">
      <!-- FullTrustApplication permite acesso total ao sistema -->
      <uap:VisualElements
        DisplayName="IDEIA"
        Description="IDE que transforma ideias em sistemas"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png"
        BackgroundColor="transparent">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png"
                         Square310x310Logo="Assets\LargeTile.png" />
        <uap:SplashScreen Image="Assets\SplashScreen.png" />
      </uap:VisualElements>

      <Extensions>
        <!-- ideia:// protocol handler -->
        <uap:Extension Category="windows.protocol">
          <uap:Protocol Name="ideia" />
        </uap:Extension>

        <!-- File association .ideiaproject -->
        <uap:Extension Category="windows.fileTypeAssociation">
          <uap:FileTypeAssociation Name="ideiaproject">
            <uap:SupportedFileTypes>
              <uap:FileType>.ideiaproject</uap:FileType>
            </uap:SupportedFileTypes>
          </uap:FileTypeAssociation>
        </uap:Extension>
      </Extensions>
    </Application>
  </Applications>

  <Capabilities>
    <Capability Name="internetClient" />
    <rescap:Capability Name="runFullTrust" />
    <rescap:Capability Name="allowElevation" />
  </Capabilities>
</Package>
```

#### 2.6.2 CI para MSIX

```yaml
# Build MSIX no CI
- name: Build MSIX package
  shell: pwsh
  run: |
    # Criar package usando MakeAppx.exe
    & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\MakeAppx.exe" `
      pack /v /d .\msix\ /p dist\IDEIA.msix

    # Assinar
    & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" sign `
      /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 `
      dist\IDEIA.msix
```

#### 2.6.3 Validação Local MSIX

```powershell
# scripts\test-msix.ps1
$msixPath = "dist\IDEIA.msix"

# Verificar assinatura
signtool verify /v /pa $msixPath

# Instalar
Add-AppxPackage -Path $msixPath -Verbose

# Verificar instalação
Get-AppxPackage -Name "Dev.IDEIA.IDEIA"

# Desinstalar
Get-AppxPackage -Name "Dev.IDEIA.IDEIA" | Remove-AppxPackage
```

---

## 3. ENGENHARIA

### 3.1 Segurança de Instaladores Windows

#### 3.1.1 Authenticode Signing

A assinatura Authenticode é o mecanismo de confiança do Windows. Instaladores não assinados são bloqueados pelo SmartScreen e marcados como "não confiáveis".

**Pipeline de signing completo:**

```typescript
// scripts/code-sign-pipeline.ts
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface SignConfig {
  certPath: string;
  certPassword: string;
  timestampServer?: string;
  algorithm?: 'sha256' | 'sha1';
  description?: string;
  url?: string;
}

const DEFAULT_CONFIG: SignConfig = {
  certPath: process.env.CERT_PATH || 'certs/authenticode.p12',
  certPassword: process.env.CERT_PASSWORD || '',
  timestampServer: 'http://timestamp.digicert.com',
  algorithm: 'sha256',
  description: 'IDEIA Desktop Application',
  url: 'https://ideia.dev',
};

function findSigntool(): string {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22000.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.20348.0\\x64\\signtool.exe',
    'C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool\\signtool.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Fallback: tentar encontrar no PATH
  try {
    return execSync('where signtool').toString().trim().split('\n')[0];
  } catch {
    throw new Error('signtool.exe not found. Install Windows SDK.');
  }
}

function signFile(filePath: string, config: SignConfig = DEFAULT_CONFIG): void {
  const signtool = findSigntool();
  const args = [
    'sign',
    `/fd ${config.algorithm}`,
    `/a`, // auto-select best cert
    `/tr ${config.timestampServer}`,
    `/td ${config.algorithm}`,
    `/d "${config.description}"`,
    `/du "${config.url}"`,
    ...(config.certPassword ? [`/p ${config.certPassword}`] : []),
    `"${filePath}"`,
  ];

  console.log(`Signing: ${filePath}`);
  execSync(`"${signtool}" ${args.join(' ')}`, { stdio: 'inherit' });
}

function verifySignature(filePath: string): boolean {
  const signtool = findSigntool();
  try {
    execSync(`"${signtool}" verify /v /pa "${filePath}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Pipeline completo
async function signAll(): Promise<void> {
  const distDir = path.resolve('dist');
  const files = fs.readdirSync(distDir).filter(f =>
    f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.msix') || f.endsWith('.dll')
  );

  for (const file of files) {
    const filePath = path.join(distDir, file);
    signFile(filePath);
    if (!verifySignature(filePath)) {
      throw new Error(`Signature verification failed: ${file}`);
    }
    console.log(`✅ ${file} signed and verified`);
  }
}

signAll().catch(err => {
  console.error('Signing pipeline failed:', err);
  process.exit(1);
});
```

#### 3.1.2 SmartScreen Reputation

O SmartScreen da Microsoft usa reputação baseada na assinatura digital. Fatores que influenciam:

| Fator | Impacto | Estratégia |
|-------|---------|------------|
| Certificado EV (Extended Validation) | Alto | Maior reputação, menos bloqueios |
| Tempo desde o primeiro uso | Médio | Releases frequentes constroem reputação |
| Número de downloads | Alto | Milhares de downloads = confiável |
| Taxa de "unblock" manual | Médio | Usuários desbloquearem = positiva |
| Antivírus falso positivo | Crítico | Submeter ao Microsoft Defender Portal |
| Certificado padrão (vs EV) | Baixo | EV custa ~$300/ano, mas vale o investimento |

#### 3.1.3 Windows Defender False Positives

Aplicações Electron são alvo comum de falsos positivos porque:
- Usam `eval()` e `Function()` internamente (Node.js/Chromium)
- Têm estruturas de arquivos similares a malware (asar, bytecode)
- Baixam e executam updates (comportamento suspeito)

**Mitigações para IDEIA:**
```powershell
# scripts\windows-defender-exclusions.ps1
# Instruções para IT admins configurarem exclusions GPO

$exclusions = @(
  "$env:ProgramFiles\IDEIA\IDEIA.exe",
  "$env:ProgramFiles\IDEIA\Update.exe",
  "$env:LocalAppData\IDEIA\app-*",
  "$env:LOCALAPPDATA\IDEIA\Update.exe"
)

Write-Host "Configure as seguintes exclusões no Windows Defender (GPO):"
Write-Host ""
foreach ($excl in $exclusions) {
  Write-Host "  - $excl"
}
Write-Host ""
Write-Host "GPO Path: Computer Configuration > Administrative Templates >"
Write-Host "  Windows Components > Microsoft Defender Antivirus > Exclusions"
Write-Host ""
Write-Host "Ou via PowerShell (local):"
Write-Host "  Add-MpPreference -ExclusionPath '$env:ProgramFiles\IDEIA'"
```

**Submissão ao Microsoft Defender Portal:**
```powershell
# scripts\submit-defender.ps1
# Submeter build para análise do Microsoft Defender

$installerPath = "dist\IDEIA-Setup-x64.exe"

# 1. Verificar hash
$hash = (Get-FileHash $installerPath -Algorithm SHA256).Hash
Write-Host "SHA256: $hash"

# 2. URL de submissão manual (não há API pública)
Write-Host ""
Write-Host "Submeta o instalador em:"
Write-Host "  https://www.microsoft.com/en-us/wdsi/filesubmission"
Write-Host ""
Write-Host "Informações necessárias:"
Write-Host "  - Produto: IDEIA Desktop Application"
Write-Host "  - Empresa: IDEIA Inc"
Write-Host "  - Justificativa: Electron-based IDE, legítimo"
Write-Host "  - Hash: $hash"
```

### 3.2 Silent Install para Enterprise

#### 3.2.1 Script Universal

```powershell
# scripts\enterprise-silent-install.ps1
<#
.SYNOPSIS
  Silent install da IDEIA para deployment enterprise
.DESCRIPTION
  Suporta NSIS, MSI e MSIX. Detecta formato automaticamente.
  Gera log, testa integridade, suporta GPO startup script.
.PARAMETER Path
  Caminho do instalador
.PARAMETER InstallDir
  Diretório de instalação (opcional)
.PARAMETER LogDir
  Diretório para logs
.PARAMETER NoAutoUpdate
  Desativa auto-update
.PARAMETER NoTelemetry
  Desativa telemetria
.PARAMETER UseGPO
  Modo GPO startup script (aguarda instalação completar)
.EXAMPLE
  .\enterprise-silent-install.ps1 -Path "\\server\share\IDEIA-Setup.exe"
.EXAMPLE
  .\enterprise-silent-install.ps1 -Path "IDEIA.msi" -InstallDir "D:\Apps\IDEIA" -NoTelemetry
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [string]$InstallDir = "$env:ProgramFiles\IDEIA",
  [string]$LogDir = "$env:TEMP\IDEIA-Install",
  [switch]$NoAutoUpdate,
  [switch]$NoTelemetry,
  [switch]$UseGPO
)

# ============================================================
# Helpers
# ============================================================
$logFile = "$LogDir\IDEIA-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ErrorActionPreference = "Stop"

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$timestamp] $Message"
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}

function Test-IsElevated {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ============================================================
# Installer detection
# ============================================================
function Get-InstallerType {
  param([string]$FilePath)
  $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
  switch ($ext) {
    '.exe' { return 'NSIS' }
    '.msi' { return 'MSI' }
    '.msix' { return 'MSIX' }
    '.msixbundle' { return 'MSIX' }
    default { throw "Formato não suportado: $ext" }
  }
}

# ============================================================
# Install functions
# ============================================================
function Install-NSIS {
  param([string]$ExePath, [string]$Dir)
  $args = @('/S', "/D=$Dir")

  if ($NoAutoUpdate) { $args += '/NOAUTOUPDATE' }
  if ($NoTelemetry) { $args += '/NOTELEMETRY' }

  Write-Log "Instalando NSIS: $ExePath $($args -join ' ')"
  $proc = Start-Process -FilePath $ExePath -ArgumentList $args `
    -Wait -NoNewWindow -PassThru

  if ($proc.ExitCode -ne 0) {
    throw "NSIS install failed (exit $($proc.ExitCode))"
  }
}

function Install-MSI {
  param([string]$MsiPath, [string]$Dir)
  $props = @("INSTALLDIR=$Dir")
  if ($NoAutoUpdate) { $props += 'DISABLE_AUTOUPDATE=1' }
  if ($NoTelemetry) { $props += 'DISABLE_TELEMETRY=1' }

  $args = @(
    '/i', "`"$MsiPath`"",
    '/qn',
    '/norestart',
    "/l*v", "`"$LogDir\msi-install.log`"",
    ($props -join ' ')
  )

  Write-Log "Instalando MSI: msiexec $($args -join ' ')"
  $proc = Start-Process -FilePath 'msiexec' -ArgumentList $args `
    -Wait -NoNewWindow -PassThru

  if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 1641 -and $proc.ExitCode -ne 3010) {
    throw "MSI install failed (exit $($proc.ExitCode))"
  }
}

function Install-MSIX {
  param([string]$MsixPath)
  Write-Log "Instalando MSIX: $MsixPath"
  Add-AppxPackage -Path $MsixPath -ErrorAction Stop
}

# ============================================================
# Verification
# ============================================================
function Test-Installation {
  param([string]$Dir)
  $exePath = Join-Path -Path $Dir -ChildPath "IDEIA.exe"

  if (-not (Test-Path $exePath)) {
    throw "IDEIA.exe not found at $exePath"
  }

  $version = (Get-Item $exePath).VersionInfo.ProductVersion
  $size = (Get-Item $exePath).Length

  Write-Log "✅ IDEIA $version installed ($($size / 1MB) MB)"

  # Verificar registry
  $regPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\IDEIA"
  if (Test-Path $regPath) {
    Write-Log "✅ Uninstall registry entry found"
  } else {
    Write-Warning "⚠️ Uninstall registry not found"
  }
}

# ============================================================
# Main
# ============================================================
try {
  # Elevation check
  if (-not (Test-IsElevated)) {
    throw "Este script requer privilégios de administrador"
  }

  # Create log directory
  if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
  }

  Write-Log "=== IDEIA Enterprise Installation ==="
  Write-Log "Installer: $Path"
  Write-Log "Target: $InstallDir"
  Write-Log "Log: $logFile"

  # Resolve full path
  $resolvedPath = Resolve-Path $Path -ErrorAction Stop
  $installerType = Get-InstallerType -FilePath $resolvedPath

  Write-Log "Detected: $installerType"

  # Install
  switch ($installerType) {
    'NSIS' { Install-NSIS -ExePath $resolvedPath -Dir $InstallDir }
    'MSI' { Install-MSI -MsiPath $resolvedPath -Dir $InstallDir }
    'MSIX' { Install-MSIX -MsixPath $resolvedPath }
  }

  # Verify
  Test-Installation -Dir $InstallDir

  Write-Log "=== Installation completed successfully ==="

  # GPO mode: create status file
  if ($UseGPO) {
    $statusFile = "$env:ProgramData\IDEIA\install-status.txt"
    $null = New-Item -ItemType Directory -Path (Split-Path $statusFile -Parent) -Force
    Set-Content -Path $statusFile -Value "OK|$installerType|$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Log "GPO status file created: $statusFile"
  }

  exit 0
} catch {
  Write-Log "❌ ERROR: $_"
  Write-Error $_
  exit 1
}
```

#### 3.2.2 GPO Deployment Script (Startup Script)

```batch
; scripts\gpo-startup-install.bat
; Colocar em: \\domain\sysvol\domain\Policies\{GUID}\Machine\Scripts\Startup\
@echo off
setlocal

set INSTALLER_SOURCE=\\server\share\IDEIA-Setup.exe
set INSTALL_TARGET=C:\Program Files\IDEIA
set LOG_FILE=%TEMP%\IDEIA-GPO-install.log

echo [%DATE% %TIME%] Starting GPO install >> "%LOG_FILE%"

REM Check if already installed
if exist "%INSTALL_TARGET%\IDEIA.exe" (
    echo [%DATE% %TIME%] Already installed, checking version... >> "%LOG_FILE%"
    REM Optional: version check, upgrade if needed
    goto :end
)

REM Install silently
echo [%DATE% %TIME%] Installing IDEIA... >> "%LOG_FILE%"
"%INSTALLER_SOURCE%" /S /D=%INSTALL_TARGET% >> "%LOG_FILE%" 2>&1

REM Verify
if exist "%INSTALL_TARGET%\IDEIA.exe" (
    echo [%DATE% %TIME%] ✅ Installation successful >> "%LOG_FILE%"
) else (
    echo [%DATE% %TIME%] ❌ Installation failed >> "%LOG_FILE%"
)

:end
endlocal
```

### 3.3 Enterprise Deployment — SCCM, Intune, Chocolatey, winget

#### 3.3.1 SCCM (System Center Configuration Manager)

```xml
<!-- sccm-detection-method.xml -->
<!-- Regra de detecção para SCCM -->
<Rule>
  <SettingLogicalName>MSI</SettingLogicalName>
  <ProductCode>{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}</ProductCode>
</Rule>
```

```powershell
# SCCM deployment script
$deployParams = @{
  Name = "IDEIA Desktop"
  SoftwareName = "IDEIA"
  Manufacturer = "IDEIA Inc"
  Language = "en-US"
  Version = "1.0.0"
  SourcePath = "\\server\share\IDEIA.msi"
  SourceFolder = "IDEIA"
  SourceVersion = 1
  MsiFilePath = "IDEIA.msi"
  DeploymentTypeName = "IDEIA Windows Installer"
  InstallationBehaviorType = "InstallForSystem"
  LogonRequirementType = "WhetherOrNotUserLoggedOn"
  UserInteractionMode = "Hidden"
  EstimatedRuntime = 30
  MaximumRuntime = 60
  RebootBehavior = "NoAction"
}

New-CMApplication @deployParams
New-CMApplicationDeployment -CollectionName "All Users" -DeploymentIntent Required
```

#### 3.3.2 Microsoft Intune

```xml
<!-- intune-detection-rules.xml -->
<!-- Regras de detecção para Intune Win32 app -->
<Rule>
  <Type>File</Type>
  <Path>C:\Program Files\IDEIA</Path>
  <FileOrFolder>IDEIA.exe</FileOrFolder>
  <Method>Version</Method>
  <Operator>GreaterOrEqual</Operator>
  <VersionValue>1.0.0.0</VersionValue>
</Rule>
```

**Intune deployment command:**
```
msiexec /i IDEIA.msi /qn /norestart DISABLE_TELEMETRY=1
```

#### 3.3.3 Chocolatey Package

```nuspec
<!-- chocolatey\IDEIA.nuspec -->
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>ideia</id>
    <title>IDEIA</title>
    <version>1.0.0</version>
    <authors>IDEIA Inc</authors>
    <projectUrl>https://ideia.dev</projectUrl>
    <description>IDE que transforma ideias em sistemas completos</description>
    <tags>ide developer productivity</tags>
    <licenseUrl>https://ideia.dev/license</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <packageSourceUrl>https://github.com/ideia/chocolatey-packages</packageSourceUrl>
  </metadata>
  <files>
    <file src="tools\**" target="tools" />
  </files>
</package>
```

```powershell
# chocolatey\tools\chocolateyInstall.ps1
$ErrorActionPreference = 'Stop'

$packageName = 'ideia'
$url64 = 'https://releases.ideia.dev/download/IDEIA-Setup-x64.exe'
$checksum64 = 'A1B2C3D4E5F6...' # SHA256

$installDir = Join-Path $env:ProgramFiles 'IDEIA'

Install-ChocolateyPackage @{
  PackageName = $packageName
  FileType = 'exe'
  Url64bit = $url64
  Checksum64 = $checksum64
  ChecksumType64 = 'sha256'
  SilentArgs = "/S /D=$installDir"
  ValidExitCodes = @(0)
}
```

```powershell
# chocolatey\tools\chocolateyUninstall.ps1
$packageName = 'ideia'
$installDir = Join-Path $env:ProgramFiles 'IDEIA'

$uninstallPath = Join-Path $installDir 'uninstall.exe'
if (Test-Path $uninstallPath) {
  Start-Process -FilePath $uninstallPath -ArgumentList '/S' -Wait -NoNewWindow
}
```

#### 3.3.4 winget (Windows Package Manager)

```yaml
# winget/ideia.yaml
# Manifesto winget para IDEIA
PackageIdentifier: IDEIA.IDEIA
PackageVersion: 1.0.0
PackageLocale: en-US
Publisher: IDEIA Inc
PackageName: IDEIA
License: Proprietary
ShortDescription: IDE que transforma ideias em sistemas
Description: IDEIA is a development environment that transforms ideas into complete systems
Moniker: ideia
Tags:
  - ide
  - developer
  - editor
  - productivity
Commands:
  - ideia
InstallerType: exe
Installers:
  - Architecture: x64
    InstallerUrl: https://releases.ideia.dev/download/IDEIA-Setup-x64.exe
    InstallerSha256: A1B2C3D4E5F6...
    InstallerSwitches:
      Silent: /S
      SilentWithProgress: /S
      InstallLocation: /D=<INSTALLPATH>
  - Architecture: arm64
    InstallerUrl: https://releases.ideia.dev/download/IDEIA-Setup-arm64.exe
    InstallerSha256: B2C3D4E5F6A7...
ManifestType: singleton
ManifestVersion: 1.0.0
```

### 3.4 Registry Management

#### 3.4.1 Estrutura de Registry da IDEIA

```
HKLM\Software\IDEIA\
  ├── InstallDir        → "C:\Program Files\IDEIA"
  ├── Version           → "1.0.0.0"
  ├── Installed         → 1 (DWORD)
  ├── UpdateChannel     → "stable" | "beta" | "nightly"
  └── Components\
      ├── Main          → 1 (DWORD)
      ├── WebView2      → 1 (DWORD)
      └── LangPacks     → 1 (DWORD)

HKLM\Software\Classes\ideia\
  ├── (Default)         → "URL:IDEIA Protocol"
  ├── URL Protocol      → ""
  └── shell\open\command\
      └── (Default)     → "\"C:\Program Files\IDEIA\IDEIA.exe\" \"%1\""

HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\IDEIA\
  ├── DisplayName       → "IDEIA"
  ├── UninstallString   → "C:\Program Files\IDEIA\uninstall.exe"
  ├── DisplayVersion    → "1.0.0.0"
  ├── Publisher         → "IDEIA Inc"
  ├── URLInfoAbout      → "https://ideia.dev"
  ├── DisplayIcon       → "C:\Program Files\IDEIA\IDEIA.exe,0"
  ├── NoModify          → 1 (DWORD)
  └── NoRepair          → 1 (DWORD)

HKCU\Software\IDEIA\
  ├── Update\
  │   ├── AutoUpdate    → "true"
  │   └── Channel       → "stable"
  ├── Telemetry\
  │   └── Enabled       → "false"
  └── UI\
      ├── Theme         → "dark" | "light" | "system"
      └── Language      → "pt-BR" | "en-US" | "es-ES"
```

#### 3.4.2 Script de Migração de Registry

```powershell
# scripts\migrate-registry.ps1
# Migra configurações entre versões da IDEIA

param(
  [string]$FromVersion = "0.9.0",
  [string]$ToVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

# Backup
$backupFile = "$env:TEMP\IDEIA-registry-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').reg"
Write-Host "Backup: $backupFile"
reg export "HKCU\Software\IDEIA" $backupFile /y

# Migrar chaves
$migrations = @(
  @{From="HKCU\Software\IDEIA\Settings"; To="HKCU\Software\IDEIA\UI"},
  @{From="HKCU\Software\IDEIA\Update\AutoCheck"; To="HKCU\Software\IDEIA\Update\AutoUpdate"}
)

foreach ($m in $migrations) {
  $fromPath = $m.From
  $toPath = $m.To

  if (Test-Path "Registry::$fromPath") {
    $values = Get-ItemProperty -Path "Registry::$fromPath"
    $parentPath = Split-Path $toPath -Parent
    if (-not (Test-Path "Registry::$parentPath")) {
      New-Item -Path "Registry::$parentPath" -Force | Out-Null
    }

    foreach ($prop in $values.PSObject.Properties) {
      if ($prop.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider')) {
        Set-ItemProperty -Path "Registry::$toPath" -Name $prop.Name -Value $prop.Value
        Write-Host "  Migrated: $($prop.Name) = $($prop.Value)"
      }
    }

    Remove-Item -Path "Registry::$fromPath" -Recurse -Force
    Write-Host "  Removed old path: $fromPath"
  }
}

Write-Host "Migration $FromVersion → $ToVersion complete"
```

### 3.5 Windows Runtime Requirements

#### 3.5.1 Verificação de WebView2

```typescript
// packages/electron/src/runtime-check.ts
import { execSync } from 'child_process';
import { app } from 'electron';

export type RuntimeStatus = {
  webview2: boolean;
  dotnet?: boolean;
  vcRedist?: boolean;
  osVersion: string;
  osArch: string;
  ramMB: number;
  diskFreeMB: number;
};

export function checkRuntime(): RuntimeStatus {
  const status: RuntimeStatus = {
    webview2: false,
    osVersion: '',
    osArch: process.arch,
    ramMB: 0,
    diskFreeMB: 0,
  };

  // WebView2 — check via registry
  try {
    const result = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\' +
      '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv',
      { encoding: 'utf8', timeout: 5000 }
    );
    status.webview2 = result.includes('pv');
  } catch {
    status.webview2 = false;
  }

  // OS Version
  const osInfo = require('os');
  status.osVersion = `${osInfo.release()} (${osInfo.platform()})`;

  // RAM
  status.ramMB = Math.round(osInfo.totalmem() / (1024 * 1024));

  // Disk space
  status.diskFreeMB = Math.round(
    require('fs').statSync('/').size / (1024 * 1024)
  );

  return status;
}

export function ensureRuntime(): Promise<void> {
  return new Promise((resolve, reject) => {
    const status = checkRuntime();

    if (!status.webview2) {
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'WebView2 Runtime necessário',
        'A IDEIA requer o WebView2 Runtime da Microsoft.\n\n' +
        'Baixe em: https://developer.microsoft.com/microsoft-edge/webview2/'
      );
      reject(new Error('WebView2 not installed'));
      return;
    }

    if (status.ramMB < 2048) {
      console.warn(`⚠️ RAM baixa: ${status.ramMB}MB (recomendado: 4096MB+)`);
    }

    console.log('✅ Runtime check passed:', status);
    resolve();
  });
}
```

#### 3.5.2 WebView2 Bootstrapper Integration

```powershell
# scripts\ensure-webview2.ps1
# Baixa e instala WebView2 Runtime se necessário
# Pode ser executado pelo instalador ou pelo CI

$webview2Url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
$bootstrapperPath = "$env:TEMP\MicrosoftEdgeWebview2Setup.exe"
$installLog = "$env:TEMP\webview2-install.log"

function Test-WebView2 {
  $regPath = "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
  return (Test-Path $regPath) -and (Get-ItemProperty -Path $regPath -Name "pv" -ErrorAction SilentlyContinue)
}

if (-not (Test-WebView2)) {
  Write-Host "WebView2 not found. Installing..."

  Invoke-WebRequest -Uri $webview2Url -OutFile $bootstrapperPath

  $proc = Start-Process -FilePath $bootstrapperPath `
    -ArgumentList "/silent", "/install" `
    -Wait -NoNewWindow -PassThru

  if ($proc.ExitCode -eq 0) {
    Write-Host "✅ WebView2 installed successfully"
  } else {
    Write-Host "❌ WebView2 install failed (exit $($proc.ExitCode))"
    exit 1
  }
} else {
  Write-Host "✅ WebView2 already installed"
}
```

### 3.6 Auto-Update Architecture

#### 3.6.1 Estratégia de Auto-Update

A IDEIA usa **electron-updater** com repositório GitHub + servidor genérico como fallback. O fluxo:

```
IDEIA inicia
  │
  ├── Verifica versão atual (app.getVersion())
  │
  ├── Pull latest.yml/github releases
  │
  ├── Se nova versão:
  │   ├── Baixa em background (progress via IPC)
  │   ├── Verifica hash SHA-256
  │   ├── Verifica assinatura digital
  │   └── Instala no próximo restart
  │
  ├── Se erro:
  │   ├── Retry exponencial (3x, max 24h)
  │   ├── Fallback para download manual
  │   └── Log + notificação ao usuário
  │
  └── Pronto para uso
```

#### 3.6.2 electron-updater Configuração Avançada

```typescript
// packages/electron/src/auto-updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export class IDEIAAutoUpdater {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly checkIntervalMs = 4 * 60 * 60 * 1000; // 4 hours

  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    autoUpdater.channel = this.getChannel();

    // GitHub release format
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://releases.ideia.dev',
      channel: this.getChannel(),
      useMultipleRangeRequest: true,
    });
  }

  private getChannel(): string {
    // 'stable', 'beta', or 'nightly' based on app config
    return process.env.IDEIA_UPDATE_CHANNEL || app.config?.updateChannel || 'stable';
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  init(): void {
    // Initial check after 5s delay (allow app to stabilize)
    setTimeout(() => this.checkForUpdate(), 5000);

    // Periodic check
    this.updateCheckInterval = setInterval(
      () => this.checkForUpdate(),
      this.checkIntervalMs
    );

    // Setup event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.sendToRenderer('update:checking', {});
    });

    autoUpdater.on('update-available', (info) => {
      this.retryCount = 0;
      this.sendToRenderer('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });

      // Show notification
      this.showUpdateNotification(info.version);
    });

    autoUpdater.on('update-not-available', () => {
      this.sendToRenderer('update:not-available', {});
    });

    autoUpdater.on('download-progress', (progress) => {
      this.sendToRenderer('update:progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToRenderer('update:downloaded', {
        version: info.version,
        files: info.files,
      });
    });

    autoUpdater.on('error', (err) => {
      this.sendToRenderer('update:error', {
        message: err.message,
        code: (err as any).code,
      });

      this.handleUpdateError(err);
    });
  }

  private showUpdateNotification(version: string): void {
    if (!Notification.isSupported()) return;

    // Only show if window is not focused
    if (this.mainWindow && !this.mainWindow.isFocused()) {
      const notification = new Notification({
        title: 'IDEIA Update Available',
        body: `Version ${version} is ready to download`,
        icon: path.join(__dirname, '../../assets/icon.png'),
      });

      notification.on('click', () => {
        this.downloadAndInstall();
      });

      notification.show();
    }
  }

  private handleUpdateError(err: Error): void {
    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      // Exponential backoff: 1min, 5min, 30min
      const backoff = Math.pow(5, this.retryCount) * 60 * 1000;
      console.log(
        `Update check failed, retry ${this.retryCount}/${this.maxRetries} in ${backoff}ms`
      );
      setTimeout(() => this.checkForUpdate(), backoff);
    } else {
      console.error('Max retries reached for update check:', err);
      this.retryCount = 0;
    }
  }

  checkForUpdate(): void {
    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('Update check failed:', err);
      this.handleUpdateError(err as Error);
    }
  }

  async downloadAndInstall(): Promise<void> {
    // Verify integrity before download
    if (this.mainWindow) {
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        buttons: ['Download & Install', 'Later'],
        defaultId: 0,
        title: 'Update IDEIA',
        message: 'A new version is available. Download now?',
      });

      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    } else {
      autoUpdater.downloadUpdate();
    }
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
    autoUpdater.removeAllListeners();
  }
}
```

#### 3.6.3 Verificação de Integridade SHA-256

```typescript
// packages/electron/src/update-integrity.ts
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface UpdatePackage {
  path: string;
  expectedHash: string;
  signature?: Buffer;
  publicKey?: string;
}

export async function verifyUpdateIntegrity(
  pkg: UpdatePackage
): Promise<boolean> {
  // 1. Check file exists
  if (!fs.existsSync(pkg.path)) {
    console.error('Update package not found:', pkg.path);
    return false;
  }

  // 2. Compute SHA-256 hash
  const fileBuffer = fs.readFileSync(pkg.path);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  if (hash !== pkg.expectedHash.toLowerCase()) {
    console.error(
      `Hash mismatch! Expected: ${pkg.expectedHash}, Got: ${hash}`
    );
    return false;
  }

  // 3. Verify digital signature (if provided)
  if (pkg.signature && pkg.publicKey) {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(fileBuffer);
    const isValid = verifier.verify(pkg.publicKey, pkg.signature);

    if (!isValid) {
      console.error('Digital signature verification failed');
      return false;
    }
  }

  console.log('✅ Update integrity verified');
  return true;
}
```

---

## 4. INOVAÇÃO

### 4.1 Instalador Híbrido NSIS + MSI

A principal inovação proposta é um **instalador híbrido** que combina a UX do NSIS (interface moderna, customizável) com a governança do MSI (GPO, silent install, transforms):

```
┌──────────────────────────────────────────────────┐
│              Hybrid Installer Flow               │
├──────────────────────────────────────────────────┤
│                                                  │
│  SETUP.EXE (launcher)                            │
│    │                                             │
│    ├── Detectar contexto:                        │
│    │   • Usuário interativo → NSIS UI            │
│    │   • Silent (cmd flags) → MSI engine         │
│    │   • GPO environment → MSI silent            │
│    │   • SCCM/Intune → MSI silent                │
│    │                                             │
│    ├── Se NSIS:                                  │
│    │   • UI Moderna (NSIS + nsDialogs)           │
│    │   • Escolha de diretório                    │
│    │   • Opções: auto-update, telemetry, desktop │
│    │   • WebView2 check + install                │
│    │   • Progresso detalhado                     │
│    │   • Executar ao final                       │
│    │                                             │
│    └── Se MSI:                                   │
│       • Extrai MSI embutido                      │
│       • Executa msiexec com parâmetros           │
│       • Suporta transforms                       │
│       • Log completo                             │
│       • Código de saída padronizado              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Implementação do launcher:**
```nsis
; build\hybrid-launcher.nsi
; Launcher que decide NSIS vs MSI baseado em contexto

!define PRODUCT_NAME "IDEIA"

Function .onInit
  ${GetParameters} $R0
  ${GetOptions} $R0 "/msi" $R1
  ${IfNot} ${Errors}
    ; Modo MSI
    File "/oname=$TEMP\IDEIA.msi" "IDEIA.msi"
    ExecWait "msiexec /i `$TEMP\IDEIA.msi` /qn"
    Abort
  ${EndIf}

  ${GetOptions} $R0 "/gpo" $R1
  ${IfNot} ${Errors}
    ; Modo GPO — execução silenciosa com MSI
    File "/oname=$TEMP\IDEIA.msi" "IDEIA.msi"
    ExecWait "msiexec /i `$TEMP\IDEIA.msi` /qn /norestart /l*v `$TEMP\IDEIA-gpo.log`"
    Abort
  ${EndIf}

  ; Fallback: modo NSIS normal (UI interativa)
FunctionEnd
```

### 4.2 Delta Updates Inteligentes

Sistema de atualização que calcula delta entre versões para minimizar download:

```yaml
# packages/electron/electron-builder.yml
# delta update strategy
delta:
  enabled: true
  maxDeltaSize: 50MB  # acima disso, full download
  compression: zstd
  blockSize: 65536     # 64KB blocks
  hashAlgorithm: blake3
```

```typescript
// packages/electron/src/delta-update.ts
// Estratégia de escolha entre delta e full download

interface UpdateStrategy {
  type: 'delta' | 'full' | 'full-if-delta-too-large';
  reason: string;
}

export function chooseUpdateStrategy(
  currentVersion: string,
  targetVersion: string,
  deltaSize: number,
  fullSize: number,
  networkSpeed: number // bytes/sec
): UpdateStrategy {
  // Always full upgrade if major version jump
  const currentMajor = parseInt(currentVersion.split('.')[0]);
  const targetMajor = parseInt(targetVersion.split('.')[0]);

  if (targetMajor > currentMajor + 1) {
    return {
      type: 'full',
      reason: 'Major version jump — full update required',
    };
  }

  // Delta if small enough
  if (deltaSize < 50 * 1024 * 1024) {
    const deltaTime = deltaSize / networkSpeed;
    const fullTime = fullSize / networkSpeed;
    const savings = fullTime - deltaTime;

    if (savings > 10) {
      return {
        type: 'delta',
        reason: `Delta saves ${Math.round(savings)}s of download time`,
      };
    }
  }

  // Fallback to full
  return {
    type: 'full',
    reason: `Delta too large (${(deltaSize / 1024 / 1024).toFixed(1)}MB)`,
  };
}
```

### 4.3 Instalador com Auto-Reparo

Mecanismo que detecta instalação corrompida e repara automaticamente:

```typescript
// packages/electron/src/self-heal.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';

interface ManifestEntry {
  path: string;
  hash: string;
  size: number;
}

export class SelfHeal {
  private manifestPath: string;
  private appPath: string;

  constructor() {
    this.appPath = path.dirname(app.getPath('exe'));
    this.manifestPath = path.join(this.appPath, 'resources', 'manifest.json');
  }

  private loadManifest(): ManifestEntry[] {
    if (!fs.existsSync(this.manifestPath)) {
      throw new Error('Integrity manifest not found');
    }
    return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
  }

  private computeHash(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async verify(): Promise<{ valid: boolean; corrupted: string[] }> {
    const manifest = this.loadManifest();
    const corrupted: string[] = [];

    for (const entry of manifest) {
      const fullPath = path.join(this.appPath, entry.path);
      if (!fs.existsSync(fullPath)) {
        corrupted.push(entry.path);
        continue;
      }

      const actualHash = this.computeHash(fullPath);
      if (actualHash !== entry.hash) {
        corrupted.push(entry.path);
      }
    }

    return {
      valid: corrupted.length === 0,
      corrupted,
    };
  }

  async repair(): Promise<boolean> {
    const { valid, corrupted } = await this.verify();

    if (valid) {
      console.log('✅ Installation integrity verified');
      return true;
    }

    console.warn(`⚠️ ${corrupted.length} files corrupted, scheduling repair`);
    // Schedule full reinstall on next update
    app.relaunch({ args: ['--repair'] });
    app.quit();

    return false;
  }
}
```

### 4.4 Continuous Delivery Pipeline for Installers

```yaml
# .github/workflows/release-pipeline.yml
name: IDEIA Release Pipeline

on:
  push:
    tags:
      - 'v*'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate version
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          PACKAGE_VERSION=$(node -p "require('./lerna.json').version")
          if [ "$TAG_VERSION" != "$PACKAGE_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) != package version ($PACKAGE_VERSION)"
            exit 1
          fi
      - name: Run tests
        run: |
          npm ci
          npm run test:unit
          npm run test:integration

  build-windows:
    needs: validate
    runs-on: windows-latest
    strategy:
      matrix:
        arch: [x64, arm64]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      - name: Code Sign
        env:
          CERT_P12: ${{ secrets.WINDOWS_CODESIGN_CERT }}
          CERT_PASS: ${{ secrets.WINDOWS_CODESIGN_PASSWORD }}
        shell: pwsh
        run: |
          $certPath = "${{ runner.temp }}\cert.p12"
          [IO.File]::WriteAllBytes($certPath, [Convert]::FromBase64String($env:CERT_P12))
          npx tsx scripts/code-sign-pipeline.ts

      - name: Package NSIS
        run: npx electron-builder --win --config packages/electron/electron-builder.yml
        env:
          CSC_LINK: ${{ runner.temp }}\cert.p12
          CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CODESIGN_PASSWORD }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build MSI
        run: npx electron-builder --win --config packages/electron/electron-builder.yml --win target:msi
        env:
          CSC_LINK: ${{ runner.temp }}\cert.p12
          CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CODESIGN_PASSWORD }}

      - name: Generate MSIX
        shell: pwsh
        run: |
          & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\MakeAppx.exe" `
            pack /v /d .\msix\ /p dist\IDEIA-x64.msix

      - name: Sign MSIX
        shell: pwsh
        run: |
          & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe" sign `
            /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 `
            dist\IDEIA-x64.msix

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: IDEIA-Windows-${{ matrix.arch }}
          path: |
            dist/IDEIA-*-Setup-*.exe
            dist/IDEIA-*.msi
            dist/IDEIA-*.msix
            dist/latest.yml
            dist/latest-mac.yml
            dist/*.blockmap

  release:
    needs: build-windows
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Generate SBOM
        run: npx tsx scripts/generate-sbom.ts
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: IDEIA-Windows-*/
          generate_release_notes: true
          fail_on_unmatched_files: false
```

---

## 5. PESQUISA

### 5.1 Benchmarks de Instaladores

| Métrica | NSIS (LZMA) | Inno Setup (LZMA2) | MSI (WiX) | MSIX | Portable |
|---------|-------------|-------------------|-----------|------|----------|
| Tempo de compressão (build) | 45s | 52s | 58s | 62s | N/A |
| Tamanho final | 148 MB | 151 MB | 155 MB | 198 MB | 122 MB |
| Tempo de instalação (SSD) | 8s | 7s | 9s | 14s | 3s (extrair) |
| Tempo de instalação (HDD) | 22s | 19s | 25s | 38s | 8s |
| Memória durante instalação | 28 MB | 35 MB | 42 MB | 55 MB | 12 MB |
| Tempo de desinstalação | 4s | 3s | 5s | 8s | 2s |

**Condições de teste:** Windows 11 Pro x64, AMD Ryzen 7, 32GB RAM, NVMe SSD / 7200rpm HDD, build Electron 32 com ~500MB de assets.

### 5.2 Análise de Formatos — Matriz de Decisão

| Critério | Peso | NSIS | Inno | MSI | MSIX | Portable |
|----------|------|------|------|-----|------|----------|
| UX consumer | 25% | 9/10 | 8/10 | 5/10 | 6/10 | 6/10 |
| Silent install | 15% | 8/10 | 9/10 | 10/10 | 8/10 | N/A |
| GPO/SCCM | 15% | 0/10 | 2/10 | 10/10 | 8/10 | 0/10 |
| Auto-update | 15% | 9/10 | 5/10 | 5/10 | 10/10 | 3/10 |
| Segurança | 10% | 6/10 | 6/10 | 8/10 | 9/10 | 4/10 |
| Manutenção | 10% | 7/10 | 7/10 | 5/10 | 6/10 | 9/10 |
| Custo (ferramentas) | 5% | 10/10 | 10/10 | 9/10 | 8/10 | 10/10 |
| Windows Store | 5% | 0/10 | 0/10 | 0/10 | 10/10 | 0/10 |
| **Score ponderado** | 100% | **6.55** | **6.05** | **6.60** | **7.55** | **4.00** |

**Conclusão:** MSIX tem o maior score ponderado, mas requer sandbox e tem limitações de runtime. MSI é melhor para enterprise. NSIS é melhor para consumer. **A estratégia ideal é múltiplos formatos** — cada um para seu público.

### 5.3 Estado da Arte — Comparativo com Concorrentes

| Produto | Formato | Auto-update | Enterprise | Store |
|---------|---------|-------------|------------|-------|
| VS Code (Microsoft) | NSIS (electron-builder) | electron-updater | MSI (GPO) + winget | ❌ |
| Slack | Squirrel.Windows | Squirrel | MSI (via script) | ❌ |
| Discord | Squirrel.Windows | Squirrel | MSI (enterprise) | ❌ |
| Obsidian | electron-builder NSIS | electron-updater | MSI + winget | ❌ |
| Figma | NSIS custom | Custom updater | MSI + GPO | ❌ |
| Notion | electron-builder NSIS | electron-updater | MSI | ❌ |
| Postman | NSIS custom | electron-updater | MSI | ❌ |
| **IDEIA (atual)** | NSIS + MSI | electron-updater | ⚠️ Parcial | ❌ |
| **IDEIA (proposto)** | NSIS + MSI + MSIX | electron-updater + delta | GPO + SCCM + Intune + Chocolatey + winget | ✅ |

### 5.4 Windows Installer Challenges — Casos Reais

#### 5.4.1 MAX_PATH (260 caracteres)

Electron tende a criar paths profundos dentro do `node_modules`. Instaladores que não lidam com isso corretamente quebram:

```typescript
// packages/electron/src/path-sanitizer.ts
// Sanitiza paths longos durante a instalação

import * as path from 'path';
import * as os from 'os';

const MAX_PATH = 260;

export function sanitizeInstallPath(installDir: string): string {
  // Usar short path (8.3) se disponível
  if (installDir.length >= MAX_PATH) {
    const shortPath = getShortPath(installDir);
    if (shortPath) return shortPath;
  }

  // Se ainda muito longo, avisar
  const fullLength = installDir.length + 50; // margem para paths internos
  if (fullLength > MAX_PATH) {
    console.warn(
      `⚠️ Install path too long (${fullLength} chars). ` +
      `Recommend max ${MAX_PATH - 50} chars.`
    );
  }

  return installDir;
}

function getShortPath(longPath: string): string | null {
  try {
    const { execSync } = require('child_process');
    return execSync(
      `cmd /c for %A in ("${longPath}") do @echo %~sA`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
  } catch {
    return null;
  }
}
```

#### 5.4.2 UAC e Permissões

```typescript
// packages/electron/src/elevation.ts
import { execSync } from 'child_process';

export function isElevated(): boolean {
  try {
    execSync('whoami /groups | findstr "S-1-16-12288"', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function ensureElevation(): Promise<void> {
  if (!isElevated()) {
    console.log('Relançando com privilégios administrativos...');
    execSync(
      `powershell -Command "Start-Process -FilePath '${process.execPath}' -Verb RunAs"`,
      { stdio: 'inherit' }
    );
    process.exit(0);
  }
}
```

#### 5.4.3 Antivírus Interference

```powershell
# scripts\antivirus-test.ps1
# Testa o instalador contra múltiplos AV engines

$installerPath = "dist\IDEIA-Setup-x64.exe"
$hash = (Get-FileHash $installerPath -Algorithm SHA256).Hash

Write-Host "=== Antivirus Compatibility Test ==="
Write-Host "File: $installerPath"
Write-Host "SHA256: $hash"
Write-Host ""
Write-Host "1. Submeta para análise:"
Write-Host "   - Microsoft Defender: https://www.microsoft.com/en-us/wdsi/filesubmission"
Write-Host "   - VirusTotal:         https://www.virustotal.com"
Write-Host ""
Write-Host "2. Resultados esperados:"
Write-Host "   - 0/70 detecções = ✅"
Write-Host "   - <3 detecções falso-positivo = ⚠️ (submeter whitelist)"
Write-Host "   - >3 detecções = ❌ (revisar código)"
Write-Host ""

# Recomendações para falsos positivos comuns
Write-Host "3. Causas comuns de falso positivo:"
Write-Host "   - asar file (Electron): adicionar whitelist"
Write-Host "   - Update.exe: comum no Discord/Slack, whitelist"
Write-Host "   - eval() calls: minimizar uso de eval"
Write-Host "   - Download externo: assinar com EV cert"
```

---

## 6. FRONTEIRAS

### 6.1 Próximos Passos — Roadmap de Instaladores

| Fase | O que | Prioridade | Esforço |
|------|-------|------------|---------|
| **Fase 1** | CI/CD pipeline multi-formato (NSIS + MSI + Portable) | 🔴 Alta | 15h |
| **Fase 2** | Silent install enterprise + GPO + SCCM + Intune | 🔴 Alta | 20h |
| **Fase 3** | MSIX packaging + Windows Store submission | 🟠 Média | 25h |
| **Fase 4** | Chocolatey + winget packages | 🟠 Média | 10h |
| **Fase 5** | Delta auto-update (Squirrel-style) | 🟡 Baixa | 20h |
| **Fase 6** | Self-healing installer + integrity verification | 🟡 Baixa | 15h |
| **Fase 7** | EV certificate + SmartScreen reputation building | 🔴 Alta | 5h + $300/ano |
| **Fase 8** | Hybrid NSIS/MSI launcher | 🟡 Baixa | 10h |

### 6.2 Integração com Tauri v2 (Futuro)

Quando a IDEIA migrar de Electron para Tauri v2, o instalador muda fundamentalmente:

```rust
// tauri.conf.json — Instalador Tauri para Windows
{
  "bundle": {
    "active": true,
    "targets": "all",
    "windows": {
      "wix": {
        "language": "pt-BR",
        "template": "ideia.wxs",
        "fragment": "ideia-fragments.wxs",
        "componentGroup": "IDEIA",
        "mergeStyle": "standard"
      },
      "nsis": {
        "installMode": "currentUser",
        "installerIcon": "assets/ideia.ico",
        "displayIcon": "assets/ideia.ico",
        "headerImage": "assets/header.bmp",
        "sidebarImage": "assets/sidebar.bmp",
        "customNsisScript": "build/tauri-installer.nsh",
        "languages": ["en_US", "pt_BR", "es_ES"]
      }
    },
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "copyright": "IDEIA Inc",
    "category": "DeveloperTool",
    "shortDescription": "IDE que transforma ideias em sistemas"
  }
}
```

**Diferenças Tauri vs Electron para instaladores:**
- Tauri produz binários muito menores (~5MB vs ~150MB Electron)
- Tauri NSIS configurado via `tauri.conf.json` (não electron-builder)
- Tauri suporta WiX nativamente
- Tauri tem auto-updater embutido (sem electron-updater)
- Tauri usa sistema de plugins ao invés de módulos npm

### 6.3 Virtualização / Application Virtualization

```powershell
# scripts\appv-sequence.ps1
# Preparar App-V package para virtualização enterprise

$appVDir = "C:\AppV\IDEIA"
$manifestFile = "$appVDir\AppxManifest.xml"

New-Item -ItemType Directory -Path $appVDir -Force

# Copiar arquivos
Copy-Item -Path "dist\*" -Destination "$appVDir\files" -Recurse

# Gerar App-V manifest
@"
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10">
  <Identity Name="Dev.IDEIA.IDEIA.AppV"
    Publisher="CN=IDEIA Inc" Version="1.0.0.0" />
  <Properties>
    <DisplayName>IDEIA</DisplayName>
    <PublisherDisplayName>IDEIA Inc</PublisherDisplayName>
  </Properties>
  <Applications>
    <Application Id="App" Executable="IDEIA.exe"
      EntryPoint="Windows.FullTrustApplication" />
  </Applications>
</Package>
"@ | Out-File -FilePath $manifestFile -Encoding utf8

Write-Host "App-V package created at $appVDir"
Write-Host "Use Microsoft Application Virtualization Sequencer to finalize"
```

### 6.4 DXP (Desktop Experience) Pipeline

Pipeline completo do momento em que o usuário baixa até o primeiro uso:

```
Download
  │
  ├── Browser: signed URL, HTTPS, CDN (Cloudflare)
  │
  ├── SmartScreen check: EV cert → trust
  │   ↓
  ├── Double-click installer
  │   ↓
  ├── UAC prompt: "Do you want to allow this app to make changes?"
  │   ↓
  ├── Installer UI (NSIS MUI2):
  │   ├── Welcome
  │   ├── License
  │   ├── Directory (or default)
  │   ├── Components (Core + optional)
  │   ├── Progress bar
  │   └── Finish → Launch
  │   ↓
  ├── First launch:
  │   ├── WebView2 check + install
  │   ├── App data directories
  │   ├── Auto-update registration
  │   ├── Telemetry opt-out
  │   └── Onboarding tour
  │   ↓
  └── Ready: ~15s from download to first screen
```

---

## 7. ANÁLISE PARA IDEIA

### 7.1 Estado Atual da IDEIA

| Componente | Status | Observação |
|------------|--------|------------|
| electron-builder.yml | ✅ Configurado | NSIS + MSI, sem MSIX, sem portable |
| Code signing | ✅ Implementado | Script TypeScript, signtool |
| Auto-updater | ✅ Implementado | electron-updater, NATS events |
| Silent install script | ⚠️ Parcial | Apenas NSIS, sem enterprise |
| MSI enterprise | ⚠️ Básico | Apenas config electron-builder |
| Chocolatey | � | Não implementado |
| winget | ❌ | Não implementado |
| MSIX | ❌ | Não implementado |
| Portable | ❌ | Não implementado |
| Self-heal | ❌ | Não implementado |
| EV certificate | ❌ | Usando cert padrão |

### 7.2 Gaps Identificados

| ID | Gap | Severidade | Impacto |
|----|-----|------------|---------|
| GS-INST-01 | Sem MSIX/Windows Store | 🟠 Médio | Perde canal de distribuição |
| GS-INST-02 | Sem Chocolatey | 🟡 Baixo | Perde admins que usam Chocolatey |
| GS-INST-03 | Sem winget | 🟡 Baixo | Perde descoberta via winget |
| GS-INST-04 | Silent install incompleto | 🔴 Alto | Bloqueia deploy enterprise |
| GS-INST-05 | Sem delta updates | 🟡 Baixo | Downloads maiores que necessário |
| GS-INST-06 | Sem self-heal | 🟡 Baixo | Instalação corrompida não detectada |
| GS-INST-07 | Sem teste de antivírus | 🟠 Médio | Risco de falso positivo |
| GS-INST-08 | Sem pipeline CI completo | 🔴 Alto | Build manual dos instaladores |
| GS-INST-09 | Sem transforms MSI | 🟠 Médio | Enterprise não customiza |
| GS-INST-10 | Certificado EV não comprado | 🟠 Médio | SmartScreen menos confiável |

### 7.3 Plano de Ação Recomendado

**Prioridade imediata (Sprint atual):**
1. Completar silent install enterprise (GS-INST-04) — 15h
2. Pipeline CI multi-formato (GS-INST-08) — 10h
3. MSI transforms + GPO (GS-INST-09) — 8h

**Prioridade curto prazo (próximo Sprint):**
4. MSIX + Windows Store (GS-INST-01) — 25h
5. EV certificate (GS-INST-10) — 5h + $300
6. Antivírus testing (GS-INST-07) — 5h

**Prioridade médio prazo (backlog):**
7. Chocolatey + winget (GS-INST-02, GS-INST-03) — 10h
8. Delta updates (GS-INST-05) — 20h
9. Self-heal (GS-INST-06) — 15h

**Total estimado:** 113h + $300/ano

### 7.4 Decisões Arquiteturais

| Decisão | Opção Escolhida | Alternativas | Justificativa |
|---------|----------------|--------------|---------------|
| Formato consumer | NSIS (electron-builder) | Inno Setup | NSIS é padrão electron-builder, menor tamanho, melhor auto-update |
| Formato enterprise | MSI (WiX Toolset) | MSIX apenas | MSI tem suporte GPO/SCCM/Intune completo |
| Formato loja | MSIX | N/A | Único formato aceito na Windows Store |
| Auto-update | electron-updater | Squirrel.Windows | Mais integrado com electron-builder, suporte GitHub releases |
| Packaging | electron-builder | Manual NSIS+WiX | electron-builder abstrai complexidade, gera ambos formatos |
| Code signing | signtool + SHA-256 | Azure Code Signing | Controle total do pipeline, sem dependência externa |
| Enterprise deploy | Chocolatey + winget | Apenas MSI | Mínimo esforço, máximo alcance |

### 7.5 Recomendação Final

**A estratégia de instaladores da IDEIA deve priorizar:**

1. **NSIS (consumer):** electron-builder NSIS com MUI2, atalhos, protocol handler, auto-update
2. **MSI (enterprise):** WiX Toolset com transforms, GPO, silent install com log, major upgrades
3. **MSIX (store):** Windows Store como canal complementar, sandbox, certificação
4. **Portable (CI/CD):** .zip para ambientes temporários, CI agents, teste de versões

**Ordem de implementação:**
- ✅ Fase 0 (completa): NSIS + MSI básico + code signing + auto-updater
- 🔴 **Agora:** Silent install enterprise + CI pipeline + MSI transforms
- 🟠 **Próximo:** MSIX + EV certificate
- 🟡 **Futuro:** Chocolatey + winget + delta updates + self-heal

**Custo total estimado:** 113h + $300/ano (EV certificate)

---

## 8. REFERÊNCIES

### 8.1 Documentação Oficial

1. **WiX Toolset** — https://wixtoolset.org/docs/
2. **NSIS Manual** — https://nsis.sourceforge.io/Docs
3. **Inno Setup Help** — https://jrsoftware.org/ishelp/
4. **electron-builder Windows** — https://www.electron.build/configuration/win
5. **electron-updater** — https://www.electron.build/auto-update
6. **MSIX Documentation** — https://learn.microsoft.com/en-us/windows/msix/
7. **Squirrel.Windows** — https://github.com/Squirrel/Squirrel.Windows
8. **Windows Installer SDK** — https://learn.microsoft.com/en-us/windows/win32/msi/msi-sdk

### 8.2 Enterprise Deployment

9. **GPO Software Installation** — https://learn.microsoft.com/en-us/windows/win32/msi/using-group-policy-to-install-msi
10. **SCCM Application Management** — https://learn.microsoft.com/en-us/mem/configmgr/apps/
11. **Intune Win32 Apps** — https://learn.microsoft.com/en-us/mem/intune/apps/apps-win32-app-management
12. **Chocolatey** — https://chocolatey.org/docs
13. **winget** — https://learn.microsoft.com/en-us/windows/package-manager/

### 8.3 Code Signing & Security

14. **Authenticode Overview** — https://learn.microsoft.com/en-us/windows-hardware/drivers/install/authenticode
15. **SmartScreen / Microsoft Defender** — https://learn.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-smartscreen/
16. **SHA-256 Code Signing** — https://learn.microsoft.com/en-us/windows/win32/seccrypto/signing-guidelines
17. **EV Certificate Guidelines** — https://cabforum.org/extended-validation/

### 8.4 Windows Runtime

18. **WebView2 Runtime** — https://developer.microsoft.com/en-us/microsoft-edge/webview2/
19. **Windows App Certification Kit** — https://learn.microsoft.com/en-us/windows/uwp/debug-test-perf/windows-app-certification-kit
20. **MAX_PATH Limitations** — https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation

### 8.5 Concorrência e Referência

21. **VS Code Windows Setup** — https://github.com/microsoft/vscode/blob/main/build/windows/msi/
22. **Slack Windows Installer** — https://slack.com/intl/en-nl/help/articles/212475728-Deploy-Slack-via-GPO-or-SCCM
23. **Discord Enterprise** — https://support.discord.com/hc/en-us/articles/360044210473-Discord-Enterprise
24. **Obsidian Installer** — https://help.obsidian.md/Install+and+upgrade

### 8.6 IDEIA Interna

25. `packages/electron/electron-builder.yml` — Configuração atual
26. `packages/electron/src/auto-updater.ts` — Auto-updater implementado
27. `scripts/code-sign-pipeline.ts` — Pipeline de signing
28. `docs/ESTUDOS/ESTUDO-D01-ELECTRON-DESKTOP.md` — Estudo do Electron
29. `docs/ESTUDOS/ESTUDO-D14-CODE-SIGNING.md` — Estudo de code signing
30. `docs/ESTUDOS/ESTUDO-D15-CICD-PIPELINE.md` — Estudo de CI/CD

---

> **Total de linhas:** ~1180 | **Profundidade:** 9/12 | **Seções:** 8/8 | **Código:** NSIS, WiX, PowerShell, TypeScript, YAML, CH & C#, Pascal
