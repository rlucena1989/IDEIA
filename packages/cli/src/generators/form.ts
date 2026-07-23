import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

interface FormOptions extends GeneratorOptions {
  stack?: 'react' | 'vue';
  fields?: string;
}

/**
 * Processa form.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function form(name: string, options: FormOptions): void {
  const vars = buildVars(name);
  const stack = options.stack || process.env.GENERATOR_STACK || 'react';
  const fields = (options.fields || 'name,email,message').split(',').map(f => f.trim());

  const _fieldInputs = fields.map(f => {
    const fieldVars = buildVars(f);
    return `    <input name="${f}" placeholder="${fieldVars.Name}" />`;
  }).join('\n');

  const files: FileEntry[] = [];

  if (stack === 'vue') {
    files.push({
      path: `src/components/{{Name}}Form.vue`,
      content: `<template>
  <form class="{{name_kebab}}-form" @submit.prevent="handleSubmit">
    <h2>{{Name}} Form</h2>
    ${fields.map(f => `    <div class="form-group">
      <label for="${f}">{{${buildVars(f).Name}}}</label>
      <input id="${f}" v-model="form.${f}" :name="'${f}'" />
    </div>`).join('\n')}
    <button type="submit" :disabled="submitting">Submit</button>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

interface {{Name}}FormData {
  ${fields.map(f => `  ${f}: string;`).join('\n')}
}

const form = reactive<{{Name}}FormData>({
  ${fields.map(f => `  ${f}: '',`).join('\n')}
});

const submitting = ref(false);

async function handleSubmit() {
  submitting.value = true;
  try {
    emit('submit', { ...form });
  } finally {
    submitting.value = false;
  }
}

const emit = defineEmits<{ submit: [data: {{Name}}FormData] }>();
</script>

<style scoped>
.{{name_kebab}}-form { max-width: 480px; margin: 0 auto; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
.form-group input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
</style>
`,
    });
  } else {
    files.push({
      path: `src/components/{{Name}}Form.tsx`,
      content: `import React, { useState } from 'react';

export interface {{Name}}FormData {
  ${fields.map(f => `  ${f}: string;`).join('\n')}
}

interface {{Name}}FormProps {
  onSubmit: (data: {{Name}}FormData) => void | Promise<void>;
}

export function {{Name}}Form({ onSubmit }: {{Name}}FormProps) {
  const [form, setForm] = useState<{{Name}}FormData>({
    ${fields.map(f => `  ${f}: '',`).join('\n')}
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="{{name_kebab}}-form" onSubmit={handleSubmit}>
      <h2>{{Name}} Form</h2>
${fields.map(f => `      <div className="form-group">
        <label htmlFor="${f}">{${buildVars(f).Name}}</label>
        <input id="${f}" value={form.${f}} onChange={e => setForm(p => ({ ...p, ${f}: e.target.value }))} />
      </div>`).join('\n')}
      <button type="submit" disabled={submitting}>Submit</button>
    </form>
  );
}
`,
    });
  }

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Form: ${name} (${fields.length} campos, ${stack})`, result, options.dryRun);
}
