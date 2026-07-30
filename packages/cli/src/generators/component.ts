import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';
import { BUILT_IN_TOKENS, formatTokensCSS } from '../runtime/design-tokens';

interface ComponentOptions extends GeneratorOptions {
  type?: 'button' | 'card' | 'modal' | 'table' | 'form' | 'layout';
  stack?: 'react' | 'vue';
}

function getDesignTokenCSS(): string {
  return BUILT_IN_TOKENS.map(t => `  --${t.name}: ${t.value};`).join('\n');
}

/**
 * Processa component.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function component(name: string, options: ComponentOptions): void {
  const vars = buildVars(name);
  const stack = options.stack || process.env.GENERATOR_STACK || 'react';
  const type = options.type || 'card';
  const designCSS = getDesignTokenCSS();

  const files: FileEntry[] = [];

  if (stack === 'vue') {
    files.push({
      path: `src/components/{{Name}}.vue`,
      content: `<template>
  <div class="{{name_kebab}}" data-component="${type}">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface {{Name}}Props {
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

const props = withDefaults(defineProps<{{Name}}Props>(), {
  variant: 'primary',
  disabled: false,
});

const classes = computed(() => [
  '{{name_kebab}}',
  \`{{name_kebab}}--\${props.variant}\`,
  { '{{name_kebab}}--disabled': props.disabled },
]);
</script>

<style scoped>
:root {
${designCSS}
}
.{{name_kebab}} { display: block; }
.{{name_kebab}}--primary { }
.{{name_kebab}}--secondary { }
.{{name_kebab}}--disabled { opacity: 0.5; pointer-events: none; }
</style>
`,
    });
    files.push({
      path: `src/components/__tests__/{{Name}}.spec.ts`,
      content: `import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import {{Name}} from '../{{Name}}.vue';

describe('{{Name}}', () => {
  it('renders', () => {
    const wrapper = mount({{Name}});
    expect(wrapper.exists()).toBe(true);
  });

  it('accepts variant prop', () => {
    const wrapper = mount({{Name}}, { props: { variant: 'secondary' } });
    expect(wrapper.classes()).toContain('{{name_kebab}}--secondary');
  });
});
`,
    });
  } else {
    files.push({
      path: `src/components/{{Name}}.tsx`,
      content: `import React from 'react';

export interface {{Name}}Props {
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  children?: React.ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'block' },
  disabled: { opacity: 0.5, pointerEvents: 'none' },
};

export function {{Name}}({ variant = 'primary', disabled, children }: {{Name}}Props) {
  return (
    <div
      className={\`{{name_kebab}} {{name_kebab}}--\${variant}\`}
      style={{ ...styles.root, ...(disabled ? styles.disabled : {}) }}
      data-component="${type}"
    >
      {children}
    </div>
  );
}
`,
    });
    files.push({
      path: `src/components/{{Name}}.stories.tsx`,
      content: `import type { Meta, StoryObj } from '@storybook/react';
import { {{Name}} } from './{{Name}}';

const meta: Meta<typeof {{Name}}> = {
  title: '{{Name}}',
  component: {{Name}},
};
export default meta;

type Story = StoryObj<typeof {{Name}}>;

export const Primary: Story = { args: { variant: 'primary', children: '{{Name}}' } };
export const Secondary: Story = { args: { variant: 'secondary', children: '{{Name}}' } };
`,
    });
    files.push({
      path: `src/components/__tests__/{{Name}}.test.tsx`,
      content: `import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { {{Name}} } from '../{{Name}}';

describe('{{Name}}', () => {
  it('renders', () => {
    render(<{{Name}}>Hello</{{Name}}>);
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
`,
    });
  }

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Component: ${name} (${files.length} arquivos, ${stack})`, result, options.dryRun);
}
