import { analyzeLayout } from '../runtime/layout-analyzer';

describe('layout-analyzer', () => {
it('should detect React framework', () => {
    const code = 'import React from "react"; function App() { return <div>test</div>; }';
    const report = analyzeLayout(code, 'App.tsx');
    expect(report.framework).toBe('React');
  });

  it('should detect layout regions', () => {
    const code = '<header>Title</header><nav>Menu</nav><main>Content</main><footer>Footer</footer>';
    const report = analyzeLayout(code, 'page.tsx');
    expect(report.totalRegions).toBeGreaterThan(0);
    expect(report.layoutType).toBeDefined();
  });

  it('should detect responsive design', () => {
    const code = '@media (max-width: 768px) { .container { flex-wrap: wrap; } }';
    const report = analyzeLayout(code, 'styles.css');
    expect(report.responsive).toBe(true);
  });

  it('should return score', () => {
    const code = '<header>H</header><main>M</main>';
    const report = analyzeLayout(code, 'test.tsx');
    expect(report.score).toBeGreaterThanOrEqual(0);
  });
});
