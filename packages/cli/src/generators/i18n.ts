import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';

/**
 * Processa i18n.
 * @param locale - Valor locale.
 * @param options - Valor options.
 */
export function i18n(locale: string, options: GeneratorOptions): void {
  const vars = buildVars(locale);
  const files: FileEntry[] = [
    {
      path: `src/i18n/locales/{{name_kebab}}.json`,
      content: `{
  "app": {
    "name": "{{Name}}",
    "description": "Description in {{name}}"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete"
  },
  "validation": {
    "required": "This field is required",
    "invalid": "Invalid value"
  }
}
`,
    },
    {
      path: `src/i18n/index.ts`,
      content: `import en from './locales/en.json';
{{#each locales}}
import {{this}} from './locales/{{this}}.json';
{{/each}}

const translations: Record<string, Record<string, unknown>> = {
  en,
  '{{name_kebab}}': require('./locales/{{name_kebab}}.json'),
};

export function t(key: string, locale = 'en'): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    }
  }
  return typeof value === 'string' ? value : key;
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`i18n: ${locale}`, result, options.dryRun);
}
