import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { Widget } from '@theia/core/lib/browser';
import { IDEIA_SEARCH_SERVICE, IDEIA_SearchService, SearchResult } from '../common/ideia-protocol';

@injectable()
export class IDEIA_SearchOverlay extends Widget {
  static ID = 'ideia:search-overlay';
  static LABEL = 'IDEIA Search';

  private root: Root | undefined;
  private visible = false;

  constructor(
    @inject(IDEIA_SEARCH_SERVICE) private readonly searchService: IDEIA_SearchService,
  ) {
    super();
    this.id = IDEIA_SearchOverlay.ID;
    this.title.label = IDEIA_SearchOverlay.LABEL;
    this.node.style.display = 'none';
    this.node.style.position = 'fixed';
    this.node.style.top = '0';
    this.node.style.left = '0';
    this.node.style.width = '100%';
    this.node.style.height = '100%';
    this.node.style.zIndex = '9999';
  }

  open(): void {
    this.visible = true;
    this.node.style.display = 'block';
    this.renderReact();
  }

  override close(): void {
    this.visible = false;
    this.node.style.display = 'none';
  }

  protected override onAfterAttach(): void {
    this.render();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private render(): void {
    if (!this.root) {
      this.root = createRoot(this.node);
    }
    this.root.render(this.renderComponent());
  }

  private renderReact(): void {
    this.render();
  }

  private renderComponent(): React.ReactElement {
    if (!this.visible) return <></>;
    return <SearchOverlayComponent service={this.searchService} onClose={() => this.close()} />;
  }
}

const SearchOverlayComponent: React.FC<{ service: IDEIA_SearchService; onClose: () => void }> = ({ service, onClose }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      service.search(query).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, service]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
      paddingTop: '80px', zIndex: 10000,
    }} onClick={() => onClose()}>
      <div style={{
        background: '#1a1a1a', borderRadius: '8px', width: '500px', maxHeight: '400px',
        overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
      }} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', background: '#222', border: 'none',
            color: '#e0e0e0', fontSize: '14px', outline: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        />
        <div style={{ padding: '8px 0', maxHeight: '340px', overflow: 'auto' }}>
          {results.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => onClose()}>
              <span className={item.icon} style={{ color: '#888', fontSize: '14px' }} />
              <div>
                <div style={{ color: '#e0e0e0' }}>{item.label}</div>
                <div style={{ color: '#666', fontSize: '11px' }}>{item.description}</div>
              </div>
            </div>
          ))}
          {query.trim() && results.length === 0 && (
            <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No results</div>
          )}
        </div>
      </div>
    </div>
  );
};