import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { FixedSizeList as List } from 'react-window';
import { BaseWidget } from '@theia/core/lib/browser';
import { MessageService } from '@theia/core/lib/common/message-service';
import { IDEIA_CHAT_SERVICE, _IDEIA_TASK_PATH, IDEIA_ChatService } from '../common/ideia-protocol';
import { ChatMessage, ToolCall, Checkpoint, FileChange, SSEEvent } from '../common/ideia-types';

interface MessagesState {
  messages: ChatMessage[];
  checkpoints: Checkpoint[];
}

interface UIState {
  input: string;
  streaming: boolean;
  conversationId: string;
  error: string | null;
}

interface ChatRowProps {
  messages: ChatMessage[];
  streaming: boolean;
  index: number;
  style: React.CSSProperties;
}

const ChatRow = React.memo(function ChatRow({ messages, streaming, index, style }: ChatRowProps) {
  if (index >= messages.length) {
    if (!streaming) return null;
    return (
      <div style={{ ...style, padding: '8px', color: 'var(--theia-descriptionForeground)', fontStyle: 'italic' }}>
        <span className="codicon codicon-loading codicon-modifier-spin" /> Thinking...
      </div>
    );
  }
  return <div style={style}><ChatMessageItem msg={messages[index]} /></div>;
});

@injectable()
export class IDEIA_ChatWidget extends BaseWidget {
  static ID = 'ideia:chat';
  static LABEL = 'IDEIA Assistant';

  private root: Root | undefined;
  private messagesState: MessagesState;
  private uiState: UIState;
  private containerRef: HTMLDivElement | undefined;
  private messagesEndRef: HTMLDivElement | undefined;
  private assistantContent = '';

  constructor(
    @inject(IDEIA_CHAT_SERVICE) private chatService: IDEIA_ChatService,
    @inject(MessageService) private messageService: MessageService,
  ) {
    super();
    this.id = IDEIA_ChatWidget.ID;
    this.title.label = IDEIA_ChatWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-comment-discussion';
    this.title.caption = 'IDEIA - Transform ideas into systems';

    this.messagesState = {
      messages: [],
      checkpoints: [],
    };

    this.uiState = {
      input: '',
      streaming: false,
      conversationId: '',
      error: null,
    };

    this.node.style.display = 'flex';
    this.node.style.flexDirection = 'column';
    this.node.style.height = '100%';
    this.node.style.overflow = 'hidden';
  }

  @postConstruct()
  async init(): Promise<void> {
    const convId = await this.chatService.createConversation();
    this.setUIState({ conversationId: convId });

    this.addSystemMessage('Welcome to IDEIA. Describe the system you want to build and I will architect, implement, and verify it for you.');
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
      const container = document.createElement('div');
      container.id = 'ideia-chat-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.height = '100%';
      this.node.appendChild(container);
      this.root = createRoot(container);
    }
    this.root.render(this.renderComponent());
  }

  private renderComponent(): React.ReactElement {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--theia-ui-font-family)' }}>
        {this.renderHeader()}
        {this.renderMessages()}
        {this.renderCheckpoints()}
        {this.renderInputBar()}
      </div>
    );
  }

  private renderHeader(): React.ReactElement {
    return (
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--theia-border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--theia-titleBar-activeBackground)',
      }}>
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--theia-titleBar-activeForeground)' }}>
          IDEIA
        </span>
        {this.uiState.streaming && (
          <span style={{ fontSize: '11px', color: 'var(--theia-activityBar-foreground)' }}>
            Processing...
          </span>
        )}
      </div>
    );
  }

  private renderMessages(): React.ReactElement {
    const { messages } = this.messagesState;
    const { streaming } = this.uiState;
    const itemCount = messages.length + (streaming ? 1 : 0);

    if (!streaming && itemCount === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theia-descriptionForeground)', fontSize: '13px' }}>
          Start a conversation by describing the system you want to build.
        </div>
      );
    }

    return (
      <div ref={el => { this.containerRef = el || undefined; }} style={{ flex: 1, overflow: 'hidden' }}>
        <List
          height={this.containerRef?.clientHeight || 400}
          itemCount={itemCount}
          itemSize={80}
          width="100%"
          overscanCount={5}
          onItemsRendered={({ visibleStopIndex }) => {
            if (visibleStopIndex >= itemCount - 1) {
              this.messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {({ index, style }) => (
            <ChatRow messages={messages} streaming={streaming} index={index} style={style} />
          )}
        </List>
        <div ref={el => { this.messagesEndRef = el || undefined; }} />
      </div>
    );
  }

  private renderCheckpoints(): React.ReactElement {
    const { checkpoints } = this.messagesState;
    if (checkpoints.length === 0) return <></>;
    return (
      <div style={{
        borderTop: '1px solid var(--theia-border-color)',
        padding: '8px 12px',
        maxHeight: '200px',
        overflowY: 'auto',
        background: 'var(--theia-sideBar-background)',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--theia-foreground)' }}>
          Pending Approvals ({checkpoints.filter(c => c.status === 'pending').length})
        </div>
        {checkpoints.map((cp: Checkpoint) => (
          <div key={cp.id} style={{
            padding: '6px 8px',
            marginBottom: '4px',
            borderRadius: '4px',
            border: '1px solid var(--theia-border-color)',
            background: 'var(--theia-input-background)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '12px' }}>{cp.title}</span>
                <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.7 }}>{cp.description}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={approveBtnStyle}
                  onClick={() => this.handleApprove(cp.id)}
                  disabled={this.uiState.streaming}
                >
                  Approve
                </button>
                <button
                  style={rejectBtnStyle}
                  onClick={() => this.handleReject(cp.id)}
                  disabled={this.uiState.streaming}
                >
                  Reject
                </button>
              </div>
            </div>
            {cp.changes && cp.changes.length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
                {cp.changes?.map((fc: FileChange) => `${fc.status === 'added' ? '+' : fc.status === 'deleted' ? '-' : '~'} ${fc.path}`).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  private renderInputBar(): React.ReactElement {
    return (
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--theia-border-color)',
        display: 'flex',
        gap: '8px',
        background: 'var(--theia-sideBar-background)',
      }}>
        <textarea
          value={this.uiState.input}
          onChange={e => this.setUIState({ input: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); } }}
          placeholder="Describe the system you want to build..."
          disabled={this.uiState.streaming}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid var(--theia-border-color)',
            background: 'var(--theia-input-background)',
            color: 'var(--theia-input-foreground)',
            fontFamily: 'var(--theia-ui-font-family)',
            fontSize: '13px',
            resize: 'none',
            minHeight: '32px',
            maxHeight: '120px',
          }}
          rows={2}
        />
        <button
          onClick={() => this.handleSend()}
          disabled={this.uiState.streaming || !this.uiState.input.trim()}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            border: 'none',
            background: this.uiState.streaming || !this.uiState.input.trim()
              ? 'var(--theia-button-disabledBackground)'
              : 'var(--theia-button-background)',
            color: this.uiState.streaming || !this.uiState.input.trim()
              ? 'var(--theia-button-disabledForeground)'
              : 'var(--theia-button-foreground)',
            cursor: this.uiState.streaming || !this.uiState.input.trim() ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          Send
        </button>
      </div>
    );
  }

  private async handleSend(): Promise<void> {
    const text = this.uiState.input.trim();
    if (!text || this.uiState.streaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    this.setUIState({
      input: '',
      streaming: true,
      error: null,
    });
    this.setMessagesState({
      messages: [...this.messagesState.messages, userMessage],
    });

    try {
      const stream = this.chatService.streamMessage({
        conversationId: this.uiState.conversationId,
        message: text,
      });

      this.assistantContent = '';
      const toolCalls: ToolCall[] = [];

      for await (const event of stream) {
        this.handleSSEEvent(event, toolCalls);
      }

      const finalMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: this.assistantContent,
        timestamp: new Date().toISOString(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      this.setUIState({ streaming: false });
      this.setMessagesState({
        messages: [...this.messagesState.messages, finalMessage],
      });

      this.scrollToBottom();
    } catch (err) {
      this.setUIState({
        streaming: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      });
      this.messageService.error(`IDEIA error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private handleSSEEvent(event: SSEEvent, toolCalls: ToolCall[]): void {
    switch (event.type) {
      case 'message': {
        const chunk = event.data as string;
        this.assistantContent += chunk;
        const msgs = [...this.messagesState.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: this.assistantContent };
        } else {
          msgs.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: this.assistantContent,
            timestamp: new Date().toISOString(),
          });
        }
        this.setMessagesState({ messages: msgs });
        break;
      }
      case 'tool_call': {
        const tc = event.data as ToolCall;
        toolCalls.push(tc);
        this.setMessagesState({
          messages: [...this.messagesState.messages],
        });
        break;
      }
      case 'checkpoint': {
        const cp = event.data as Checkpoint;
        this.setMessagesState({
          checkpoints: [...this.messagesState.checkpoints, cp],
        });
        break;
      }
      case 'error': {
        const errMsg = event.data as string;
        this.setUIState({ error: errMsg });
        break;
      }
      case 'done':
        break;
      case 'progress': {
        break;
      }
    }
  }

  private async handleApprove(checkpointId: string): Promise<void> {
    try {
      await this.chatService.approveCheckpoint(checkpointId);
      this.setUIState({
        error: null,
      } as Partial<UIState>);
      this.setMessagesState({
        checkpoints: this.messagesState.checkpoints.map(cp =>
          cp.id === checkpointId ? { ...cp, status: 'approved' as const } : cp
        ),
      });
    } catch (err) {
      this.messageService.error(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private async handleReject(checkpointId: string): Promise<void> {
    try {
      await this.chatService.rejectCheckpoint(checkpointId);
      this.setUIState({
        error: null,
      } as Partial<UIState>);
      this.setMessagesState({
        checkpoints: this.messagesState.checkpoints.map(cp =>
          cp.id === checkpointId ? { ...cp, status: 'rejected' as const } : cp
        ),
      });
    } catch (err) {
      this.messageService.error(`Failed to reject: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private addSystemMessage(content: string): void {
    this.setMessagesState({
      messages: [...this.messagesState.messages, {
        id: crypto.randomUUID(),
        role: 'system',
        content,
        timestamp: new Date().toISOString(),
      }],
    });
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  private setMessagesState(partial: Partial<MessagesState>): void {
    this.messagesState = { ...this.messagesState, ...partial };
    this.renderReact();
  }

  private setUIState(partial: Partial<UIState>): void {
    this.uiState = { ...this.uiState, ...partial };
    this.renderReact();
  }
}

const ChatMessageItem = React.memo(function ChatMessageItem({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const isTool = msg.role === 'tool';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '4px',
    }}>
      <div style={{
        maxWidth: '85%', padding: '8px 12px', borderRadius: '8px',
        background: isUser ? 'var(--theia-button-background)'
          : isTool ? 'var(--theia-input-background)' : 'var(--theia-sideBar-background)',
        color: isUser ? 'var(--theia-button-foreground)' : 'var(--theia-foreground)',
        fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        border: isTool ? '1px solid var(--theia-border-color)' : 'none',
      }}>
        {msg.role !== 'user' && (
          <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', opacity: 0.7 }}>
            {isTool ? `Tool: ${msg.toolCalls?.[0]?.name ?? 'unknown'}` : 'IDEIA'}
          </div>
        )}
        <div>{msg.content}</div>
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--theia-border-color)', paddingTop: '4px' }}>
            {msg.toolCalls.map(tc => <ToolCallItem key={tc.id} toolCall={tc} />)}
          </div>
        )}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginTop: '2px' }}>
        {new Date(msg.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});

const ToolCallItem = React.memo(function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const statusIcon = toolCall.status === 'completed' ? 'check'
    : toolCall.status === 'running' ? 'sync~spin'
    : toolCall.status === 'failed' ? 'close' : 'circle-outline';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 0' }}>
      <span className={`codicon codicon-${statusIcon}`} />
      <span>{toolCall.name}</span>
      {toolCall.status === 'completed' && <span style={{ opacity: 0.6 }}>done</span>}
      {toolCall.error && <span style={{ color: 'var(--theia-errorForeground)' }}>{toolCall.error}</span>}
    </div>
  );
});

const approveBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: '3px',
  border: '1px solid var(--theia-button-background)',
  background: 'var(--theia-button-background)',
  color: 'var(--theia-button-foreground)',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
};

const rejectBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: '3px',
  border: '1px solid var(--theia-errorForeground)',
  background: 'transparent',
  color: 'var(--theia-errorForeground)',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
};