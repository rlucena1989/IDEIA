import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { JSONSchemaProvider, ValidationError } from './ideia-json-schema-provider';

interface QuickFix {
  label: string;
  apply: () => void;
}

interface JSONEditorProps {
  container: HTMLElement;
  schemaProvider: JSONSchemaProvider;
  contractId?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
}

interface JSONEditorState {
  value: string;
  parsed: unknown;
  errors: ValidationError[];
  formatted: boolean;
  contractId: string;
}

const QUICK_FIXES: Record<string, (path: string) => QuickFix | null> = {
  REQUIRED: (path: string) => ({
    label: `Add missing field "${path.split('.').pop()}"`,
    apply: () => {},
  }),
  TYPE_MISMATCH: (_path: string) => ({
    label: 'Convert to correct type',
    apply: () => {},
  }),
  ENUM_MISMATCH: (_path: string) => ({
    label: 'Use first valid enum value',
    apply: () => {},
  }),
};

export class JSONEditor {
  private root: Root | undefined;
  private container: HTMLElement;
  private schemaProvider: JSONSchemaProvider;
  private state: JSONEditorState;
  private onChange?: (value: string) => void;
  private selectedErrorIndex = 0;

  constructor(props: JSONEditorProps) {
    this.container = props.container;
    this.schemaProvider = props.schemaProvider;
    this.onChange = props.onChange;
    this.state = {
      value: props.initialValue ?? '{\n  \n}',
      parsed: null,
      errors: [],
      formatted: true,
      contractId: props.contractId ?? '',
    };
  }

  mount(): void {
    const div = document.createElement('div');
    div.id = 'ideia-json-editor';
    div.style.cssText = 'display:flex;flex-direction:column;height:100%;';
    this.container.appendChild(div);
    this.root = createRoot(div);
    this.parseAndValidate();
    this.render();
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  setValue(value: string): void {
    this.state.value = value;
    this.parseAndValidate();
    this.render();
  }

  setContractId(contractId: string): void {
    this.state.contractId = contractId;
    this.parseAndValidate();
    this.render();
  }

  getValue(): string {
    return this.state.value;
  }

  private parseAndValidate(): void {
    try {
      this.state.parsed = JSON.parse(this.state.value);
      this.state.errors = [];

      if (this.state.contractId) {
        const schema = this.schemaProvider.getSchema(this.state.contractId);
        if (schema) {
          this.state.errors = this.schemaProvider.validate(this.state.parsed, schema);
        }
      }
    } catch {
      this.state.parsed = null;
      this.state.errors = [{
        path: '$',
        message: 'Invalid JSON syntax',
        code: 'PARSE_ERROR',
      }];
    }
  }

  private getQuickFixes(): QuickFix[] {
    if (this.state.errors.length === 0) return [];
    const error = this.state.errors[this.selectedErrorIndex] ?? this.state.errors[0];
    const fixFn = QUICK_FIXES[error.code];
    if (fixFn) {
      const fix = fixFn(error.path);
      if (fix) return [fix];
    }
    return [];
  }

  private formatJson(): void {
    try {
      const parsed = JSON.parse(this.state.value);
      this.state.value = JSON.stringify(parsed, null, 2);
      this.state.formatted = true;
      this.parseAndValidate();
      this.render();
    } catch {
      this.state.formatted = false;
      this.render();
    }
  }

  private render(): void {
    if (!this.root) return;
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    const hasErrors = this.state.errors.length > 0;
    const fixes = this.getQuickFixes();

    return (
      <div style={styles.container}>
        <div style={styles.toolbar}>
          <span style={styles.contractLabel}>
            {this.state.contractId || 'No schema selected'}
          </span>
          <div style={styles.toolbarActions}>
            <button style={styles.toolbarBtn} onClick={() => this.formatJson()} aria-label="Format JSON">
              Format
            </button>
            <span style={{
              ...styles.statusBadge,
              background: hasErrors ? 'var(--theia-errorForeground)' : 'var(--theia-successForeground)',
            }}>
              {hasErrors ? `${this.state.errors.length} error(s)` : 'Valid'}
            </span>
          </div>
        </div>

        <div style={styles.editorContainer}>
          <textarea
            value={this.state.value}
            onChange={e => {
              this.state.value = e.target.value;
              this.parseAndValidate();
              if (this.onChange) this.onChange(e.target.value);
              this.render();
            }}
            style={{
              ...styles.textarea,
              borderColor: hasErrors ? 'var(--theia-errorForeground)' : 'var(--theia-border-color)',
            }}
            spellCheck={false}
          />
        </div>

        {hasErrors && (
          <div style={styles.errorPanel}>
            <div style={styles.errorHeader}>Problems</div>
            {this.state.errors.map((err, i) => (
              <div
                key={`${err.path}-${i}`}
                style={{
                  ...styles.errorItem,
                  background: i === this.selectedErrorIndex ? 'var(--theia-list-hoverBackground)' : 'transparent',
                }}
                onClick={() => { this.selectedErrorIndex = i; this.render(); }}
              >
                <span style={styles.errorPath}>{err.path}</span>
                <span style={styles.errorMessage}>{err.message}</span>
                <span style={styles.errorCode}>({err.code})</span>
              </div>
            ))}
            {fixes.length > 0 && (
              <div style={styles.fixPanel}>
                {fixes.map((fix, i) => (
                  <button key={i} style={styles.fixBtn} onClick={fix.apply} aria-label={`Apply fix: ${fix.label}`}>
                    {fix.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: 'var(--theia-ui-font-family)',
    fontSize: '13px', color: 'var(--theia-foreground)',
  },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 12px',
    borderBottom: '1px solid var(--theia-border-color)',
    background: 'var(--theia-sideBar-background)',
  },
  contractLabel: { fontSize: '12px', opacity: 0.7 },
  toolbarActions: { display: 'flex', gap: '4px', alignItems: 'center' },
  toolbarBtn: {
    padding: '2px 8px', fontSize: '11px',
    background: 'var(--theia-button-background)',
    color: 'var(--theia-button-foreground)',
    border: 'none', borderRadius: '3px', cursor: 'pointer',
  },
  statusBadge: {
    padding: '2px 8px', fontSize: '11px', borderRadius: '3px',
    color: '#fff', fontWeight: 600,
  },
  editorContainer: { flex: 1, overflow: 'hidden' },
  textarea: {
    width: '100%', height: '100%', resize: 'none',
    border: '1px solid var(--theia-border-color)',
    background: 'var(--theia-input-background)',
    color: 'var(--theia-input-foreground)',
    fontFamily: 'monospace', fontSize: '13px',
    padding: '8px', boxSizing: 'border-box',
  },
  errorPanel: {
    maxHeight: '150px', overflowY: 'auto',
    borderTop: '1px solid var(--theia-border-color)',
    background: 'var(--theia-sideBar-background)',
  },
  errorHeader: {
    padding: '4px 12px', fontSize: '11px', fontWeight: 600,
    borderBottom: '1px solid var(--theia-border-color)',
    background: 'var(--theia-editorWidget-background)',
  },
  errorItem: {
    display: 'flex', gap: '8px', padding: '4px 12px', cursor: 'pointer',
    fontSize: '12px', alignItems: 'center',
  },
  errorPath: { fontFamily: 'monospace', opacity: 0.6, minWidth: '80px' },
  errorMessage: { flex: 1 },
  errorCode: { fontSize: '10px', opacity: 0.4 },
  fixPanel: {
    display: 'flex', gap: '4px', padding: '4px 12px',
    borderTop: '1px solid var(--theia-border-color)',
  },
  fixBtn: {
    padding: '2px 8px', fontSize: '11px',
    background: 'var(--theia-button-background)',
    color: 'var(--theia-button-foreground)',
    border: 'none', borderRadius: '3px', cursor: 'pointer',
  },
};
