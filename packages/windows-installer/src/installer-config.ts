export interface MsiConfig {
  guid: string;
  upgradeCode: string;
  manufacturer: string;
  productName: string;
  version: string;
  installDir: string;
  features: string[];
  registryEntries: Array<{ key: string; value: string; name: string; root: 'HKLM' | 'HKCU' }>;
  shortcuts: Array<{ name: string; target: string; folder: string }>;
  requiresAdmin: boolean;
}

export interface NsisConfig {
  name: string;
  version: string;
  installDir: string;
  compress: 'zlib' | 'bzip2' | 'lzma';
  uninstaller: boolean;
  createStartMenuShortcut: boolean;
  createDesktopShortcut: boolean;
  allowCustomDir: boolean;
  licenseFile?: string;
}

export interface InnoConfig {
  appName: string;
  appVersion: string;
  publisher: string;
  defaultDir: string;
  outputDir: string;
  setupIcon: string;
  compression: 'lzma' | 'zip' | 'bzip' | 'none';
  createUninstall: boolean;
  privileges: 'admin' | 'user';
  languages: string[];
}

export class InstallerConfig {
  createMsi(config: MsiConfig): string {
    return `<?xml version="1.0"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="${config.guid}" UpgradeCode="${config.upgradeCode}" Name="${config.productName}" Version="${config.version}" Manufacturer="${config.manufacturer}" Language="1033">
    <Package InstallerVersion="200" Compressed="yes" InstallScope="${config.requiresAdmin ? 'perMachine' : 'perUser'}"/>
    <Media Id="1" Cabinet="product.cab" EmbedCab="yes"/>
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="${config.requiresAdmin ? 'ProgramFiles64Folder' : 'LocalAppDataFolder'}">
        <Directory Id="INSTALLDIR" Name="${config.productName}"/>
      </Directory>
    </Directory>
    <DirectoryRef Id="INSTALLDIR">
      ${config.features.map(f => `<Component Id="${f}" Guid="*"><File Id="${f}.exe" Source="${f}.exe" KeyPath="yes"/></Component>`).join('\n      ')}
    </DirectoryRef>
    <Feature Id="Complete" Level="1">
      ${config.features.map(f => `<ComponentRef Id="${f}"/>`).join('\n      ')}
    </Feature>
    ${config.registryEntries.map(r => `<RegistryValue Root="${r.root === 'HKLM' ? 0 : 1}" Key="Software\\${r.key}" Name="${r.name}" Value="${r.value}" Type="string"/>`).join('\n    ')}
  </Product>
</Wix>`;
  }

  createNsisScript(config: NsisConfig): string {
    return `; NSIS Installer Script for ${config.name}
!define PRODUCT_NAME "${config.name}"
!define PRODUCT_VERSION "${config.version}"
!define PRODUCT_DIR "${config.installDir}"
SetCompressor ${config.compress}
Name "\${PRODUCT_NAME} \${PRODUCT_VERSION}"
OutFile "${config.name}-Setup.exe"
InstallDir "\${PRODUCT_DIR}"
${config.allowCustomDir ? 'InstallDirRegKey HKLM "Software\\${PRODUCT_NAME}" ""' : ''}
Section "Main" SEC01
  SetOutPath "$INSTDIR"
  File /r "dist\\*.*"
  ${config.createStartMenuShortcut ? 'CreateShortCut "$SMPROGRAMS\\${PRODUCT_NAME}.lnk" "$INSTDIR\\${PRODUCT_NAME}.exe"' : ''}
  ${config.createDesktopShortcut ? 'CreateShortCut "$DESKTOP\\${PRODUCT_NAME}.lnk" "$INSTDIR\\${PRODUCT_NAME}.exe"' : ''}
SectionEnd
${config.uninstaller ? 'Section "Uninstall"\n  Delete "$INSTDIR\\*.*"\n  RMDir "$INSTDIR"\nSectionEnd' : ''}`;
  }

  createInnoScript(config: InnoConfig): string {
    return `; Inno Setup Script for ${config.appName}
[Setup]
AppName=${config.appName}
AppVersion=${config.appVersion}
AppPublisher=${config.publisher}
DefaultDirName=${config.defaultDir}
OutputDir=${config.outputDir}
OutputBaseFilename=${config.appName}-Setup
SetupIconFile=${config.setupIcon}
Compression=${config.compression}
PrivilegesRequired=${config.privileges}
${config.createUninstall ? 'UninstallDisplayName=' + config.appName : '; No uninstaller'}
[Languages]
${config.languages.map(l => `Name: "${l}"; MessagesFile: "compiler:Default.isl"`).join('\n')}
[Files]
Source: "dist\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs
[Icons]
Name: "{group}\\${config.appName}"; Filename: "{app}\\${config.appName}.exe"`;
  }
}
