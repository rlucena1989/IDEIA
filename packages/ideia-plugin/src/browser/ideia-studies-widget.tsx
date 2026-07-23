import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { IDEIA_STUDIES_SERVICE, IDEIA_StudiesService, StudyItem } from '../common/ideia-protocol';

@injectable()
export class IDEIA_StudiesWidget extends BaseWidget {
  static ID = 'ideia:studies';
  static LABEL = 'IDEIA Studies';

  private root: Root | undefined;

  constructor(
    @inject(IDEIA_STUDIES_SERVICE) private readonly studiesService: IDEIA_StudiesService,
  ) {
    super();
    this.id = IDEIA_StudiesWidget.ID;
    this.title.label = IDEIA_StudiesWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-book';
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
    this.root.render(<StudiesComponent service={this.studiesService} />);
  }
}

const StudiesComponent: React.FC<{ service: IDEIA_StudiesService }> = ({ service }) => {
  const [studies, setStudies] = React.useState<StudyItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    service.getStudies().then(setStudies).catch(() => setStudies([])).finally(() => setLoading(false));
  }, [service]);

  if (loading) return <div style={{ padding: '12px', color: '#666', fontSize: '12px' }}>Loading studies...</div>;

  const active = studies.filter(s => s.status === 'active');
  const completed = studies.filter(s => s.status === 'completed');

  return (
    <div style={{ padding: '12px', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#888', marginBottom: '12px', letterSpacing: '0.5px' }}>
        Active Studies
      </div>
      {active.map(s => (
        <div key={s.id} style={{ background: '#1a1a1a', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', borderLeft: '3px solid #16a34a' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{s.name}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>{s.description}</div>
        </div>
      ))}
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#888', marginTop: '20px', marginBottom: '12px', letterSpacing: '0.5px' }}>
        Completed
      </div>
      {completed.map(s => (
        <div key={s.id} style={{ background: '#1a1a1a', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', borderLeft: '3px solid #555', opacity: 0.6 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{s.name}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>{s.description}</div>
        </div>
      ))}
      {studies.length === 0 && (
        <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No studies available</div>
      )}
    </div>
  );
};