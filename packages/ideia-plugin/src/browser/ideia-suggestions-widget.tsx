import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_SUGGESTIONS_SERVICE, IDEIA_SuggestionsService, SuggestionItem } from '../common/ideia-protocol';

const CATEGORY_COLORS: Record<string, string> = {
  Security: '#dc2626',
  Performance: '#ea580c',
  Features: '#3b82f6',
  Quality: '#16a34a',
};

@injectable()
export class IDEIA_SuggestionsWidget extends BaseWidget {
  static ID = 'ideia:suggestions';
  static LABEL = 'IDEIA Suggestions';

  private root: Root | undefined;

  constructor(
    @inject(IDEIA_SUGGESTIONS_SERVICE) private readonly suggestionsService: IDEIA_SuggestionsService,
  ) {
    super();
    this.id = IDEIA_SuggestionsWidget.ID;
    this.title.label = IDEIA_SuggestionsWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-lightbulb';
    this.node.style.height = '100%';
    this.node.style.overflow = 'auto';
  }

  protected override onAfterAttach(): void {
    this.renderReact();
  }

  protected override onResize(): void {
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
    this.root.render(<SuggestionsComponent service={this.suggestionsService} />);
  }
}

const SuggestionsComponent: React.FC<{ service: IDEIA_SuggestionsService }> = ({ service }) => {
  const [suggestions, setSuggestions] = React.useState<SuggestionItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    service.getSuggestions().then(setSuggestions).catch(() => setSuggestions([])).finally(() => setLoading(false));
  }, [service]);

  if (loading) return <div style={{ padding: '12px', color: '#666', fontSize: '12px' }}>Loading suggestions...</div>;

  const categories = ['Security', 'Performance', 'Features', 'Quality'] as const;

  return (
    <div style={{ padding: '12px', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      {categories.map(cat => {
        const items = suggestions.filter(s => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[cat] }} />
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>
                {cat}
              </span>
            </div>
            {items.map(s => (
              <div key={s.id} style={{ background: '#1a1a1a', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', marginLeft: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{s.title}</span>
                  <span style={{ fontSize: '10px', color: '#666', background: '#222', padding: '2px 6px', borderRadius: '3px' }}>
                    {s.effort}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: CATEGORY_COLORS[s.priority], fontWeight: 600 }}>
                  {s.priority} Priority
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {suggestions.length === 0 && (
        <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No suggestions yet</div>
      )}
    </div>
  );
};