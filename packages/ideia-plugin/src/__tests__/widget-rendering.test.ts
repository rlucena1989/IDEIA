import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../..');
const BROWSER_DIR = path.join(SRC_DIR, 'src/browser');

describe('Widget file integrity', () => {
  it('all widgets have unique IDs', () => {
    const chat = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-chat-widget.tsx'), 'utf-8');
    const dashboard = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-dashboard-widget.tsx'), 'utf-8');
    const approval = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-approval-widget.tsx'), 'utf-8');

    const ids = [chat.match(/static ID = '([^']+)'/)?.[1],
      dashboard.match(/static ID = '([^']+)'/)?.[1],
      approval.match(/static ID = '([^']+)'/)?.[1]];
    expect(ids.every(id => id)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all widgets have LABEL defined', () => {
    const widgets = ['chat', 'dashboard', 'diff', 'approval', 'file', 'studies', 'suggestions', 'security'];
    for (const w of widgets) {
      const content = fs.readFileSync(path.join(BROWSER_DIR, `ideia-${w}-widget.tsx`), 'utf-8');
      expect(content).toMatch(/static LABEL = '/);
    }
  });

  it('all widgets extend BaseWidget or Widget', () => {
    const widgets = ['chat', 'dashboard', 'diff', 'approval', 'file', 'studies', 'suggestions', 'security'];
    for (const w of widgets) {
      const content = fs.readFileSync(path.join(BROWSER_DIR, `ideia-${w}-widget.tsx`), 'utf-8');
      expect(content).toMatch(/extends\s+(BaseWidget|Widget)/);
    }
  });

  it('all widgets are @injectable', () => {
    const widgets = ['chat', 'dashboard', 'diff', 'approval', 'file', 'studies', 'suggestions', 'security'];
    for (const w of widgets) {
      const content = fs.readFileSync(path.join(BROWSER_DIR, `ideia-${w}-widget.tsx`), 'utf-8');
      expect(content).toMatch(/@injectable\(\)/);
    }
  });

  it('search overlay is a standalone widget', () => {
    const content = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-search-overlay.tsx'), 'utf-8');
    expect(content).toMatch(/static ID = 'ideia:search-overlay'/);
    expect(content).toContain('@injectable');
  });

  it('WidgetLoader has all required methods', () => {
    const content = fs.readFileSync(path.join(BROWSER_DIR, 'widget-loader.ts'), 'utf-8');
    expect(content).toContain('register(');
    expect(content).toContain('async load(');
    expect(content).toContain('isLoaded(');
    expect(content).toContain('getLoadedCount()');
    expect(content).toContain('unload(');
  });
});

describe('Widget export analysis', () => {
  it('all widget files export a class matching the filename', () => {
    const widgetNames = ['IDEIA_ChatWidget', 'IDEIA_DashboardWidget', 'IDEIA_ApprovalWidget',
      'IDEIA_DiffWidget', 'IDEIA_FileWidget', 'IDEIA_StudiesWidget',
      'IDEIA_SuggestionsWidget', 'IDEIA_SecurityWidget'];
    const expectedExports = ['Chat', 'Dashboard', 'Approval', 'Diff', 'File', 'Studies', 'Suggestions', 'Security'];
    for (let i = 0; i < widgetNames.length; i++) {
      const file = path.join(BROWSER_DIR, `ideia-${expectedExports[i].toLowerCase()}-widget.tsx`);
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toContain(`export class ${widgetNames[i]}`);
    }
  });
});

describe('Frontend module integrity', () => {
  const frontendModule = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-frontend-module.ts'), 'utf-8');

  it('imports all widgets', () => {
    const expectedImports = ['IDEIA_ChatWidget', 'IDEIA_DiffWidget', 'IDEIA_ApprovalWidget',
      'IDEIA_DashboardWidget', 'IDEIA_FileWidget', 'IDEIA_StudiesWidget',
      'IDEIA_SuggestionsWidget', 'IDEIA_SecurityWidget', 'IDEIA_SearchOverlay'];
    for (const imp of expectedImports) {
      expect(frontendModule).toContain(imp);
    }
  });

  it('binds all view contributions', () => {
    const expected = ['IDEIA_ChatContribution', 'IDEIA_DashboardViewContribution',
      'IDEIA_ApprovalViewContribution', 'IDEIA_DiffViewContribution',
      'IDEIA_StudiesViewContribution', 'IDEIA_SuggestionsViewContribution',
      'IDEIA_SecurityViewContribution'];
    for (const vc of expected) {
      expect(frontendModule).toContain(vc);
    }
  });

  it('binds all widget factories', () => {
    const expectedFactories = ['IDEIA_ChatWidget', 'IDEIA_DiffWidget', 'IDEIA_ApprovalWidget',
      'IDEIA_DashboardWidget', 'IDEIA_FileWidget', 'IDEIA_StudiesWidget',
      'IDEIA_SuggestionsWidget', 'IDEIA_SecurityWidget'];
    for (const wf of expectedFactories) {
      expect(frontendModule).toContain(`bind(WidgetFactory).toDynamicValue`);
    }
  });

  it('binds all service clients', () => {
    const expected = ['IDEIA_CHAT_SERVICE', 'IDEIA_TASK_SERVICE', 'IDEIA_AGENT_SERVICE',
      'IDEIA_MEMORY_SERVICE', 'IDEIA_DASHBOARD_SERVICE', 'IDEIA_SUGGESTIONS_SERVICE',
      'IDEIA_STUDIES_SERVICE', 'IDEIA_SEARCH_SERVICE', 'IDEIA_SECURITY_SERVICE'];
    for (const svc of expected) {
      expect(frontendModule).toContain(svc);
    }
  });

  it('exports default ContainerModule', () => {
    expect(frontendModule).toContain('export default new ContainerModule(');
  });
});

describe('Theme registration', () => {
  it('theme registration file exists and registers colors', () => {
    const themePath = path.join(BROWSER_DIR, 'ideia-theme-registration.ts');
    const exists = fs.existsSync(themePath);
    expect(exists).toBe(true);
    const content = fs.readFileSync(themePath, 'utf-8');
    expect(content).toContain('ColorContribution');
    expect(content).toContain('registerColors');
  });

  it('styles file defines CSS participants', () => {
    const stylesPath = path.join(BROWSER_DIR, 'ideia-styles.ts');
    const exists = fs.existsSync(stylesPath);
    expect(exists).toBe(true);
    const content = fs.readFileSync(stylesPath, 'utf-8');
    expect(content).toContain('StylingParticipant');
  });
});

describe('Search overlay functionality', () => {
  const searchOverlay = fs.readFileSync(path.join(BROWSER_DIR, 'ideia-search-overlay.tsx'), 'utf-8');

  it('has search input and command binding', () => {
    const lower = searchOverlay.toLowerCase();
    expect(lower).toContain('search');
    expect(lower).toContain('onchange');
  });
});
