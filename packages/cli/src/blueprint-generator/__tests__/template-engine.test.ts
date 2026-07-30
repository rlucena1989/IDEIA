import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs/promises';
import { TemplateEngine, defaultHelpers, buildTemplateContext } from '../template-engine';

jest.mock('node:fs/promises');

describe('defaultHelpers', () => {
  describe('camelCase', () => {
    it('converts kebab-case', () => {
      expect(defaultHelpers.camelCase('hello-world')).toBe('helloWorld');
    });

    it('converts snake_case', () => {
      expect(defaultHelpers.camelCase('hello_world')).toBe('helloWorld');
    });

    it('converts space separated', () => {
      expect(defaultHelpers.camelCase('hello world')).toBe('helloWorld');
    });

    it('already camelCase stays unchanged', () => {
      expect(defaultHelpers.camelCase('helloWorld')).toBe('helloWorld');
    });

    it('handles single word', () => {
      expect(defaultHelpers.camelCase('hello')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(defaultHelpers.camelCase('')).toBe('');
    });
  });

  describe('pascalCase', () => {
    it('converts kebab-case', () => {
      expect(defaultHelpers.pascalCase('hello-world')).toBe('HelloWorld');
    });

    it('converts snake_case', () => {
      expect(defaultHelpers.pascalCase('hello_world')).toBe('HelloWorld');
    });

    it('converts camelCase', () => {
      expect(defaultHelpers.pascalCase('helloWorld')).toBe('HelloWorld');
    });

    it('handles single word', () => {
      expect(defaultHelpers.pascalCase('hello')).toBe('Hello');
    });
  });

  describe('kebabCase', () => {
    it('converts camelCase', () => {
      expect(defaultHelpers.kebabCase('helloWorld')).toBe('hello-world');
    });

    it('converts snake_case', () => {
      expect(defaultHelpers.kebabCase('hello_world')).toBe('hello-world');
    });

    it('handles single word', () => {
      expect(defaultHelpers.kebabCase('hello')).toBe('hello');
    });
  });

  describe('snakeCase', () => {
    it('converts camelCase', () => {
      expect(defaultHelpers.snakeCase('helloWorld')).toBe('hello_world');
    });

    it('converts kebab-case', () => {
      expect(defaultHelpers.snakeCase('hello-world')).toBe('hello_world');
    });

    it('handles single word', () => {
      expect(defaultHelpers.snakeCase('hello')).toBe('hello');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(defaultHelpers.capitalize('hello')).toBe('Hello');
    });

    it('leaves already capitalized', () => {
      expect(defaultHelpers.capitalize('Hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(defaultHelpers.capitalize('')).toBe('');
    });
  });

  describe('pluralize', () => {
    it('pluralizes regular words with s', () => {
      expect(defaultHelpers.pluralize('cat')).toBe('cats');
    });

    it('pluralizes words ending in s, x, z, ch, sh', () => {
      expect(defaultHelpers.pluralize('box')).toBe('boxes');
      expect(defaultHelpers.pluralize('church')).toBe('churches');
    });

    it('pluralizes words ending in y (not preceded by vowel)', () => {
      expect(defaultHelpers.pluralize('city')).toBe('cities');
    });

    it('keeps y for words ending in vowel+y', () => {
      expect(defaultHelpers.pluralize('boy')).toBe('boys');
    });

    it('handles irregular words', () => {
      expect(defaultHelpers.pluralize('person')).toBe('people');
      expect(defaultHelpers.pluralize('child')).toBe('children');
      expect(defaultHelpers.pluralize('mouse')).toBe('mice');
    });
  });

  describe('singularize', () => {
    it('singularizes regular words', () => {
      expect(defaultHelpers.singularize('cats')).toBe('cat');
    });

    it('handles irregular words', () => {
      expect(defaultHelpers.singularize('people')).toBe('person');
      expect(defaultHelpers.singularize('children')).toBe('child');
    });

    it('handles words ending in ies', () => {
      expect(defaultHelpers.singularize('cities')).toBe('city');
    });
  });

  describe('ifEquals', () => {
    it('returns true for equal values', () => {
      expect(defaultHelpers.ifEquals('a', 'a')).toBe(true);
    });

    it('returns false for different values', () => {
      expect(defaultHelpers.ifEquals('a', 'b')).toBe(false);
    });

    it('compares numbers', () => {
      expect(defaultHelpers.ifEquals(1, 1)).toBe(true);
      expect(defaultHelpers.ifEquals(1, 2)).toBe(false);
    });
  });

  describe('date', () => {
    it('returns ISO format by default', () => {
      const result = defaultHelpers.date();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns YYYY-MM-DD format', () => {
      const result = defaultHelpers.date('YYYY-MM-DD');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns YYYY format', () => {
      const result = defaultHelpers.date('YYYY');
      expect(result).toMatch(/^\d{4}$/);
    });
  });

  describe('indent', () => {
    it('indents a single line', () => {
      expect(defaultHelpers.indent('hello', 1)).toBe('  hello');
    });

    it('indents multiple lines', () => {
      expect(defaultHelpers.indent('hello\nworld', 1)).toBe('  hello\n  world');
    });

    it('indents with level 0', () => {
      expect(defaultHelpers.indent('hello', 0)).toBe('hello');
    });

    it('indents with deeper level', () => {
      expect(defaultHelpers.indent('hello', 3)).toBe('      hello');
    });
  });
});

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  it('constructs with default helpers', () => {
    expect(engine.getHelpers()).toEqual(defaultHelpers);
  });

  it('merges custom helpers', () => {
    const custom = { capitalize: (s: string) => s.toUpperCase() };
    const engineWithCustom = new TemplateEngine(custom);
    expect(engineWithCustom.getHelpers().capitalize('hello')).toBe('HELLO');
  });

  describe('render', () => {
    it('renders simple variable substitution with <%= %>', () => {
      const result = engine.render('<%= projectName %>', { projectName: 'test' });
      expect(result).toBe('test');
    });

    it('renders escaped variable substitution with <%- %>', () => {
      const result = engine.render('<%- projectName %>', { projectName: 'test' });
      expect(result).toBe('test');
    });

    it('passes through text without template markers', () => {
      const result = engine.render('Hello World', {});
      expect(result).toBe('Hello World');
    });

    it('processes if/endif conditionals (true)', () => {
      const tpl = '<% if (useFeature) %>enabled<% endif %>';
      expect(engine.render(tpl, { useFeature: true })).toBe('enabled');
    });

    it('processes if/endif conditionals (false)', () => {
      const tpl = '<% if (useFeature) %>enabled<% endif %>';
      expect(engine.render(tpl, { useFeature: false })).toBe('');
    });

    it('processes if/else/endif conditionals', () => {
      const tpl = '<% if (useFeature) %>yes<% else %>no<% endif %>';
      expect(engine.render(tpl, { useFeature: true })).toBe('yes');
      expect(engine.render(tpl, { useFeature: false })).toBe('no');
    });

    it('processes for loops', () => {
      const tpl = '<% for (item of items) %>x<% endfor %>';
      const result = engine.render(tpl, { items: ['a', 'b', 'c'] });
      expect(result).toBe('xxx');
    });

    it('empty array in loop produces no output', () => {
      const tpl = '<% for (item of items) %>x<% endfor %>';
      expect(engine.render(tpl, { items: [] })).toBe('');
    });

    it('non-array in loop produces no output', () => {
      const tpl = '<% for (item of items) %>x<% endfor %>';
      expect(engine.render(tpl, { items: 'notarray' })).toBe('');
    });

    it('nested conditionals in loops work with outer context', () => {
      const tpl = '<% for (item of items) %><% if (show) %>!<% endif %><% endfor %>';
      expect(engine.render(tpl, { items: [1, 2], show: true })).toBe('!!');
      expect(engine.render(tpl, { items: [1, 2], show: false })).toBe('');
    });

    it('strips unmatched <% and %> markers', () => {
      const tpl = '<% some random %> text <% end %>';
      const result = engine.render(tpl, {});
      expect(result).toContain('text');
    });

    it('handles errors in expressions gracefully', () => {
      const result = engine.render('<%= undefinedVar.nested %>', {});
      expect(result).toBe('');
    });

    it('uses helpers as context functions', () => {
      const result = engine.render('<%= camelCase("hello-world") %>', {});
      expect(result).toBe('helloWorld');
    });
  });

  describe('renderFile', () => {
    it('reads file and renders content', async () => {
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue('Hello <%= name %>');
      const result = await engine.renderFile('/path/template.txt', { name: 'World' });
      expect(result).toBe('Hello World');
      expect(mockReadFile).toHaveBeenCalledWith('/path/template.txt', 'utf-8');
    });
  });

  describe('renderPath', () => {
    it('replaces {{variables}} in path', () => {
      const result = engine.renderPath('src/{{name}}/index.ts', { name: 'my-module' });
      expect(result).toBe('src/my-module/index.ts');
    });

    it('leaves path without variables unchanged', () => {
      const result = engine.renderPath('src/index.ts', {});
      expect(result).toBe('src/index.ts');
    });
  });

  describe('evaluateCondition', () => {
    it('evaluates true condition', () => {
      expect(engine.evaluateCondition('true', {})).toBe(true);
    });

    it('evaluates false condition', () => {
      expect(engine.evaluateCondition('false', {})).toBe(false);
    });

    it('evaluates variable condition', () => {
      expect(engine.evaluateCondition('enabled', { enabled: true })).toBe(true);
      expect(engine.evaluateCondition('enabled', { enabled: false })).toBe(false);
    });

    it('evaluates comparison', () => {
      expect(engine.evaluateCondition('count > 5', { count: 10 })).toBe(true);
      expect(engine.evaluateCondition('count > 5', { count: 1 })).toBe(false);
    });

    it('handles syntax errors gracefully', () => {
      expect(engine.evaluateCondition('@@invalid@@', {})).toBe(false);
    });
  });
});

describe('buildTemplateContext', () => {
  it('returns a TemplateContext with derived fields', () => {
    const ctx = buildTemplateContext({ projectName: 'my-awesome-app' });
    expect(ctx.projectName).toBe('my-awesome-app');
    expect(ctx.projectNamePascal).toBe('MyAwesomeApp');
    expect(ctx.projectNameCamel).toBe('myAwesomeApp');
    expect(ctx.projectNameKebab).toBe('my-awesome-app');
    expect(ctx.projectNameSnake).toBe('my_awesome_app');
  });

  it('sets defaults for empty input', () => {
    const ctx = buildTemplateContext({});
    expect(ctx.projectName).toBe('project');
    expect(ctx.description).toBe('');
    expect(ctx.features).toEqual([]);
  });

  it('includes createdAt date', () => {
    const ctx = buildTemplateContext({ projectName: 'x' });
    expect(ctx.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes ideiaVersion', () => {
    const ctx = buildTemplateContext({ projectName: 'x' });
    expect(ctx.ideiaVersion).toBe('1.0.0');
  });

  it('includes nodeVersion', () => {
    const ctx = buildTemplateContext({ projectName: 'x' });
    expect(ctx.nodeVersion).toBe(process.version);
  });

  it('merges additional context', () => {
    const ctx = buildTemplateContext(
      { projectName: 'app' },
      { description: 'Test app', features: ['api'] },
    );
    expect(ctx.description).toBe('Test app');
    expect(ctx.features).toEqual(['api']);
  });

  it('user variables override derived fields', () => {
    const ctx = buildTemplateContext({ projectName: 'app', projectNamePascal: 'CustomName' });
    expect(ctx.projectNamePascal).toBe('CustomName');
  });
});
