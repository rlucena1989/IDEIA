export interface FlatpakConfig {
  appId: string;
  appName: string;
  version: string;
  runtime: string;
  runtimeVersion: string;
  sdk: string;
  command: string;
  finishArgs: string[];
  modules: Array<{ name: string; sources: Array<{ type: string; url?: string; path?: string }> }>;
}

export class FlatpakManifestBuilder {
  generate(config: FlatpakConfig): string {
    const modules = config.modules.map(m => {
      const sources = m.sources.map(s => {
        if (s.type === 'extra-data') return `      - type: extra-data\n        filename: ${s.url?.split('/').pop()}\n        url: ${s.url}\n        size: 0`;
        if (s.type === 'dir') return `      - type: dir\n        path: ${s.path}`;
        return `      - type: file\n        path: ${s.path}`;
      }).join('\n');
      return `  - name: ${m.name}\n    buildsystem: simple\n    build-commands:\n      - cp -r . /app/\n    sources:\n${sources}`;
    }).join('\n');

    return `app-id: ${config.appId}
runtime: ${config.runtime}
runtime-version: '${config.runtimeVersion}'
sdk: ${config.sdk}
command: ${config.command}
finish-args:
${config.finishArgs.map(a => `  - ${a}`).join('\n')}
modules:
${modules}
`;
  }
}
