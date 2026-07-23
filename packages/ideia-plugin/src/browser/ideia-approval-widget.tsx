import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core/lib/common/message-service';
import { IDEIA_CHAT_SERVICE } from '../common/ideia-protocol';
import { IDEIA_ChatService } from '../common/ideia-protocol';
import { Checkpoint } from '../common/ideia-types';

@injectable()
export class IDEIA_ApprovalWidget extends BaseWidget {
  static ID = 'ideia:approvals';
  static LABEL = 'IDEIA Approvals';

  private root: Root | undefined;
  private checkpoints: Checkpoint[] = [];

  constructor(
    @inject(IDEIA_CHAT_SERVICE) private chatService: IDEIA_ChatService,
    @inject(MessageService) private messageService: MessageService,
  ) {
    super();
    this.id = IDEIA_ApprovalWidget.ID;
    this.title.label = IDEIA_ApprovalWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-pass';
    this.node.style.height = '100%';
    this.node.style.overflow = 'hidden';
  }

  setCheckpoints(checkpoints: Checkpoint[]): void {
    this.checkpoints = checkpoints;
    this.renderReact();
  }

  addCheckpoint(cp: Checkpoint): void {
    this.checkpoints = [...this.checkpoints, cp];
    this.renderReact();
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
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    const pending = this.checkpoints.filter(c => c.status === 'pending');
    const completed = this.checkpoints.filter(c => c.status !== 'pending');

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'var(--theia-ui-font-family)' }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--theia-border-color)',
          fontWeight: 600,
          fontSize: '13px',
          background: 'var(--theia-sideBar-background)',
        }}>
          Approvals ({pending.length} pending)
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {pending.length === 0 && completed.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--theia-descriptionForeground)', fontSize: '12px' }}>
              No pending approvals
            </div>
          )}
          {pending.map(cp => this.renderCheckpointCard(cp))}
          {completed.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '16px', marginBottom: '4px', opacity: 0.6 }}>
                History
              </div>
              {completed.map(cp => this.renderCheckpointCard(cp))}
            </>
          )}
        </div>
      </div>
    );
  }

  private renderCheckpointCard(cp: Checkpoint): React.ReactElement {
    const isPending = cp.status === 'pending';
    return (
      <div key={cp.id} style={{
        padding: '8px 10px',
        marginBottom: '6px',
        borderRadius: '6px',
        border: `1px solid ${
          cp.status === 'approved' ? 'var(--theia-successBackground)' :
          cp.status === 'rejected' ? 'var(--theia-errorBackground)' :
          'var(--theia-border-color)'
        }`,
        background: 'var(--theia-input-background)',
        opacity: isPending ? 1 : 0.6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '12px' }}>{cp.title}</div>
            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>{cp.description}</div>
          </div>
          {cp.status !== 'pending' && (
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '3px',
              background: cp.status === 'approved' ? 'var(--theia-successBackground)' : 'var(--theia-errorBackground)',
              color: '#fff',
            }}>
              {cp.status === 'approved' ? 'APPROVED' : 'REJECTED'}
            </span>
          )}
        </div>
        {cp.changes && cp.changes.length > 0 && (
          <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'var(--theia-code-font-family)' }}>
            {cp.changes.map(fc => (
              <div key={fc.path} style={{
                padding: '2px 4px',
                color: fc.status === 'added' ? 'var(--theia-successForeground)' :
                       fc.status === 'deleted' ? 'var(--theia-errorForeground)' :
                       'var(--theia-warningForeground)',
              }}>
                {fc.status === 'added' ? '+ ' : fc.status === 'deleted' ? '- ' : '~ '}
                {fc.path}
              </div>
            ))}
          </div>
        )}
        {isPending && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              style={{
                flex: 1,
                padding: '4px 0',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--theia-button-background)',
                color: 'var(--theia-button-foreground)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
              onClick={() => this.handleApprove(cp.id)}
            >
              Approve
            </button>
            <button
              style={{
                flex: 1,
                padding: '4px 0',
                borderRadius: '4px',
                border: '1px solid var(--theia-errorForeground)',
                background: 'transparent',
                color: 'var(--theia-errorForeground)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
              onClick={() => this.handleReject(cp.id)}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    );
  }

  private async handleApprove(id: string): Promise<void> {
    try {
      await this.chatService.approveCheckpoint(id);
      this.checkpoints = this.checkpoints.map(cp =>
        cp.id === id ? { ...cp, status: 'approved' } : cp
      );
      this.renderReact();
    } catch (err) {
      this.messageService.error(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  private async handleReject(id: string): Promise<void> {
    try {
      await this.chatService.rejectCheckpoint(id);
      this.checkpoints = this.checkpoints.map(cp =>
        cp.id === id ? { ...cp, status: 'rejected' } : cp
      );
      this.renderReact();
    } catch (err) {
      this.messageService.error(`Failed to reject: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }
}
