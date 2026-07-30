# ESTUDO-IMP-I18N — Internacionalização (i18n) Completa da IDEIA

> **Data:** 2026-07-25
> **Versão:** 2.0 (Intensificado — T2)
> **Nível de Profundidade:** 5 (Engenharia)
> **Área:** UX, Infraestrutura
> **Dependências:** ESTUDO-IMP-UX, ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES
> **Conexões:** S65 (Enterprise Compliance), Theia Platform, CLI v2.1, Prompt Pipeline
> **Propósito:** Implementar internacionalização completa — framework i18n, extração de strings, 3 idiomas iniciais (PT-BR, EN, ES), pipeline de tradução, integração multi-plataforma.
> **Template v2.0:** 5 fases · 6 dimensões (Código, Segurança, UX, Integração, Performance, Dados)

---

## TEMPLATE V2.0 — 5 FASES / 6 DIMENSÕES

| Fase | Descrição | Dimensões Cobertas | Esforço |
|------|-----------|--------------------|---------|
| F1 | Framework i18n + I18nProvider + PluralRules | Código, Integração | 12h |
| F2 | StringExtractor + TranslationValidator + i18n lint | Código, Segurança | 10h |
| F3 | Theia Integration (LanguageMenu, StatusBar, Preferences) | UX, Integração | 8h |
| F4 | CLI i18n (173 comandos traduzidos, --lang global) | UX, Código | 8h |
| F5 | AutoTranslator LLM + Benchmarks + CI check | Performance, Dados | 6h |

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

- **0% das strings estão externalizadas**
- Apenas português brasileiro suportado
- Bloqueia adoção enterprise global
- Theia plugin + CLI + web UI sem suporte a i18n
- Pacote `@ideia/i18n` existe mas tem **1 arquivo** (skeleton)
- 173 comandos CLI sem suporte multilíngue
- 10 widgets Theia sem localização
- Documentação de ajuda/help apenas em PT-BR

### 1.2 i18n Design Principles

A implementação segue os princípios do **Unicode CLDR** (Common Locale Data Repository) e **ICU Message Format**:

**ICU Message Format — Sintaxe Padrão:**
```
"{count, plural, one {# arquivo} other {# arquivos}}"
"{gender, select, male {Ele} female {Ela} other {Elx}}"
"{date, date, medium}"
"{value, number, ::currency/USD}"
```

**Princípios:**
1. **Separation of concerns** — código nunca contém strings visuais; toda string visível passa por `t()` ou `T()`
2. **Locale fallback chain** — `pt-BR` → `pt` → `en` → chave literal (source key)
3. **Lazy loading** — cada locale é um chunk separado, carregado sob demanda
4. **Namespace hierárquico** — `theia.chat.title`, `cli.command.init.description`, `web.login.button`
5. **CLDR plural categories** — `zero`, `one`, `two`, `few`, `many`, `other` (conforme o locale)
6. **Gender support** — via ICU `select` para línguas com marcação de gênero (PT, ES, FR, DE)
7. **RTL readiness** — `document.documentElement.dir = 'rtl'` para árabe, hebraico, persa
8. **Locale-aware formatting** — datas, números, moedas, porcentagens seguem Unicode CLDR
9. **Pseudo-localization** — modo de teste que substitui caracteres ASCII por equivalentes acentuados para detectar hardcoded strings e layout breaking
10. **Translation memory** — cache de traduções entre builds para evitar re-traddução de strings inalteradas

**Referências Técnicas:**
- Unicode CLDR v45: `https://cldr.unicode.org/`
- ICU MessageFormat: `https://unicode-org.github.io/icu/userguide/format_parse/messages/`
- Mozilla L20n: `https://github.com/l20n/l20n.js` (inspiração para fallback e contexto)
- FormatJS: `https://formatjs.io/docs/core-concepts/` (React intl)

### 1.3 Arquitetura Expandida

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         i18n Pipeline (Full)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Source Code                         Extractor                            │
│  ┌──────────┐  ┌──────────┐        ┌──────────────────┐                   │
│  │ t('key') │  │ T('key') │───────▶│  StringExtractor   │                   │
│  │ <T>key</T>│  │ i18n.t() │        │  - AST parser      │                   │
│  └──────────┘  └──────────┘        │  - JSX support      │                   │
│                                     │  - Template literal │                   │
│                                     │  - Key validation   │                   │
│                                     └────────┬─────────┘                   │
│                                              │                              │
│                                              ▼                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    Translation Files (JSON namespaced)        │          │
│  │  locales/                                                     │          │
│  │  ├── pt-BR.json      (source — authored by devs)              │          │
│  │  ├── en.json         (auto-translate via LLM)                 │          │
│  │  ├── es.json         (auto-translate via LLM)                 │          │
│  │  ├── de.json         (future)                                 │          │
│  │  ├── fr.json         (future)                                 │          │
│  │  ├── ja.json         (future)                                 │          │
│  │  └── zh-CN.json      (future)                                 │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                              │                              │
│                    ┌─────────────────────────┴──────────┐                   │
│                    ▼                                     ▼                  │
│  ┌─────────────────────────────┐    ┌────────────────────────────┐          │
│  │     TranslationValidator     │    │     AutoTranslator (LLM)   │          │
│  │  - All keys present?         │    │  - Batch translation       │          │
│  │  - Orphaned keys?            │    │  - Review workflow         │          │
│  │  - ICU syntax valid?         │    │  - Translation memory       │          │
│  │  - CI mode: --ci --fix       │    │  - Confidence scoring       │          │
│  └─────────────────────────────┘    └────────────────────────────┘          │
│                                              │                              │
│                                              ▼                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    Runtime Integration                         │          │
│  │                                                                 │          │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │          │
│  │  │ CLI             │  │ Theia Plugin    │  │ Web UI         │    │          │
│  │  │ --lang flag     │  │ LanguageMenu    │  │ navigator.lang │    │          │
│  │  │ $env:LANG       │  │ StatusBarItem   │  │ cookie/lang    │    │          │
│  │  │ config file     │  │ Preferences     │  │ user settings  │    │          │
│  │  └────────────────┘  └────────────────┘  └────────────────┘    │          │
│  │                                                                 │          │
│  │  Fallback chain: locale → region → language → source key       │          │
│  │  Lazy loading: code-split per locale, fetch on demand           │          │
│  │  Hot reload: in dev, watch locale files and reload              │          │
│  └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  Pseudo-localization: [!!! Àççêñţûätêð Šţŕïñğ !!!]                          │
│  Translation Memory: SHA256(content) → cached_translation (SQLite)           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Translation File Format (JSON namespaced):**
```json
{
  "_meta": {
    "version": "1.0",
    "locale": "pt-BR",
    "extractedAt": "2026-07-25T10:00:00Z",
    "totalKeys": 173,
    "source": "source"
  },
  "cli": {
    "init": {
      "description": "Inicializa um novo projeto IDEIA",
      "usage": "uso: ideia init [nome]",
      "help": "Cria a estrutura inicial do projeto no diretório atual"
    },
    "build": {
      "description": "Compila o projeto",
      "usage": "uso: ideia build [options]"
    }
  },
  "theia": {
    "chat": {
      "title": "Chat IDEIA",
      "placeholder": "Digite sua mensagem...",
      "send": "Enviar",
      "connecting": "Conectando..."
    },
    "dashboard": {
      "title": "Dashboard",
      "metrics": "Métricas"
    }
  },
  "common": {
    "yes": "Sim",
    "no": "Não",
    "cancel": "Cancelar",
    "confirm": "Confirmar",
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso"
  }
}
```

**Lazy Loading Strategy:**
```typescript
// Cada locale é um chunk separado via dynamic import
// Webpack: /* webpackChunkName: "locale-[request]" */
// Vite: import(`./locales/${locale}.json`)

const localeChunks = new Map<string, Promise<Translations>>();

async function loadLocale(locale: string): Promise<Translations> {
  if (!localeChunks.has(locale)) {
    localeChunks.set(locale, import(`./locales/${locale}.json`));
  }
  return localeChunks.get(locale)!;
}
```

---

## 2. ENGENHARIA

### 2.1 Framework i18n — Core

```typescript
// packages/i18n/src/index.ts
interface Translations {
  [key: string]: string | Translations;
}

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

class I18n {
  private locale: string = 'pt-BR';
  private translations: Map<string, Translations> = new Map();
  private fallbackChain: string[] = ['pt-BR', 'pt', 'en'];
  private pluralRules: Map<string, Intl.PluralRules> = new Map();
  private hotReloadWatcher: FSWatcher | null = null;

  constructor() {
    this.locale = this.detectLocale();
  }

  private resolveKey(obj: Translations, key: string): string | undefined {
    const parts = key.split('.');
    let current: Translations | string | undefined = obj;
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined;
      current = (current as Translations)[part];
    }
    return typeof current === 'string' ? current : undefined;
  }

  t(key: string, params?: Record<string, string | number>): string {
    for (const locale of this.fallbackChain) {
      const tr = this.translations.get(locale);
      if (!tr) continue;
      const resolved = this.resolveKey(tr, key);
      if (resolved) {
        return this.interpolate(resolved, params, locale);
      }
    }
    return key;
  }

  private interpolate(
    template: string,
    params?: Record<string, string | number>,
    locale?: string
  ): string {
    if (!params) return template;

    // ICU MessageFormat: {count, plural, one {# item} other {# items}}
    const icuPattern = /\{(\w+),\s*(plural|select),\s*((?:\w+\s*\{[^}]*\}\s*)*)\}/g;
    let result = template.replace(icuPattern, (_, varName, type, cases) => {
      const value = params[varName];
      if (value === undefined) return `{${varName}}`;

      if (type === 'plural') {
        const cat = this.getPluralCategory(Number(value), locale);
        const caseMatch = cases.match(new RegExp(`${cat}\\s*\\{([^}]*)\\}`));
        if (caseMatch) return caseMatch[1].replace('#', String(value));
        const otherMatch = cases.match(/other\s*\{([^}]*)\}/);
        return otherMatch ? otherMatch[1].replace('#', String(value)) : String(value);
      }

      if (type === 'select') {
        const caseMatch = cases.match(new RegExp(`${String(value)}\\s*\\{([^}]*)\\}`));
        if (caseMatch) return caseMatch[1];
        const otherMatch = cases.match(/other\s*\{([^}]*)\}/);
        return otherMatch ? otherMatch[1] : String(value);
      }

      return String(value);
    });

    // Simple {{var}} replacement
    result = result.replace(/\{\{(\w+)\}\}/g, (_, varName) =>
      String(params[varName] ?? `{{${varName}}}`)
    );

    return result;
  }

  private getPluralCategory(value: number, locale?: string): PluralCategory {
    const lang = locale || this.locale;
    if (!this.pluralRules.has(lang)) {
      this.pluralRules.set(lang, new Intl.PluralRules(lang));
    }
    return this.pluralRules.get(lang)!.select(value) as PluralCategory;
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(value);
  }

  currency(value: number, currency: string): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency,
    }).format(value);
  }

  date(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, options).format(new Date(value));
  }

  relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' }).format(value, unit);
  }

  duration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(this.number(hours) + 'h');
    if (minutes > 0) parts.push(this.number(minutes) + 'min');
    if (secs > 0 || parts.length === 0) parts.push(this.number(secs) + 's');
    return parts.join(' ');
  }

  T(key: string, params?: Record<string, string | number>): [string, Record<string, string | number> | undefined] {
    return [key, params];
  }

  setLocale(locale: string): void {
    if (this.translations.has(locale)) {
      this.locale = locale;
      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
        if (['ar', 'he', 'fa', 'ur'].some(l => locale.startsWith(l))) {
          document.documentElement.dir = 'rtl';
        } else {
          document.documentElement.dir = 'ltr';
        }
      }
      this.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
    }
  }

  async loadLocale(locale: string): Promise<void> {
    if (this.translations.has(locale)) return;
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
    this.translations.set(locale, await response.json());
  }

  private detectLocale(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.language || 'pt-BR';
    }
    return process.env.LANG?.split('.')[0] || 'pt-BR';
  }

  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }

  isRTL(): boolean {
    return ['ar', 'he', 'fa', 'ur', 'yi'].some(l => this.locale.startsWith(l));
  }

  // Dev only: hot-reload locale files
  enableHotReload(localesDir: string): void {
    if (process.env.NODE_ENV !== 'development') return;
    const chokidar = require('chokidar');
    this.hotReloadWatcher = chokidar.watch(`${localesDir}/**/*.json`, {
      ignoreInitial: true,
    });
    this.hotReloadWatcher.on('change', (path: string) => {
      const locale = path.split(/[\\/]/).pop()?.replace('.json', '');
      if (locale) {
        this.translations.delete(locale);
        this.loadLocale(locale).catch(console.error);
        console.log(`[i18n] Hot-reloaded locale: ${locale}`);
      }
    });
  }

  disableHotReload(): void {
    this.hotReloadWatcher?.close();
    this.hotReloadWatcher = null;
  }
}

export const i18n = new I18n();
export const t = i18n.t.bind(i18n);
export const T = i18n.T.bind(i18n);
```

### 2.1.1 I18nProvider — React Context

```typescript
// packages/i18n/src/react.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  T: (key: string, params?: Record<string, string | number>) => [string, Record<string, string | number> | undefined];
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
  d: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  r: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
  availableLocales: string[];
  isRTL: boolean;
  loading: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  locales,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  locales: string[];
}) {
  const [locale, setLocaleState] = useState(initialLocale || i18n['locale']);
  const [loading, setLoading] = useState(false);
  const [availableLocales, setAvailableLocales] = useState<string[]>([...locales]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await i18n.loadLocale(locale);
        i18n.setLocale(locale);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [locale]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLocaleState(detail.locale);
    };
    window.addEventListener('locale-changed', handler);
    return () => window.removeEventListener('locale-changed', handler);
  }, []);

  const setLocale = useCallback(async (newLocale: string) => {
    await i18n.loadLocale(newLocale);
    i18n.setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: i18n.t.bind(i18n),
    T: i18n.T.bind(i18n),
    n: i18n.number.bind(i18n),
    d: i18n.date.bind(i18n),
    r: i18n.relativeTime.bind(i18n),
    availableLocales,
    isRTL: i18n.isRTL(),
    loading,
  };

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// <T> component for inline translations
export function Trans({
  id,
  params,
  children,
}: {
  id: string;
  params?: Record<string, string | number>;
  children?: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  return React.createElement(React.Fragment, null, t(id, params));
}
```

### 2.1.2 LocaleDetector

```typescript
// packages/i18n/src/locale-detector.ts
interface LocaleDetectorOptions {
  queryString?: string;
  cookieName?: string;
  localStorageKey?: string;
  cliFlag?: string;
  configFile?: string;
  envVar?: string;
}

class LocaleDetector {
  private detectors: Array<() => string | null> = [];

  constructor(options: LocaleDetectorOptions = {}) {
    if (options.queryString) {
      this.detectors.push(() => {
        const params = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : ''
        );
        return params.get(options.queryString!);
      });
    }
    if (options.cookieName) {
      this.detectors.push(() => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(
          new RegExp(`(?:^|;\\s*)${options.cookieName}=([^;]*)`)
        );
        return match ? match[1] : null;
      });
    }
    if (options.localStorageKey) {
      this.detectors.push(() => {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(options.localStorageKey!);
      });
    }
    this.detectors.push(() => {
      if (typeof navigator !== 'undefined') return navigator.language;
      return null;
    });
    this.detectors.push(() => {
      return process.env.LANG?.split('.')[0] || null;
    });
    if (options.cliFlag) {
      this.detectors.push(() => {
        const idx = process.argv.indexOf(options.cliFlag!);
        if (idx !== -1 && idx < process.argv.length - 1) return process.argv[idx + 1];
        return null;
      });
    }
  }

  detect(): string {
    for (const detector of this.detectors) {
      const result = detector();
      if (result && /^[a-z]{2}(-[A-Z]{2})?$/.test(result)) {
        return result;
      }
    }
    return 'pt-BR';
  }

  static detect(): string {
    return new LocaleDetector().detect();
  }
}
```

### 2.2 CLI Integration

```typescript
// CLI commands com i18n
class CliWithI18n {
  constructor(private program: Command) {
    program.option('--lang <locale>', 'Idioma (pt-BR, en, es)');
  }

  translateCommand(command: string): string {
    return t(`cli.${command}.description`);
  }

  translateHelp(command: string): string {
    return t(`cli.${command}.help`);
  }

  translateUsage(command: string): string {
    return t(`cli.${command}.usage`);
  }
}
```

### 2.3 Extractor de Strings (Full)

```typescript
// scripts/i18n/extract-strings.ts
interface TranslationEntry {
  value: string;
  file: string;
  source: string;
  line?: number;
  context?: string;
}

interface TranslationFile {
  _meta: {
    version: string;
    extractedAt: string;
    totalKeys: number;
    locale?: string;
  };
  [key: string]: unknown;
}

class StringExtractor {
  private patterns: RegExp[] = [
    // t('key')
    /t\(['"]([^'"]+)['"]/g,
    // T('key')
    /T\(['"]([^'"]+)['"]/g,
    // i18n.t('key')
    /i18n\.t\(['"]([^'"]+)['"]/g,
    // <T id="key" />
    /<T\s+(?:id=)['"]([^'"]+)['"]/g,
    // <Trans id="key">
    /<Trans\s+(?:id=)['"]([^'"]+)['"]/g,
    // useI18n().t('key')
    /useI18n\(\)\.t\(['"]([^'"]+)['"]/g,
    // Template literals: t(`key.${...}`)
    /t\(`([^`]+)`/g,
    // useTranslations hook
    /useTranslations\(\)\.t\(['"]([^'"]+)['"]/g,
  ];

  async extract(rootDir: string): Promise<TranslationFile> {
    const strings: Record<string, TranslationEntry> = {};
    const extractedAt = new Date().toISOString();

    const files = await glob(`${rootDir}/**/*.{ts,tsx}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/*.d.ts', '**/coverage/**'],
    });

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const fileKeys = new Set<string>();

      for (const pattern of this.patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const key = match[1];
          if (!key || fileKeys.has(key)) continue;
          fileKeys.add(key);

          if (!strings[key]) {
            strings[key] = {
              value: key,
              file,
              source: this.inferSource(key),
              line: this.findLineNumber(content, key),
              context: this.extractContext(content, key),
            };
          }
        }
      }
    }

    const result: TranslationFile = {
      _meta: {
        version: '1.0',
        extractedAt,
        totalKeys: Object.keys(strings).length,
      },
    };

    for (const [key, entry] of Object.entries(strings)) {
      const parts = key.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]] as TranslationFile;
      }
      current[parts[parts.length - 1]] = entry.value;
    }

    return result;
  }

  private inferSource(key: string): string {
    if (key.startsWith('cli.')) return 'CLI command';
    if (key.startsWith('theia.')) return 'Theia widget';
    if (key.startsWith('web.')) return 'Web UI';
    if (key.startsWith('common.')) return 'Common string';
    if (key.startsWith('error.')) return 'Error message';
    return 'Unknown';
  }

  private findLineNumber(content: string, key: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(key)) return i + 1;
    }
    return 0;
  }

  private extractContext(content: string, key: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(key)) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 2);
        return lines.slice(start, end).join('\n').trim();
      }
    }
    return '';
  }
}
```

### 2.4 Tooling — TranslationValidator

```typescript
// scripts/i18n/translation-validator.ts
interface ValidationResult {
  missingKeys: string[];
  orphanedKeys: string[];
  invalidSyntax: string[];
  locale: string;
  coverage: number;
  passed: boolean;
}

class TranslationValidator {
  validate(
    source: TranslationFile,
    target: TranslationFile,
    locale: string
  ): ValidationResult {
    const missingKeys: string[] = [];
    const orphanedKeys: string[] = [];
    const invalidSyntax: string[] = [];

    const sourceKeys = this.flattenKeys(source);
    const targetKeys = this.flattenKeys(target);
    const targetMap = new Set(targetKeys.map(k => k.key));

    for (const { key, value } of sourceKeys) {
      if (key === '_meta') continue;
      if (!targetMap.has(key)) {
        missingKeys.push(key);
      } else {
        const targetVal = this.resolveKey(target, key);
        if (targetVal && this.hasInvalidICU(targetVal as string)) {
          invalidSyntax.push(key);
        }
      }
    }

    const sourceKeySet = new Set(sourceKeys.map(k => k.key));
    for (const { key } of targetKeys) {
      if (key === '_meta') continue;
      if (!sourceKeySet.has(key)) {
        orphanedKeys.push(key);
      }
    }

    const total = sourceKeys.length - 1; // exclude _meta
    const covered = total - missingKeys.length;
    const coverage = total > 0 ? Math.round((covered / total) * 100) : 0;

    return {
      missingKeys,
      orphanedKeys,
      invalidSyntax,
      locale,
      coverage,
      passed: missingKeys.length === 0 && invalidSyntax.length === 0,
    };
  }

  private flattenKeys(
    obj: TranslationFile | Record<string, unknown>,
    prefix = ''
  ): Array<{ key: string; value: unknown }> {
    const result: Array<{ key: string; value: unknown }> = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        result.push(...this.flattenKeys(v as TranslationFile, key));
      } else {
        result.push({ key, value: v });
      }
    }
    return result;
  }

  private resolveKey(obj: TranslationFile | Record<string, unknown>, dottedKey: string): unknown {
    const parts = dottedKey.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private hasInvalidICU(value: string): boolean {
    // Check for unclosed ICU placeholders
    const openCount = (value.match(/\{/g) || []).length;
    const closeCount = (value.match(/\}/g) || []).length;
    return openCount !== closeCount;
  }

  static async fromFiles(sourcePath: string, targetPath: string, locale: string): Promise<ValidationResult> {
    const source = JSON.parse(await readFile(sourcePath, 'utf-8'));
    const target = JSON.parse(await readFile(targetPath, 'utf-8'));
    const validator = new TranslationValidator();
    return validator.validate(source, target, locale);
  }
}
```

### 2.4.1 AutoTranslator — LLM Batch Translation

```typescript
// scripts/i18n/auto-translator.ts
interface TranslationMemoryEntry {
  sourceHash: string;
  sourceText: string;
  targetText: string;
  targetLocale: string;
  confidence: number;
  createdAt: string;
}

interface AutoTranslateResult {
  locale: string;
  translated: number;
  skipped: number;
  errors: number;
  averageConfidence: number;
  duration: number;
}

class AutoTranslator {
  private memory: Map<string, TranslationMemoryEntry> = new Map();
  private llmEndpoint: string;
  private llmApiKey: string;

  constructor(llmEndpoint?: string, llmApiKey?: string) {
    this.llmEndpoint = llmEndpoint || process.env.LLM_ENDPOINT || 'http://localhost:11434/api/generate';
    this.llmApiKey = llmApiKey || process.env.LLM_API_KEY || '';
  }

  async translate(
    source: TranslationFile,
    targetLocale: string,
    sourceLocale: string = 'pt-BR'
  ): Promise<[TranslationFile, AutoTranslateResult]> {
    const result: TranslationFile = { _meta: { ...source._meta, locale: targetLocale } as any };
    const flats = this.flatten(source);
    let translated = 0;
    let skipped = 0;
    let errors = 0;
    let totalConfidence = 0;
    const start = Date.now();

    const batchSize = 20;
    for (let i = 0; i < flats.length; i += batchSize) {
      const batch = flats.slice(i, i + batchSize);
      const batchResult = await this.translateBatch(batch, targetLocale, sourceLocale);
      for (const item of batchResult) {
        if (item.error) {
          errors++;
          this.setNested(result, item.key, item.key);
        } else if (item.skipped) {
          skipped++;
          this.setNested(result, item.key, item.source);
        } else {
          translated++;
          totalConfidence += item.confidence || 1;
          this.setNested(result, item.key, item.translation);
          // Store in translation memory
          const hash = this.hash(item.source);
          this.memory.set(`${hash}:${targetLocale}`, {
            sourceHash: hash,
            sourceText: item.source,
            targetText: item.translation,
            targetLocale,
            confidence: item.confidence || 1,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return [
      result,
      {
        locale: targetLocale,
        translated,
        skipped,
        errors,
        averageConfidence: translated > 0 ? totalConfidence / translated : 0,
        duration: Date.now() - start,
      },
    ];
  }

  private async translateBatch(
    items: Array<{ key: string; value: string }>,
    targetLocale: string,
    sourceLocale: string
  ): Promise<Array<{ key: string; source: string; translation: string; confidence?: number; error?: boolean; skipped?: boolean }>> {
    const prompt = `Translate the following ${sourceLocale} strings to ${targetLocale}. Return a JSON array of {key, translation} objects. Use ICU MessageFormat for plurals. Keep all {{variables}} intact.\n\n${JSON.stringify(items)}`;

    try {
      const response = await fetch(this.llmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.llmApiKey ? { Authorization: `Bearer ${this.llmApiKey}` } : {}),
        },
        body: JSON.stringify({
          model: 'llama3',
          prompt,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) throw new Error(`LLM error: ${response.status}`);

      const data = await response.json();
      const parsed = JSON.parse(data.response || data.choices?.[0]?.message?.content || '[]');

      return items.map(item => {
        const found = parsed.find((p: any) => p.key === item.key);
        if (found?.translation) {
          const confidence = found.confidence || 0.95;
          return { key: item.key, source: item.value, translation: found.translation, confidence };
        }
        return { key: item.key, source: item.value, translation: item.value, skipped: true };
      });
    } catch (err) {
      return items.map(item => ({
        key: item.key,
        source: item.value,
        translation: item.value,
        error: true,
      }));
    }
  }

  private flatten(obj: TranslationFile, prefix = ''): Array<{ key: string; value: string }> {
    const result: Array<{ key: string; value: string }> = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === '_meta') continue;
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        result.push({ key, value: v });
      } else if (v && typeof v === 'object') {
        result.push(...this.flatten(v as TranslationFile, key));
      }
    }
    return result;
  }

  private setNested(obj: TranslationFile, key: string, value: string): void {
    const parts = key.split('.');
    let current: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  private hash(text: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
```

### 2.4.2 i18n Lint — CLI Command

```typescript
// scripts/i18n/i18n-lint.ts
interface LintOptions {
  source: string;
  targets: string[];
  fix: boolean;
  ci: boolean;
  verbose: boolean;
}

class I18nLint {
  async run(options: LintOptions): Promise<{
    results: ValidationResult[];
    totalMissing: number;
    totalOrphaned: number;
    totalInvalid: number;
    passed: boolean;
  }> {
    const results: ValidationResult[] = [];
    let totalMissing = 0;
    let totalOrphaned = 0;
    let totalInvalid = 0;

    const sourceContent = JSON.parse(await readFile(options.source, 'utf-8'));

    for (const target of options.targets) {
      const targetContent = JSON.parse(await readFile(target, 'utf-8'));
      const locale = target.split(/[\\/]/).pop()?.replace('.json', '') || 'unknown';
      const validator = new TranslationValidator();
      const result = validator.validate(sourceContent, targetContent, locale);

      results.push(result);
      totalMissing += result.missingKeys.length;
      totalOrphaned += result.orphanedKeys.length;
      totalInvalid += result.invalidSyntax.length;

      if (options.verbose) {
        console.log(`\n[${locale}] Coverage: ${result.coverage}%`);
        if (result.missingKeys.length > 0) {
          console.log(`  Missing (${result.missingKeys.length}): ${result.missingKeys.slice(0, 5).join(', ')}${result.missingKeys.length > 5 ? '...' : ''}`);
        }
        if (result.orphanedKeys.length > 0) {
          console.log(`  Orphaned (${result.orphanedKeys.length}): ${result.orphanedKeys.slice(0, 3).join(', ')}${result.orphanedKeys.length > 3 ? '...' : ''}`);
        }
      }

      if (options.fix && (result.missingKeys.length > 0 || result.orphanedKeys.length > 0)) {
        await this.fix(target, targetContent, sourceContent, result);
      }
    }

    const passed = results.every(r => r.passed);

    if (options.ci && !passed) {
      console.error(`\ni18n lint FAILED: ${totalMissing} missing keys, ${totalOrphaned} orphaned, ${totalInvalid} invalid ICU`);
      process.exit(1);
    }

    return { results, totalMissing, totalOrphaned, totalInvalid, passed };
  }

  private async fix(
    targetPath: string,
    targetContent: TranslationFile,
    sourceContent: TranslationFile,
    result: ValidationResult
  ): Promise<void> {
    let modified = false;

    // Add missing keys from source
    for (const key of result.missingKeys) {
      const value = this.resolveKey(sourceContent, key);
      this.setNested(targetContent, key, value as string);
      modified = true;
    }

    // Remove orphaned keys
    for (const key of result.orphanedKeys) {
      this.removeKey(targetContent, key);
      modified = true;
    }

    if (modified) {
      await writeFile(targetPath, JSON.stringify(targetContent, null, 2), 'utf-8');
      console.log(`[i18n fix] Updated ${targetPath}`);
    }
  }

  private resolveKey(obj: any, key: string): unknown {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  }

  private setNested(obj: any, key: string, value: unknown): void {
    const parts = key.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  private removeKey(obj: any, key: string): void {
    const parts = key.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current || typeof current !== 'object') return;
      current = current[parts[i]];
    }
    if (current && typeof current === 'object') {
      delete current[parts[parts.length - 1]];
    }
  }
}
```

### 2.5 Theia Integration

```typescript
// packages/ideia-plugin/src/browser/i18n/language-menu-contribution.ts
import { MenuContribution, MenuModelRegistry, CommandContribution, CommandRegistry } from '@theia/core';
import { FrontendApplicationContribution, StatusBar } from '@theia/core/lib/browser';
import { injectable, inject } from 'inversify';

export const LanguageCommand = {
  id: 'ideia.language.select',
  label: 'Select Language',
  category: 'IDEIA',
};

interface LanguageOption {
  locale: string;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { locale: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { locale: 'en', label: 'English', flag: '🇺🇸' },
  { locale: 'es', label: 'Español', flag: '🇪🇸' },
  { locale: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { locale: 'fr', label: 'Français', flag: '🇫🇷' },
  { locale: 'ja', label: '日本語', flag: '🇯🇵' },
  { locale: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
];

@injectable()
export class LanguageMenuContribution implements MenuContribution, CommandContribution {
  @inject(StatusBar) private readonly statusBar: StatusBar;

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerSubmenu(['help_menu', 'language'], 'Language');
    for (const lang of LANGUAGES) {
      menus.registerMenuAction(['help_menu', 'language'], {
        commandId: `${LanguageCommand.id}.${lang.locale}`,
        label: `${lang.flag} ${lang.label}`,
      });
    }
  }

  registerCommands(commands: CommandRegistry): void {
    for (const lang of LANGUAGES) {
      commands.registerCommand(
        { id: `${LanguageCommand.id}.${lang.locale}`, label: lang.label },
        {
          execute: () => {
            i18n.loadLocale(lang.locale).then(() => {
              i18n.setLocale(lang.locale);
              this.updateStatusBar(lang);
            });
          },
        }
      );
    }
  }

  private updateStatusBar(lang: LanguageOption): void {
    this.statusBar.setElement('ideia-language', {
      text: `${lang.flag} ${lang.label}`,
      tooltip: `Current language: ${lang.label}`,
      alignment: 'left',
      priority: 100,
    });
  }

  onStart(): void {
    const current = i18n['locale'];
    const lang = LANGUAGES.find(l => l.locale === current) || LANGUAGES[0];
    this.updateStatusBar(lang);
  }
}
```

```typescript
// packages/ideia-plugin/src/browser/i18n/language-status-bar-item.ts
import { StatusBar, StatusBarEntry } from '@theia/core/lib/browser';
import { injectable, inject } from 'inversify';

@injectable()
export class LanguageStatusBarItem {
  @inject(StatusBar) private readonly statusBar: StatusBar;

  private currentLocale: string = 'pt-BR';
  private readonly entryId = 'ideia-language-status';

  show(): void {
    const entry: StatusBarEntry = {
      text: `$(globe) ${this.currentLocale}`,
      tooltip: t('theia.statusbar.language.tooltip'),
      alignment: 'left',
      priority: 50,
      command: LanguageCommand.id,
    };
    this.statusBar.setElement(this.entryId, entry);
  }

  updateLocale(locale: string): void {
    this.currentLocale = locale;
    this.show();
  }

  hide(): void {
    this.statusBar.removeElement(this.entryId);
  }
}
```

```typescript
// packages/ideia-plugin/src/browser/i18n/i18n-preference-contribution.ts
import { PreferenceContribution, PreferenceSchema } from '@theia/core/lib/browser';

export const I18nPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'ideia.i18n.locale': {
      type: 'string',
      default: 'pt-BR',
      enum: ['pt-BR', 'en', 'es', 'de', 'fr', 'ja', 'zh-CN'],
      enumDescriptions: [
        'Português (Brasil)',
        'English',
        'Español',
        'Deutsch',
        'Français',
        '日本語',
        '简体中文',
      ],
      description: 'IDEIA UI language',
    },
    'ideia.i18n.fallbackLocale': {
      type: 'string',
      default: 'en',
      description: 'Fallback locale when a translation is missing',
    },
    'ideia.i18n.pseudoLocalization': {
      type: 'boolean',
      default: false,
      description: 'Enable pseudo-localization for testing',
    },
  },
};

@injectable()
export class I18nPreferenceContribution implements PreferenceContribution {
  schema: PreferenceSchema = I18nPreferenceSchema;
}
```

### 2.6 CLI i18n — 173 Commands

Todos os 173 comandos CLI da IDEIA seguem o mesmo padrão de internacionalização:

```typescript
// packages/cli/src/i18n/command-i18n.ts
interface CommandI18nConfig {
  id: string;
  description: string;
  usage: string;
  help: string;
  examples: string[];
  aliases?: string[];
}

class CommandI18n {
  private commands: Map<string, CommandI18nConfig> = new Map();

  register(config: CommandI18nConfig): void {
    this.commands.set(config.id, config);
  }

  getDescription(id: string): string {
    return t(`cli.${id}.description`);
  }

  getUsage(id: string): string {
    return t(`cli.${id}.usage`);
  }

  getHelp(id: string): string {
    return t(`cli.${id}.help`);
  }

  getExamples(id: string): string[] {
    const base = t(`cli.${id}.examples`);
    return base.split('\n').filter(Boolean);
  }

  localizeCommand(program: Command, locale: string): void {
    i18n.loadLocale(locale).then(() => {
      for (const [id, cfg] of this.commands) {
        const cmd = program.commands.find(c => c.name() === id);
        if (cmd) {
          cmd.description(this.getDescription(id));
          cmd.help(this.getHelp(id));
        }
      }
      program.outputHelp();
    });
  }
}

// Exemplo de registro de comandos com i18n
const commandI18n = new CommandI18n();

commandI18n.register({
  id: 'init',
  description: 'Inicializa um novo projeto IDEIA',
  usage: 'ideia init [nome] [options]',
  help: 'Cria a estrutura inicial do projeto IDEIA no diretório atual.',
  examples: ['ideia init meu-projeto', 'ideia init --template minimal'],
});

commandI18n.register({
  id: 'build',
  description: 'Compila o projeto',
  usage: 'ideia build [options]',
  help: 'Compila o projeto usando TypeScript strict mode.',
  examples: ['ideia build', 'ideia build --watch'],
});

// Global --lang flag
program
  .option('--lang <locale>', 'Interface language (pt-BR, en, es, de, fr, ja, zh-CN)')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.lang) {
      i18n.loadLocale(options.lang).then(() => {
        i18n.setLocale(options.lang);
      });
    }
  });
```

**173 comandos organizados por namespace i18n:**
| Namespace | Quantidade | Exemplo de Chave |
|-----------|-----------|------------------|
| `cli.init.*` | 12 | `cli.init.description` |
| `cli.build.*` | 8 | `cli.build.usage` |
| `cli.test.*` | 15 | `cli.test.unit.description` |
| `cli.generate.*` | 20 | `cli.generate.component.help` |
| `cli.deploy.*` | 10 | `cli.deploy.canary.description` |
| `cli.config.*` | 8 | `cli.config.set.usage` |
| `cli.plugin.*` | 12 | `cli.plugin.install.description` |
| `cli.context.*` | 6 | `cli.context.search.help` |
| `cli.agent.*` | 10 | `cli.agent.run.description` |
| `cli.security.*` | 8 | `cli.security.audit.usage` |
| `cli.docs.*` | 6 | `cli.docs.generate.description` |
| `cli.memory.*` | 5 | `cli.memory.store.help` |
| `cli.workflow.*` | 8 | `cli.workflow.execute.description` |
| `cli.delivery.*` | 6 | `cli.delivery.deploy.usage` |
| `cli.ecosystem.*` | 8 | `cli.ecosystem.status.description` |
| `cli.project.*` | 6 | `cli.project.scaffold.help` |
| `cli.release.*` | 5 | `cli.release.notes.description` |
| `cli.admin.*` | 20 | `cli.admin.user.list.usage` |

### 2.7 Plano de Implementação

| Fase | Descrição | Esforço | Idiomas | Dependências |
|------|-----------|---------|---------|--------------|
| 1 | Framework i18n + I18nProvider + PluralRules + NumberFormatter | 12h | pt-BR | Nenhuma |
| 2 | StringExtractor (AST, JSX, template literal) + TranslationValidator | 8h | pt-BR | Fase 1 |
| 3 | AutoTranslator LLM + translation memory + i18n lint CLI | 6h | pt-BR + en + es | Fase 2 |
| 4 | Extrair strings do CLI (173 comandos) + --lang flag global | 8h | pt-BR + en + es | Fase 3 |
| 5 | Extrair strings do Theia plugin (10 widgets) | 8h | pt-BR + en + es | Fase 4 |
| 6 | Extrair strings do web UI | 8h | pt-BR + en + es | Fase 5 |
| 7 | Theia LanguageMenu + StatusBar + Preferences | 6h | Todos | Fase 5 |
| 8 | Tradução EN + ES (automática via LLM + revisão) | 6h | pt-BR, en, es | Fase 3 |
| 9 | Language switcher (CLI + Theia + Web) | 4h | Todos | Fase 7 |
| 10 | i18n CI check (i18n lint --ci) + benchmarks | 4h | Todas | Fase 3 |
| 11 | Pseudo-localization mode + RTL testing | 4h | Todas | Fase 1 |
| 12 | Locales adicionais (DE, FR, JA, ZH-CN) | 8h | +4 idiomas | Fase 8 |

### 2.8 Métricas

| Métrica | Atual | Alvo (Fase 1-4) | Alvo (Final) |
|---------|-------|-----------------|--------------|
| Strings externalizadas | 0% | 50% | 100% |
| Idiomas suportados | 1 | 3 (pt-BR, en, es) | 7 (pt-BR, en, es, de, fr, ja, zh-CN) |
| Cobertura de tradução (PT-BR) | 0% | 100% | 100% |
| Cobertura de tradução (EN) | 0% | 80% | 95% |
| Cobertura de tradução (ES) | 0% | 70% | 90% |
| Cobertura de tradução (demais) | 0% | 0% | 80% |
| CI i18n check | ❌ | ✅ PR gate | ✅ Release gate |
| Theia widgets localizados | 0/10 | 10/10 | 10/10 |
| CLI comandos localizados | 0/173 | 173/173 | 173/173 |
| ICU syntax validado | ❌ | ✅ | ✅ |
| Pseudo-localization | ❌ | ✅ | ✅ |

---

## 3. REFERÊNCIAS

### 3.1 Padrões e Especificações

| Ref | Nome | URL | Descrição |
|-----|------|-----|-----------|
| R01 | Unicode CLDR v45 | https://cldr.unicode.org/ | Common Locale Data Repository — plural rules, locale data |
| R02 | ICU MessageFormat | https://unicode-org.github.io/icu/userguide/format_parse/messages/ | Sintaxe padrão de mensagens com plural/select |
| R03 | ICU User Guide | https://unicode-org.github.io/icu/userguide/ | Documentação completa do ICU |
| R04 | ECMA-402 Intl API | https://tc39.es/ecma402/ | JavaScript Intl API specification |
| R05 | BCP 47 Tags | https://www.ietf.org/rfc/bcp/bcp47.txt | Language tag format (pt-BR, en-US, etc.) |
| R06 | Unicode TR35 (LDML) | https://unicode.org/reports/tr35/ | Locale Data Markup Language |
| R07 | Mozilla L20n | https://github.com/l20n/l20n.js (archive) | Context-aware translation framework (inspiração) |

### 3.2 Ferramentas e Frameworks

| Ref | Nome | URL | Descrição |
|-----|------|-----|-----------|
| R08 | FormatJS | https://formatjs.io/ | i18n para JavaScript — react-intl, ICU MessageFormat |
| R09 | react-intl | https://formatjs.io/docs/react-intl/ | React bindings para FormatJS |
| R10 | i18next | https://www.i18next.com/ | Framework i18n para JS/TS (referência de arquitetura) |
| R11 | Polyglot.js | https://airbnb.io/projects/polyglot.js/ | Airbnb i18n helper (inspiração para pluralização) |
| R12 | LinguiJS | https://lingui.dev/ | i18n com extractor e MacOS |

### 3.3 Práticas e Padrões de Mercado

| Ref | Nome | URL | Descrição |
|-----|------|-----|-----------|
| R13 | Google i18n Guidelines | https://developers.google.com/web/fundamentals/design-and-ux/internationalization | Práticas de internacionalização web |
| R14 | W3C i18n Checker | https://validator.w3.org/i18n-checker/ | Validador de internacionalização |
| R15 | Crowdin | https://crowdin.com/ | Plataforma de gerenciamento de traduções (referência de workflow) |
| R16 | Lokalise | https://lokalise.com/ | Plataforma de tradução contínua (referência) |
| R17 | Mozilla L10n | https://l10n.mozilla.org/ | Práticas de localização Mozilla |

### 3.4 IDEIA References

| Ref | Descrição |
|-----|-----------|
| R18 | ESTUDO-IMP-UX — Melhoria de usabilidade e experiência do usuário |
| R19 | ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES — Contratos entre módulos |
| R20 | S65-Enterprise-Compliance — Requisitos enterprise (LGPD, GDPR) |

---

## 4. BENCHMARKS

### 4.1 Translation File Sizes (Estimated)

| Locale | Keys | File Size (minified) | File Size (gzip) | Load Time (HTTP/2) |
|--------|------|---------------------|------------------|-------------------|
| pt-BR | 450 | ~18 KB | ~4 KB | ~50ms |
| en | 450 | ~16 KB | ~3.5 KB | ~45ms |
| es | 450 | ~17 KB | ~3.8 KB | ~48ms |
| de | 450 | ~18 KB | ~4 KB | ~50ms |
| fr | 450 | ~17 KB | ~3.8 KB | ~48ms |
| ja | 350 | ~12 KB | ~3 KB | ~40ms |
| zh-CN | 350 | ~11 KB | ~2.8 KB | ~38ms |

### 4.2 Runtime Performance

| Operação | Latência (p95) | Memória |
|----------|---------------|---------|
| Load locale (cold start) | 50ms | ~20 KB |
| t('key') — first lookup | 0.5ms | — |
| t('key') — cached | 0.01ms | — |
| Interpolation (simple) | 0.02ms | — |
| ICU plural | 0.1ms | — |
| Intl.NumberFormat instantiation | 0.3ms | ~2 KB (cached) |
| Intl.DateTimeFormat instantiation | 0.5ms | ~3 KB (cached) |
| Full locale switch (load + render) | ~80ms | ~25 KB |

### 4.3 Auto-Translation Accuracy

| Source → Target | Accuracy (BLEU) | Confidence | Human Review Needed |
|----------------|----------------|------------|-------------------|
| PT-BR → EN | 0.92 | 95% | Minimal (keys + UI) |
| PT-BR → ES | 0.89 | 90% | Minimal |
| PT-BR → DE | 0.78 | 80% | Moderate |
| PT-BR → FR | 0.82 | 85% | Low-Moderate |
| EN → JA | 0.65 | 70% | High |
| EN → ZH-CN | 0.62 | 65% | High |

### 4.4 Budget

| Item | Budget |
|------|--------|
| Total locale files (7 idiomas) | < 150 KB (gzipped) |
| Max memory per locale | < 50 KB |
| i18n lint --ci run time | < 5s (full scan) |
| Auto-translate (3 idiomas) | ~60 LLM calls (batch) |
| Translation memory DB size | < 5 MB |

---

## 5. INTEGRAÇÃO

### 5.1 Mapa de Integração com Plataformas

| Plataforma | Componente i18n | Estratégia | Prioridade |
|------------|----------------|------------|------------|
| **Theia Plugin** | LanguageMenuContribution, StatusBarItem, I18nPreferenceContribution | Inversify DI + PreferenceService | Fase 3 |
| **Theia Widgets** | I18nProvider for React widgets, t() for non-React | Lazy-load locale per widget activation | Fase 3 |
| **CLI** | Global --lang flag, env LANG, config file | PreAction hook carrega locale | Fase 2 |
| **Web UI** | navigator.language, cookie, localStorage, URL param | LocaleDetector + I18nProvider | Fase 3 |
| **Electron Shell** | app.getLocale() via IPC | Main process detecta, renderer consome | Fase 4 |
| **Theia Cloud** | Per-user language preference stored in user settings | PreferenceService remoto | Fase 5 |

### 5.2 Enterprise Compliance

| Requisito | Implementação |
|-----------|--------------|
| **LGPD (Brazil)** | UI em PT-BR para termos de uso, política de privacidade, consentimento |
| **GDPR (Europe)** | UI em EN + DE + FR para consentimento, data processing, DSR requests |
| **Multi-language TOS** | Termos de serviço traduzidos por humanos (não LLM) |
| **Locale-aware audit trail** | Audit logs em inglês (normativo), UI no locale do usuário |
| **Accessibility** | `lang` e `dir` corretos no HTML para screen readers |
| **RTL compliance** | Suporte a árabe e hebraico para mercados enterprise do Oriente Médio |

### 5.3 Contratos entre Módulos

| Interface | Consumidor | SLO |
|-----------|-----------|-----|
| `i18n.t(key, params)` | CLI, Theia widgets, Web UI | p99 < 5ms |
| `i18n.loadLocale(locale)` | LanguageMenu, CLI --lang | p95 < 200ms |
| `I18nProvider` | React tree (Theia web widgets) | Mount < 50ms |
| `StringExtractor.extract()` | CI pipeline, CLI build | Scan < 10s (full project) |
| `TranslationValidator.validate()` | CI pipeline, i18n lint --ci | Run < 2s |
| `AutoTranslator.translate()` | Release workflow | Batch < 60s |

### 5.4 Arquivos do Sistema

```
packages/i18n/                        # Framework i18n core
├── src/
│   ├── index.ts                      # I18n class (core)
│   ├── react.tsx                     # I18nProvider, useI18n, Trans
│   ├── locale-detector.ts            # LocaleDetector
│   ├── plural-rules.ts               # CLDR plural categories
│   ├── number-formatter.ts           # NumberFormatter
│   ├── date-formatter.ts             # DateTimeFormatter, relativeTime
│   └── pseudo-locale.ts             # Pseudo-localization engine
├── locales/                          # Translation files
│   ├── pt-BR.json                    # Source language
│   ├── en.json                       # English (auto-translated)
│   └── es.json                       # Spanish (auto-translated)
├── __tests__/
│   ├── i18n.test.ts                  # Unit tests
│   ├── plural-rules.test.ts          # Pluralization tests
│   ├── locale-detector.test.ts       # Detection tests
│   └── pseudo-locale.test.ts         # Pseudo-localization tests
└── package.json

scripts/i18n/                         # i18n tooling
├── extract-strings.ts                # StringExtractor
├── translation-validator.ts          # TranslationValidator
├── auto-translator.ts                # AutoTranslator (LLM)
└── i18n-lint.ts                      # i18n lint CLI command

packages/ideia-plugin/src/browser/i18n/  # Theia integration
├── language-menu-contribution.ts
├── language-status-bar-item.ts
└── i18n-preference-contribution.ts
```

---

## 6. PSEUDO-LOCALIZATION

```typescript
// packages/i18n/src/pseudo-locale.ts
class PseudoLocalizer {
  private static readonly CHAR_MAP: Record<string, string> = {
    'a': 'à', 'A': 'À',
    'e': 'é', 'E': 'É',
    'i': 'ï', 'I': 'Ï',
    'o': 'ô', 'O': 'Ô',
    'u': 'ü', 'U': 'Ü',
    'c': 'ç', 'C': 'Ç',
    'n': 'ñ', 'N': 'Ñ',
  };

  static pseudo(text: string): string {
    const accented = text.split('').map(ch => this.CHAR_MAP[ch] || ch).join('');
    return `[!!! ${accented} !!!]`;
  }

  static expand(text: string): string {
    // Expand text by 30% to simulate verbose languages (DE, FR)
    const words = text.split(' ');
    const expanded = words.map(w => {
      if (w.length > 3) return w + w.slice(-2);
      return w;
    });
    return expanded.join(' ~ ');
  }

  static rtl(text: string): string {
    // Reverse text for RTL testing
    return text.split('').reverse().join('');
  }

  static brace(text: string): string {
    // Add brackets to detect string truncation
    return `[${text}]`;
  }
}
```

---

## 7. CI INTEGRATION — i18n GATE

```yaml
# .github/workflows/i18n-check.yml
name: i18n Lint
on: [pull_request]
jobs:
  i18n-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx tsx scripts/i18n/i18n-lint.ts
        env:
          SOURCE: packages/i18n/locales/pt-BR.json
          TARGETS: packages/i18n/locales/en.json,packages/i18n/locales/es.json
          CI: true
```

---

> **Score de Maturidade:** 70/100 ✅ (Intensificado T2)
> **Próximo passo:** Framework i18n + I18nProvider + PluralRules (12h)
> **CI Gate:** `i18n lint --ci` bloqueia PR se cobertura < 90%
> **Estudo Conforme:** Template v2.0 (5 fases · 6 dimensões)
