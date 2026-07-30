import * as fs from 'fs'; import * as path from 'path';
import { createLogger } from '@ideia/logger';
import { AppBlueprint, AppType, PrototypeResult, ScaffoldFile } from './types';
const BLUEPRINTS: Record<string, ScaffoldFile[]> = {
  api: [
    { path: 'src/index.ts', content: "import express from \"express\";\nconst app = express();\napp.listen(3000, () => logger.info('running'));\n", template: false },
    { path: 'src/{{name}}.ts', content: 'export const greet = (name: string) => `Hello {{name}}`;\n', template: true },
    { path: 'package.json', content: '{"name":"{{name}}","version":"1.0.0","scripts":{"start":"ts-node src/index.ts"}}\n', template: true },
    { path: 'tsconfig.json', content: '{"compilerOptions":{"target":"ES2022","module":"commonjs","strict":true}}\n', template: false },
  ],
  web: [
    { path: 'src/App.tsx', content: 'function App() { return <h1>{{name}}</h1>; }\nexport default App;\n', template: true },
    { path: 'package.json', content: '{"name":"{{name}}","private":true,"scripts":{"dev":"vite"}}\n', template: true },
    { path: 'index.html', content: '<html><body><div id="root"></div></body></html>\n', template: false },
  ],
  cli: [
    { path: 'src/index.ts', content: "#!/usr/bin/env node\nlogger.info('{{name}} CLI');\n", template: true },
    { path: 'package.json', content: '{"name":"{{name}}","bin":{"{{name}}":"./dist/index.js"}}\n', template: true },
  ],
};
export class PrototypingEngine {
  private customBlueprints: Record<string, ScaffoldFile[]> = {};
  registerBlueprint(type: string, files: ScaffoldFile[]): void { this.customBlueprints[type] = files; }
  generate(blueprint: AppBlueprint): PrototypeResult {
    const start = Date.now();
    const baseFiles = BLUEPRINTS[blueprint.type] || BLUEPRINTS.api;
    const customFiles = this.customBlueprints[blueprint.type] || [];
    const allFiles = [...baseFiles, ...customFiles];
    const dir = path.resolve(blueprint.name);
    fs.mkdirSync(dir, { recursive: true });
    let count = 0;
    for (const file of allFiles) {
      let content = file.content;
      if (file.template) {
        content = content.replace(/\{\{name\}\}/g, blueprint.name).replace(/\{\{type\}\}/g, blueprint.type);
      }
      const filePath = file.template ? path.join(dir, file.path.replace('{{name}}', blueprint.name)) : path.join(dir, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      count++;
    }
    return { name: blueprint.name, files: count, duration: Date.now() - start, blueprint };
  }
  listBlueprints(): string[] { return [...Object.keys(BLUEPRINTS), ...Object.keys(this.customBlueprints)]; }
}
export function createPrototypingEngine(): PrototypingEngine { return new PrototypingEngine(); }
