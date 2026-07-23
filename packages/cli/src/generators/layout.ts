import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { BUILT_IN_LAYOUTS } from '../runtime/design-tokens';

interface LayoutOptions extends GeneratorOptions {
  stack?: 'react' | 'vue';
  pattern?: string;
}

/**
 * Processa layout.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function layout(name: string, options: LayoutOptions): void {
  const vars = buildVars(name);
  const stack = options.stack || process.env.GENERATOR_STACK || 'react';
  const pattern = options.pattern || 'sidebar-content';

  const tmpl = BUILT_IN_LAYOUTS.find(l => l.id === pattern);
  const areas = tmpl?.areas.join(' ') || 'content';
  const columns = tmpl?.columns || '1fr';
  const rows = tmpl?.rows || '1fr';

  const files: FileEntry[] = [];

  const css = `.${vars.name_kebab}-layout {
  display: grid;
  grid-template-areas: "${areas}";
  grid-template-columns: ${columns};
  grid-template-rows: ${rows};
  min-height: 100vh;
}
${(tmpl?.areas || ['content']).map(a => `.layout-${a} { grid-area: ${a}; }`).join('\n')}
`;

  if (stack === 'vue') {
    files.push({
      path: `src/layouts/{{Name}}Layout.vue`,
      content: `<template>
  <div class="{{name_kebab}}-layout">
    <aside v-if="$slots.sidebar" class="layout-sidebar">
      <slot name="sidebar" />
    </aside>
    <main class="layout-content">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="layout-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
${css}
</style>
`,
    });
  } else {
    files.push({
      path: `src/layouts/{{Name}}Layout.tsx`,
      content: `import React from 'react';

interface {{Name}}LayoutProps {
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function {{Name}}Layout({ sidebar, footer, children }: {{Name}}LayoutProps) {
  return (
    <div className="{{name_kebab}}-layout">
      {sidebar && <aside className="layout-sidebar">{sidebar}</aside>}
      <main className="layout-content">{children}</main>
      {footer && <footer className="layout-footer">{footer}</footer>}
    </div>
  );
}
`,
    });
    files.push({
      path: `src/layouts/{{Name}}Layout.css`,
      content: css,
    });
  }

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Layout: ${name} (pattern: ${pattern}, ${stack})`, result, options.dryRun);
}
