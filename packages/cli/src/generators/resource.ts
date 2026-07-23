import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa resource.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function resource(name: string, options: GeneratorOptions): void {
  const vars = buildVars(name);

  const stack = options.stack || process.env.GENERATOR_STACK || 'react';
  const isVue = stack === 'vue';
  const isAngular = stack === 'angular';

  const files: FileEntry[] = [];

  if (isVue) {
    files.push({
      path: `src/components/{{Name}}.vue`,
      content: `<template>
  <div class="{{name_kebab}}">
    <h2>{{Name}}</h2>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(false);
</script>

<style scoped>
.{{name_kebab}} { padding: 1rem; }
</style>
`,
    });
    files.push({
      path: `src/components/__tests__/{{Name}}.test.ts`,
      content: `import { mount } from '@vue/test-utils';
import {{Name}} from '../{{Name}}.vue';

describe('{{Name}}', () => {
  it('renders', () => {
    const wrapper = mount({{Name}});
    expect(wrapper.text()).toContain('{{Name}}');
  });
});
`,
    });
  } else if (isAngular) {
    files.push({
      path: `src/app/{{name_kebab}}/{{name_kebab}}.component.ts`,
      content: `import { Component } from '@angular/core';

@Component({
  selector: 'app-{{name_kebab}}',
  templateUrl: './{{name_kebab}}.component.html',
  styleUrls: ['./{{name_kebab}}.component.css']
})
export class {{Name}}Component {
  loading = false;
}
`,
    });
    files.push({
      path: `src/app/{{name_kebab}}/{{name_kebab}}.component.html`,
      content: `<h2>{{Name}}</h2>
`,
    });
    files.push({
      path: `src/app/{{name_kebab}}/{{name_kebab}}.component.css`,
      content: `:host { display: block; padding: 1rem; }
`,
    });
  } else {
    files.push({
      path: `src/components/{{Name}}/{{Name}}.tsx`,
      content: `import styles from './{{Name}}.module.css';

interface {{Name}}Props {
  title?: string;
}

export function {{Name}}({ title = '{{Name}}' }: {{Name}}Props) {
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
    </div>
  );
}
`,
    });
    files.push({
      path: `src/components/{{Name}}/{{Name}}.module.css`,
      content: `.container {
  padding: 1rem;
}
`,
    });
    files.push({
      path: `src/components/{{Name}}/__tests__/{{Name}}.test.tsx`,
      content: `import { render, screen } from '@testing-library/react';
import { {{Name}} } from '../{{Name}}';

describe('{{Name}}', () => {
  it('renders title', () => {
    render(<{{Name}} title="Test" />);
    expect(screen.getByText('Test')).toBeDefined();
  });
});
`,
    });
  }

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Resource Component: ${name} (${files.length} arquivos)`, result, options.dryRun);
}
