export interface WorkflowConfig {
  appName: string;
  buildCommand: string;
  testCommand: string;
  packageCommand: string;
  nodeVersion: string;
  platforms: { os: string; target: string; arch: string; formats: string }[];
  codeSign: boolean;
  notarize: boolean;
}

export function generateWorkflowYaml(config: WorkflowConfig): string {
  const lines: string[] = [];

  lines.push('name: Release ' + config.appName);
  lines.push('');
  lines.push('on:');
  lines.push('  push:');
  lines.push('    tags:');
  lines.push("      - 'v*'");
  lines.push('    branches:');
  lines.push('      - main');
  lines.push('  pull_request:');
  lines.push('    branches:');
  lines.push('      - main');
  lines.push('');
  lines.push('jobs:');
  lines.push('  release:');
  lines.push('    runs-on: ${{ matrix.os }}');
  lines.push('    strategy:');
  lines.push('      matrix:');
  lines.push('        include:');

  for (const platform of config.platforms) {
    lines.push('          - os: ' + platform.os);
    lines.push('            target: ' + platform.target);
    lines.push('            arch: ' + platform.arch);
    lines.push('            formats: ' + platform.formats);
  }

  lines.push('    steps:');
  lines.push('      - uses: actions/checkout@v4');
  lines.push('      - name: Setup Node.js');
  lines.push('        uses: actions/setup-node@v4');
  lines.push('        with:');
  lines.push('          node-version: ' + config.nodeVersion);
  lines.push('      - name: Install dependencies');
  lines.push('        run: npm ci');
  lines.push('      - name: Install platform-specific dependencies');
  lines.push('        run: |');
  lines.push('          if [ "${{ matrix.os }}" = "ubuntu-latest" ]; then');
  lines.push('            sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev');
  lines.push('          fi');
  lines.push('      - name: Lint');
  lines.push('        run: npm run lint');
  lines.push('      - name: Typecheck');
  lines.push('        run: npx tsc --noEmit');
  lines.push('      - name: Test');
  lines.push('        run: ' + config.testCommand);
  lines.push('      - name: Build');
  lines.push('        run: ' + config.buildCommand);
  lines.push('        env:');
  lines.push('          NODE_ENV: production');
  lines.push('      - name: Package');
  lines.push('        run: ' + config.packageCommand);

  if (config.codeSign) {
    lines.push('      - name: Code Sign (Windows)');
    lines.push("        if: matrix.os == 'windows-latest'");
    lines.push('        run: |');
    lines.push('          AzureSignTool sign \\');
    lines.push('            -kvu "${{ secrets.AZURE_KEY_VAULT_URI }}" \\');
    lines.push('            -kvi "${{ secrets.AZURE_CLIENT_ID }}" \\');
    lines.push('            -kvt "${{ secrets.AZURE_TENANT_ID }}" \\');
    lines.push('            -kvs "${{ secrets.AZURE_CLIENT_SECRET }}" \\');
    lines.push('            -kvc "${{ secrets.AZURE_CERT_NAME }}" \\');
    lines.push('            -tr http://timestamp.digicert.com \\');
    lines.push('            -v "${{ runner.temp }}/package/*.exe"');
  }

  if (config.notarize) {
    lines.push('      - name: Notarize (macOS)');
    lines.push("        if: matrix.os == 'macos-latest'");
    lines.push('        run: |');
    lines.push('          xcrun notarytool submit \\');
    lines.push('            --apple-id "${{ secrets.APPLE_ID }}" \\');
    lines.push('            --team-id "${{ secrets.APPLE_TEAM_ID }}" \\');
    lines.push('            --password "${{ secrets.APPLE_APP_PASSWORD }}" \\');
    lines.push('            --wait \\');
    lines.push('            "${{ runner.temp }}/package/*.dmg"');
  }

  lines.push('      - name: Upload Artifacts');
  lines.push('        uses: actions/upload-artifact@v4');
  lines.push('        with:');
  lines.push('          name: ${{ matrix.target }}-${{ matrix.arch }}');
  lines.push('          path: dist/packages/*');
  lines.push('      - name: Quality Gate Verification');
  lines.push('        run: |');
  lines.push('          npm run test:integration');
  lines.push('          npm run test:contract');
  lines.push('      - name: Create Release');
  lines.push('        uses: softprops/action-gh-release@v2');
  lines.push("        if: startsWith(github.ref, 'refs/tags/')");
  lines.push('        with:');
  lines.push('          files: dist/packages/*');
  lines.push('          generate_release_notes: true');
  lines.push('          fail_on_unmatched_files: true');

  return lines.join('\n');
}
