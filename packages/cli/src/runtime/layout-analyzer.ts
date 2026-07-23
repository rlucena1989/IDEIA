/** Interface que define a estrutura de layout region. */
export interface LayoutRegion {
  role: 'header' | 'sidebar' | 'content' | 'footer' | 'modal' | 'form' | 'navigation' | 'grid' | 'card' | 'list';
  tag: string;
  classOrId: string;
  children: number;
  detected: boolean;
}

/** Interface que define a estrutura de component analysis. */
export interface ComponentAnalysis {
  name: string;
  type: 'presentational' | 'container' | 'layout' | 'form' | 'navigation' | 'feedback' | 'data-display' | 'utility';
  props: string[];
  dependencies: string[];
  linesOfCode: number;
  complexity: number;
}

/** Interface que define a estrutura de layout report. */
export interface LayoutReport {
  regions: LayoutRegion[];
  totalRegions: number;
  layoutType: 'single' | 'sidebar' | 'header-footer' | 'complex' | 'unknown';
  components: ComponentAnalysis[];
  responsive: boolean;
  framework: string;
  score: number;
}

const LAYOUT_CLASSES = [
  { role: 'header' as const, patterns: [/header/i, /nav/i, /topbar/i] },
  { role: 'sidebar' as const, patterns: [/sidebar/i, /aside/i, /sidenav/i] },
  { role: 'content' as const, patterns: [/content/i, /main/i, /container/i] },
  { role: 'footer' as const, patterns: [/footer/i, /bottom/i, /foot/i] },
  { role: 'modal' as const, patterns: [/modal/i, /dialog/i, /overlay/i] },
  { role: 'form' as const, patterns: [/form/i, /input/i, /field/i] },
  { role: 'navigation' as const, patterns: [/menu/i, /nav/i, /tabs/i, /breadcrumb/i] },
  { role: 'grid' as const, patterns: [/grid/i, /row/i, /col/i, /flex/i] },
  { role: 'card' as const, patterns: [/card/i, /panel/i, /box/i] },
  { role: 'list' as const, patterns: [/list/i, /table/i, /item/i] },
];

const COMPONENT_PATTERNS = [
  { type: 'presentational' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:return\s+\(?\s*<)/g },
  { type: 'container' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:useEffect|useState|useSelector|useDispatch)/g },
  { type: 'form' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:<form|<input|<select|<textarea)/g },
  { type: 'layout' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:<div|<section|<aside|<header|<footer)/g },
  { type: 'navigation' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:<a\s+href|<Link|<Nav|<Menu)/g },
  { type: 'feedback' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:toast|alert|notification|error|loading|spinner)/g },
  { type: 'data-display' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:<table|<List|<Grid|<Chart)/g },
  { type: 'utility' as const, pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?(?:use\w+|format|parse|utils?)/g },
];

/**
 * Processa layout.
 * @param content - Valor content.
 * @param filePath - Valor path.
 * @returns O resultado da operação.
 */
export function analyzeLayout(content: string, _filePath: string): LayoutReport {
  const regions: LayoutRegion[] = [];
  const components: ComponentAnalysis[] = [];
  let framework = 'unknown';
  let responsive = false;

  if (/react|jsx|tsx/i.test(content)) framework = 'React';
  else if (/vue|\.vue/i.test(content)) framework = 'Vue';
  else if (/angular|component\.ts/i.test(content)) framework = 'Angular';

  for (const lc of LAYOUT_CLASSES) {
    for (const pat of lc.patterns) {
      const match = content.match(pat);
      if (match) {
        regions.push({
          role: lc.role,
          tag: '',
          classOrId: match[0],
          children: (content.match(/<\w+/g) || []).length,
          detected: true,
        });
        break;
      }
    }
  }

  responsive = /responsive|@media|breakpoint|sm:|md:|lg:|min-width|max-width|grid-template-columns|flex-wrap/i.test(content);

  for (const cp of COMPONENT_PATTERNS) {
    const matches = content.matchAll(cp.pattern);
    for (const m of matches) {
      const name = m[1] || 'Unknown';
      const props: string[] = [];
      const propMatch = content.match(/(?:interface|type)\s+\w+Props\s*\{([^}]+)\}/);
      if (propMatch) {
        propMatch[1]!.split(';').forEach(p => { const t = p.trim().split(':')[0]; if (t) props.push(t.trim()); });
      }
      components.push({ name, type: cp.type, props: props.slice(0, 10), dependencies: [], linesOfCode: content.split('\n').length, complexity: Math.round(content.length / 100) });
    }
  }

  const regionNames = regions.map(r => r.role);
  let layoutType: LayoutReport['layoutType'] = 'unknown';
  if (regionNames.includes('sidebar') && regionNames.includes('header') && regionNames.includes('content')) layoutType = 'complex';
  else if (regionNames.includes('sidebar')) layoutType = 'sidebar';
  else if (regionNames.includes('header') && regionNames.includes('footer')) layoutType = 'header-footer';
  else if (regionNames.length === 1) layoutType = 'single';

  const score = Math.round((regions.length > 0 ? 30 : 0) + (components.length > 0 ? 30 : 0) + (responsive ? 20 : 0) + (framework !== 'unknown' ? 20 : 0));

  return { regions, totalRegions: regions.length, layoutType, components: components.slice(0, 20), responsive, framework, score };
}
