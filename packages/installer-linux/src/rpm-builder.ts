import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
const logger = createLogger('rpm-builder');

export interface RpmConfig {
  name: string;
  version: string;
  release: string;
  summary: string;
  license: string;
  url: string;
  arch: string;
  requires: string[];
  appPath: string;
}

export class RpmPackageBuilder {
  async build(config: RpmConfig, outputDir: string): Promise<string> {
    mkdirSync(outputDir, { recursive: true });

    const spec = `%global _appname ${config.name}
Name: ${config.name}
Version: ${config.version}
Release: ${config.release}%{?dist}
Summary: ${config.summary}
License: ${config.license}
URL: ${config.url}
BuildArch: ${config.arch}
Requires: ${config.requires.join(', ')}
%description
${config.summary}
%install
rm -rf %{buildroot}
install -d %{buildroot}%{_bindir}
install -m 755 ${config.appPath} %{buildroot}%{_bindir}/${config.name}
%files
%{_bindir}/${config.name}
%changelog
`;

    const specPath = join(outputDir, `${config.name}.spec`);
    writeFileSync(specPath, spec);
    execSync(`rpmbuild -bb "${specPath}" --define "_rpmdir ${outputDir}"`, { timeout: 120000 });

    return join(outputDir, `${config.name}-${config.version}-${config.release}.${config.arch}.rpm`);
  }
}
