/** Tipo que define token category. */
export type TokenCategory = 'color' | 'spacing' | 'typography' | 'radius' | 'shadow' | 'breakpoint' | 'zindex' | 'opacity';

/** Tipo que define layout pattern. */
export type LayoutPattern = 'sidebar-content' | 'header-content-footer' | 'drawer' | 'wizard' | 'grid' | 'centered-card' | 'fullscreen';

/** Interface que define a estrutura de design token. */
export interface DesignToken {
  name: string;
  value: string;
  category: TokenCategory;
  description: string;
  tags: string[];
}

/** Interface que define a estrutura de layout template. */
export interface LayoutTemplate {
  id: LayoutPattern;
  name: string;
  description: string;
  areas: string[];
  columns: string;
  rows: string;
  usage: string;
}

/** Processa u i l t_ i n_ t o k e n s. */
export const BUILT_IN_TOKENS: DesignToken[] = [
  { name: 'color-primary', value: '#2563eb', category: 'color', description: 'Primary brand color', tags: ['brand', 'main'] },
  { name: 'color-primary-hover', value: '#1d4ed8', category: 'color', description: 'Primary hover state', tags: ['brand', 'hover'] },
  { name: 'color-secondary', value: '#64748b', category: 'color', description: 'Secondary brand color', tags: ['brand', 'neutral'] },
  { name: 'color-success', value: '#16a34a', category: 'color', description: 'Success state', tags: ['feedback', 'positive'] },
  { name: 'color-warning', value: '#d97706', category: 'color', description: 'Warning state', tags: ['feedback', 'caution'] },
  { name: 'color-error', value: '#dc2626', category: 'color', description: 'Error state', tags: ['feedback', 'negative'] },
  { name: 'color-bg', value: '#ffffff', category: 'color', description: 'Page background', tags: ['background'] },
  { name: 'color-bg-secondary', value: '#f8fafc', category: 'color', description: 'Secondary background', tags: ['background', 'muted'] },
  { name: 'color-text', value: '#0f172a', category: 'color', description: 'Primary text', tags: ['text', 'foreground'] },
  { name: 'color-text-secondary', value: '#475569', category: 'color', description: 'Secondary text', tags: ['text', 'muted'] },
  { name: 'color-border', value: '#e2e8f0', category: 'color', description: 'Border color', tags: ['border', 'divider'] },
  { name: 'spacing-xs', value: '4px', category: 'spacing', description: 'Extra small spacing', tags: ['padding', 'gap'] },
  { name: 'spacing-sm', value: '8px', category: 'spacing', description: 'Small spacing', tags: ['padding', 'gap'] },
  { name: 'spacing-md', value: '16px', category: 'spacing', description: 'Medium spacing', tags: ['padding', 'gap'] },
  { name: 'spacing-lg', value: '24px', category: 'spacing', description: 'Large spacing', tags: ['padding', 'gap'] },
  { name: 'spacing-xl', value: '32px', category: 'spacing', description: 'Extra large spacing', tags: ['padding', 'gap'] },
  { name: 'font-size-xs', value: '12px', category: 'typography', description: 'Extra small text', tags: ['font', 'size'] },
  { name: 'font-size-sm', value: '14px', category: 'typography', description: 'Small text', tags: ['font', 'size'] },
  { name: 'font-size-md', value: '16px', category: 'typography', description: 'Body text', tags: ['font', 'size'] },
  { name: 'font-size-lg', value: '18px', category: 'typography', description: 'Large text', tags: ['font', 'size'] },
  { name: 'font-size-xl', value: '24px', category: 'typography', description: 'Heading small', tags: ['font', 'size', 'heading'] },
  { name: 'font-size-2xl', value: '30px', category: 'typography', description: 'Heading medium', tags: ['font', 'size', 'heading'] },
  { name: 'font-size-3xl', value: '36px', category: 'typography', description: 'Heading large', tags: ['font', 'size', 'heading'] },
  { name: 'font-weight-normal', value: '400', category: 'typography', description: 'Normal text weight', tags: ['font', 'weight'] },
  { name: 'font-weight-medium', value: '500', category: 'typography', description: 'Medium text weight', tags: ['font', 'weight'] },
  { name: 'font-weight-bold', value: '700', category: 'typography', description: 'Bold text weight', tags: ['font', 'weight'] },
  { name: 'radius-sm', value: '4px', category: 'radius', description: 'Small border radius', tags: ['border', 'rounded'] },
  { name: 'radius-md', value: '8px', category: 'radius', description: 'Medium border radius', tags: ['border', 'rounded'] },
  { name: 'radius-lg', value: '12px', category: 'radius', description: 'Large border radius', tags: ['border', 'rounded'] },
  { name: 'radius-full', value: '9999px', category: 'radius', description: 'Full round radius', tags: ['border', 'pill'] },
  { name: 'shadow-sm', value: '0 1px 2px rgba(0,0,0,0.05)', category: 'shadow', description: 'Small shadow', tags: ['elevation', 'card'] },
  { name: 'shadow-md', value: '0 4px 6px rgba(0,0,0,0.1)', category: 'shadow', description: 'Medium shadow', tags: ['elevation', 'dropdown'] },
  { name: 'shadow-lg', value: '0 10px 15px rgba(0,0,0,0.1)', category: 'shadow', description: 'Large shadow', tags: ['elevation', 'modal'] },
];

/** Processa u i l t_ i n_ l a y o u t s. */
export const BUILT_IN_LAYOUTS: LayoutTemplate[] = [
  { id: 'sidebar-content', name: 'Sidebar + Content', description: 'Fixed sidebar with main content area', areas: ['sidebar', 'content'], columns: '250px 1fr', rows: '1fr', usage: 'Admin panels, dashboards' },
  { id: 'header-content-footer', name: 'Header + Content + Footer', description: 'Standard page layout', areas: ['header', 'content', 'footer'], columns: '1fr', rows: 'auto 1fr auto', usage: 'Marketing pages, landing pages' },
  { id: 'drawer', name: 'Drawer Layout', description: 'Overlay panel from the side', areas: ['backdrop', 'drawer'], columns: '1fr', rows: '1fr', usage: 'Modals, side panels, mobile menus' },
  { id: 'wizard', name: 'Wizard / Stepper', description: 'Multi-step form with progress', areas: ['header', 'steps', 'content', 'footer'], columns: '1fr', rows: 'auto auto 1fr auto', usage: 'Checkout, registration, setup' },
  { id: 'grid', name: 'Card Grid', description: 'Responsive grid of cards', areas: ['grid'], columns: 'repeat(auto-fill, minmax(300px, 1fr))', rows: 'auto', usage: 'Product listings, galleries, dashboards' },
  { id: 'centered-card', name: 'Centered Card', description: 'Vertically and horizontally centered card', areas: ['card'], columns: '1fr', rows: '1fr', usage: 'Login, signup, error pages' },
  { id: 'fullscreen', name: 'Fullscreen', description: 'Full viewport content', areas: ['content'], columns: '1fr', rows: '1fr', usage: 'Presentations, media viewers' },
];

/**
 * Obtém token.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function getToken(name: string): DesignToken | undefined {
  return BUILT_IN_TOKENS.find(t => t.name === name);
}

/**
 * Obtém tokens by category.
 * @param category - Valor category.
 * @returns O resultado da operação.
 */
export function getTokensByCategory(category: TokenCategory): DesignToken[] {
  return BUILT_IN_TOKENS.filter(t => t.category === category);
}

/**
 * Pesquisa tokens.
 * @param query - Consulta query.
 * @returns O resultado da operação.
 */
export function searchTokens(query: string): DesignToken[] {
  const q = query.toLowerCase();
  return BUILT_IN_TOKENS.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  );
}

/**
 * Formata tokens c s s.
 * @param tokens - Valor tokens.
 * @returns O resultado da operação.
 */
export function formatTokensCSS(tokens: DesignToken[]): string {
  const lines = tokens.map(t => `  --${t.name}: ${t.value};`);
  return [':root {', ...lines, '}'].join('\n');
}

/**
 * Formata tokens j s o n.
 * @param tokens - Valor tokens.
 * @returns O resultado da operação.
 */
export function formatTokensJSON(tokens: DesignToken[]): string {
  const map: Record<string, string> = {};
  for (const t of tokens) {
    map[t.name] = t.value;
  }
  return JSON.stringify(map, null, 2);
}

/**
 * Formata tokens s c s s.
 * @param tokens - Valor tokens.
 * @returns O resultado da operação.
 */
export function formatTokensSCSS(tokens: DesignToken[]): string {
  return tokens.map(t => `$${t.name}: ${t.value};`).join('\n');
}
