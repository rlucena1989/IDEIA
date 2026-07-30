import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable } from '@theia/core/shared/inversify';
import { Widget } from '@theia/core/lib/browser';

export interface TerminalSearchDelegate {
  search(query: string): number;
  next(): void;
  previous(): void;
  clearSearch(): void;
}

@injectable()
export class IDEIA_TerminalSearch extends Widget {
  static ID = 'ideia:terminal-search';
  static LABEL = 'Terminal Search';

  private root: Root | undefined;
  private visible = false;
  private delegate: TerminalSearchDelegate | null = null;

  constructor() {
    super();
    this.id = IDEIA_TerminalSearch.ID;
    this.title.label = IDEIA_TerminalSearch.LABEL;
    this.node.style.display = 'none';
    this.node.style.position = 'absolute';
    this.node.style.top = '0';
    this.node.style.right = '0';
    this.node.style.zIndex = '1000';
  }

  setDelegate(delegate: TerminalSearchDelegate): void {
    this.delegate = delegate;
  }

  open(): void {
    this.visible = true;
    this.node.style.display = 'block';
    this.renderReact();
  }

  override close(): void {
    this.visible = false;
    this.node.style.display = 'none';
    if (this.delegate) {
      this.delegate.clearSearch();
    }
  }

  toggle(): void {
    if (this.visible) {
      this.close();
    } else {
      this.open();
    }
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected onDetach(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  private renderReact(): void {
    if (!this.root) {
      this.root = createRoot(this.node);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    if (!this.visible) return <></>;
    return (
      <TerminalSearchOverlay
        delegate={this.delegate}
        onClose={() => this.close()}
      />
    );
  }
}

const TerminalSearchOverlay: React.FC<{ delegate: TerminalSearchDelegate | null; onClose: () => void }> = ({ delegate, onClose }) => {
  const [query, setQuery] = React.useState('');
  const [matchCount, setMatchCount] = React.useState(0);
  const [currentMatch, setCurrentMatch] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (q: string): void => {
    setQuery(q);
    if (!delegate || !q.trim()) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    const count = delegate.search(q);
    setMatchCount(count);
    setCurrentMatch(count > 0 ? 1 : 0);
  };

  const handleNext = (): void => {
    if (delegate) {
      delegate.next();
      const idx = currentMatch >= matchCount ? 1 : currentMatch + 1;
      setCurrentMatch(idx > matchCount ? 1 : idx);
    }
  };

  const handlePrev = (): void => {
    if (delegate) {
      delegate.previous();
      const idx = currentMatch <= 1 ? matchCount : currentMatch - 1;
      setCurrentMatch(idx < 1 ? matchCount : idx);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '4px 8px', background: 'var(--theia-sideBar-background, #1a1a1a)',
      border: '1px solid var(--theia-border-color, #333)',
      borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      fontFamily: 'var(--theia-ui-font-family, system-ui)',
    }}>
      <input
        ref={inputRef}
        placeholder="Find..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.shiftKey ? handlePrev() : handleNext();
          }
          if (e.key === 'Escape') onClose();
        }}
        style={{
          width: '180px', padding: '4px 6px', borderRadius: '2px', border: '1px solid var(--theia-border-color, #444)',
          background: 'var(--theia-input-background, #222)', color: 'var(--theia-foreground, #e0e0e0)',
          fontSize: '12px', outline: 'none',
        }}
      />
      {query && (
        <span style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap', minWidth: '50px', textAlign: 'center' }}>
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No results'}
        </span>
      )}
      <button
        onClick={handlePrev}
        disabled={matchCount === 0}
        style={{
          padding: '2px 6px', border: '1px solid var(--theia-border-color, #444)', borderRadius: '2px',
          background: 'transparent', color: 'var(--theia-foreground, #e0e0e0)', cursor: matchCount > 0 ? 'pointer' : 'default',
          fontSize: '11px', opacity: matchCount > 0 ? 1 : 0.3,
        }}
        title="Previous match"
      >
        &#9650;
      </button>
      <button
        onClick={handleNext}
        disabled={matchCount === 0}
        style={{
          padding: '2px 6px', border: '1px solid var(--theia-border-color, #444)', borderRadius: '2px',
          background: 'transparent', color: 'var(--theia-foreground, #e0e0e0)', cursor: matchCount > 0 ? 'pointer' : 'default',
          fontSize: '11px', opacity: matchCount > 0 ? 1 : 0.3,
        }}
        title="Next match"
      >
        &#9660;
      </button>
      <button
        onClick={onClose}
        style={{
          padding: '2px 6px', border: 'none', borderRadius: '2px',
          background: 'transparent', color: 'var(--theia-foreground, #888)', cursor: 'pointer',
          fontSize: '13px',
        }}
        title="Close search (Escape)"
      >
        &#x2715;
      </button>
    </div>
  );
};
