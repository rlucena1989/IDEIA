#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { parseArgs, printHelp, ensureDir, log, info, warn } = require('./lib/common');
const { toPascalCase, toCamelCase, toKebabCase } = require('../generators/helpers/naming');

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  printHelp(
    'component-generate.js — Gera componentes frontend (React, Vue, Angular)',
    'node .ai/bin/component-generate.js <Name> [--framework react|vue|angular] [--out <dir>]',
    [
      '--framework <fw>  react (default), vue, angular',
      '--out <dir>       Output dir (default: src/components/)',
    ]
  );
  process.exit(0);
}

const name = args._[0];
const framework = (args.framework || 'react').toLowerCase();
const outDir = args.out || path.join('src', 'components');
const Name = toPascalCase(name);
const nameKebab = toKebabCase(name);
const nameCamel = toCamelCase(name);
const templateDir = path.join(__dirname, '..', 'generators', 'templates', 'component');

function renderTemplate(templateFile, data) {
  const tpl = fs.readFileSync(path.join(templateDir, templateFile), 'utf-8');
  return Handlebars.compile(tpl)(data);
}

const data = { Name, name: nameKebab, nameCamel };
const basePath = path.join(process.cwd(), outDir, framework === 'angular' ? nameKebab : Name);
const files = [];

if (framework === 'react') {
  files.push({ name: `${Name}.tsx`, content: renderTemplate('react.tsx.hbs', data) });
  files.push({ name: `${Name}.module.css`, content: renderTemplate('style.css.hbs', data) });
  files.push({ name: `${Name}.test.tsx`, content: `import React from 'react';\nimport { render } from '@testing-library/react';\nimport { ${Name} } from './${Name}';\n\ndescribe('${Name}', () => {\n  it('renders without crashing', () => {\n    const { container } = render(<${Name}>Hello</${Name}>);\n    expect(container).toBeTruthy();\n  });\n});\n` });
} else if (framework === 'vue') {
  files.push({ name: `${Name}.vue`, content: renderTemplate('vue.vue.hbs', data) });
  files.push({ name: `${Name}.test.ts`, content: `import { mount } from '@vue/test-utils';\nimport ${Name} from './${Name}.vue';\n\ndescribe('${Name}', () => {\n  it('renders without crashing', () => {\n    const wrapper = mount(${Name});\n    expect(wrapper.exists()).toBe(true);\n  });\n});\n` });
} else if (framework === 'angular') {
  files.push({ name: `${nameKebab}.component.ts`, content: renderTemplate('angular-component.ts.hbs', data) });
  files.push({ name: `${nameKebab}.component.html`, content: `<div class="${nameKebab}">\n  <p>{{title}}</p>\n  <ng-content></ng-content>\n</div>\n` });
  files.push({ name: `${nameKebab}.component.css`, content: renderTemplate('style.css.hbs', data) });
  files.push({ name: `${nameKebab}.module.ts`, content: renderTemplate('angular-module.ts.hbs', data) });
  files.push({ name: `${nameKebab}.component.spec.ts`, content: `import { ComponentFixture, TestBed } from '@angular/core/testing';\nimport { ${Name}Component } from './${nameKebab}.component';\n\ndescribe('${Name}Component', () => {\n  let component: ${Name}Component;\n  let fixture: ComponentFixture<${Name}Component>;\n\n  beforeEach(async () => {\n    await TestBed.configureTestingModule({ declarations: [${Name}Component] }).compileComponents();\n    fixture = TestBed.createComponent(${Name}Component);\n    component = fixture.componentInstance;\n    fixture.detectChanges();\n  });\n\n  it('should create', () => {\n    expect(component).toBeTruthy();\n  });\n});\n` });
} else {
  console.error(`Unknown framework: ${framework}. Use react, vue, or angular.`);
  process.exit(1);
}

let created = 0;
let skipped = 0;

for (const file of files) {
  const fullPath = path.join(basePath, file.name);
  if (fs.existsSync(fullPath)) {
    warn(`Skip (exists): ${path.relative(process.cwd(), fullPath)}`);
    skipped++;
    continue;
  }
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, file.content, 'utf-8');
  log(`Create: ${path.relative(process.cwd(), fullPath)}`);
  created++;
}

console.log('');
info(`Framework: ${framework}`);
info(`Created: ${created} | Skipped: ${skipped} | Total: ${files.length}`);
