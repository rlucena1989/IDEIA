import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { v4 as uuid } from 'uuid';
import { EventBus } from '@ideia/event-bus';
import { evaluatePolicy } from '@ideia/policy-engine';
import type { PolicyInput } from '@ideia/policy-engine';
import { IDEIA_CHAT_SERVICE, IDEIA_AGENT_SERVICE, IDEIA_MEMORY_SERVICE, IDEIA_ChatService, IDEIA_AgentService, IDEIA_MemoryService, ChatRequest } from '../common/ideia-protocol';
import { ChatMessage, Checkpoint, SSEEvent, ToolCall, IdeaRequest, FileChange, createSSEEvent } from '../common/ideia-types';
import { IDEIA_TaskRunner } from './ideia-task-service';
import { ProviderRouter, createDefaultRouter } from './llm-provider';
import { validateChanges } from './output-validator';

const SSE_HEARTBEAT_INTERVAL_MS = 15000;
const SSE_MAX_BUFFERED_EVENTS = 50;

interface Conversation {
  id: string;
  messages: ChatMessage[];
  checkpoints: Checkpoint[];
  createdAt: string;
}

interface ActiveStream {
  abortController: AbortController;
  conversationId: string;
}

@injectable()
export class IDEIA_ChatBackendService implements IDEIA_ChatService {
  private conversations = new Map<string, Conversation>();
  private providerRouter: ProviderRouter;
  private approvedCheckpoints = new Set<string>();
  private seenToolCallIds = new Set<string>();
  private activeStreams = new Map<string, ActiveStream>();

  constructor(
    @inject(EventBus) private eventBus: EventBus,
    @inject(IDEIA_AGENT_SERVICE) private agentService: IDEIA_AgentService,
    @inject(IDEIA_MEMORY_SERVICE) private memoryService: IDEIA_MemoryService,
    @inject(IDEIA_TaskRunner) private taskRunner: IDEIA_TaskRunner,
  ) {
    this.providerRouter = createDefaultRouter();
  }

  cancelStream(conversationId: string): void {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      stream.abortController.abort();
      this.activeStreams.delete(conversationId);
    }
  }

  async createConversation(): Promise<string> {
    const id = uuid();
    this.conversations.set(id, {
      id,
      messages: [],
      checkpoints: [],
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async sendMessage(request: ChatRequest): Promise<void> {
    const conversation = this.conversations.get(request.conversationId);
    if (!conversation) throw new Error(`Conversation ${request.conversationId} not found`);

    conversation!.messages.push({
      id: uuid(),
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
    });

    await this.eventBus.emit({
      type: 'agent.started',
      source: 'ideia-chat',
      payload: { conversationId: request.conversationId },
    });
  }

  async *streamMessage(request: ChatRequest): AsyncIterable<SSEEvent> {
    let conversation = this.conversations.get(request.conversationId);
    if (!conversation) {
      const id = await this.createConversation();
      conversation = this.conversations.get(id) ?? undefined;
    }

    const abortController = new AbortController();
    const streamKey = request.conversationId || conversation!.id;
    this.activeStreams.set(streamKey, { abortController, conversationId: streamKey });

    conversation!.messages.push({
      id: uuid(),
      role: 'user',
      content: request.message,
      timestamp: new Date().toISOString(),
    });

    const systemPrompt = this.buildSystemPrompt(request);
    const messages = this.buildLLMMessages(conversation as any, systemPrompt);

    let eventCount = 0;

    const heartbeatInterval = setInterval(() => {
      eventCount = 0;
    }, SSE_HEARTBEAT_INTERVAL_MS);

    const checkCancelled = (): boolean => {
      if (abortController.signal.aborted) {
        clearInterval(heartbeatInterval);
        return true;
      }
      return false;
    };

    try {
      const provider = this.providerRouter.getActive();
      let assistantContent = '';

      for await (const event of provider.chat(messages)) {
        if (checkCancelled()) return;

        if (eventCount >= SSE_MAX_BUFFERED_EVENTS) {
          yield createSSEEvent('error', 'Server is overloaded. Please try again.');
          clearInterval(heartbeatInterval);
          return;
        }

        if (event.type === 'error') {
          yield createSSEEvent('error', event.data);
          clearInterval(heartbeatInterval);
          return;
        }

        if (event.type === 'heartbeat') {
          continue;
        }

        if (event.type === 'message') {
          const content = event.data as string;
          assistantContent += content;
          yield event;
          eventCount++;

          if (checkCancelled()) return;

          const toolCalls = this.parseToolCalls(assistantContent);
          for (const tc of toolCalls) {
            yield createSSEEvent('tool_call', tc);
            eventCount++;

            if (checkCancelled()) return;

            const result = await this.executeToolCall(tc, request);
            tc.status = 'completed';
            tc.result = result;

            conversation!.messages.push({
              id: uuid(),
              role: 'tool',
              content: JSON.stringify(result),
              timestamp: new Date().toISOString(),
              toolCalls: [tc],
            });
          }

          const checkpoints = this.parseCheckpoints(assistantContent);
          for (const cp of checkpoints) {
            const existing = conversation!.checkpoints.find(c => c.id === cp.id);
            if (!existing) {
              conversation!.checkpoints.push(cp);
              yield createSSEEvent('checkpoint', cp);
              eventCount++;
            }
          }
        }
      }

      if (checkCancelled()) return;

      if (assistantContent) {
        conversation!.messages.push({
          id: uuid(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        });
      }

      yield createSSEEvent('done', null);

      await this.eventBus.emit({
        type: 'agent.completed',
        source: 'ideia-chat',
        payload: { conversationId: request.conversationId },
      });
    } catch (_err) {
      yield createSSEEvent('error', _err instanceof Error ? _err.message : 'Unknown error');
    } finally {
      clearInterval(heartbeatInterval);
      this.activeStreams.delete(streamKey);
    }
  }

  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    return this.conversations.get(conversationId)?.messages ?? [];
  }

  async clearConversation(id: string): Promise<void> {
    this.conversations.delete(id);
  }

  async approveCheckpoint(checkpointId: string): Promise<void> {
    if (this.approvedCheckpoints.has(checkpointId)) {
      return;
    }

    let targetCp: Checkpoint | undefined;
    for (const conv of this.conversations.values()) {
      const cp = conv.checkpoints.find(c => c.id === checkpointId);
      if (cp) {
        if (cp.status !== 'pending') {
          return;
        }
        targetCp = cp;
        break;
      }
    }

    if (!targetCp) return;
    this.approvedCheckpoints.add(checkpointId);

    const cp = targetCp;
    if (cp.changes) {
      const policyInputs: PolicyInput[] = cp.changes.map(change => ({
        actionType: change.status === 'deleted' ? 'file.delete' : 'file.write',
        resource: change.path,
        riskLevel: change.path.match(/\.(env|key|pem|secret)$/i) ? 'high' : 'low',
      }));

      const policyResults = policyInputs.map(input => evaluatePolicy(input));
      const blocked = policyResults.filter(r => r.decision === 'block');
      const askForApproval = policyResults.filter(r => r.decision === 'ask');

      if (blocked.length > 0) {
        cp.status = 'rejected';
        await this.eventBus.emit({
          type: 'policy.violated',
          source: 'ideia-chat',
          payload: { checkpointId, violations: blocked.map(r => r.reason), rejectedCount: blocked.length },
        });
        return;
      }

      if (askForApproval.length > 0) {
        await this.eventBus.emit({
          type: 'policy.ask',
          source: 'ideia-chat',
          payload: {
            checkpointId,
            changes: askForApproval.map(r => r.reason),
            askCount: askForApproval.length,
            message: `This checkpoint contains ${askForApproval.length} high-risk change(s) that require your approval.`,
          },
        });
      }

      const validation = validateChanges(cp.changes);
      if (!validation.valid) {
        const secretErrors = validation.errors.filter(e => e.rule === 'secret-detection');
        if (secretErrors.length > 0) {
          cp.status = 'rejected';
          await this.eventBus.emit({
            type: 'policy.violated',
            source: 'ideia-chat',
            payload: { checkpointId, violations: secretErrors.map(e => e.message) },
          });
          return;
        }
      }
    }

    cp.status = 'approved';
    const errors: Array<{ path: string; error: string }> = [];
    if (cp.changes) {
      for (const change of cp.changes) {
        try {
          await this.taskRunner.applyChanges([change]);
        } catch (_err) {
          const msg = _err instanceof Error ? _err.message : String(_err);
          errors.push({ path: change.path, error: msg });
        }
      }
    }

    await this.eventBus.emit({
      type: 'policy.evaluated',
      source: 'ideia-chat',
      payload: {
        checkpointId,
        decision: errors.length > 0 ? 'approved_with_errors' : 'approved',
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  }

  async rejectCheckpoint(checkpointId: string, reason?: string): Promise<void> {
    for (const conv of this.conversations.values()) {
      const cp = conv.checkpoints.find(c => c.id === checkpointId);
      if (cp) cp.status = 'rejected';
    }

    await this.eventBus.emit({
      type: 'policy.violated',
      source: 'ideia-chat',
      payload: { checkpointId, reason: reason || 'Rejected by user' },
    });
  }

  private buildSystemPrompt(request: ChatRequest): string {
    return `You are IDEIA, an AI-powered IDE that transforms ideas into complete systems.

You have access to tools for:
- Reading and writing files in the workspace
- Generating architecture and code
- Running analysis and verification
- Creating project scaffolds

Always produce clear, actionable code. When creating files, use the code block format with the filename as the language tag:
\`\`\`filename.ts
// code here
\`\`\`

Before executing destructive actions, create checkpoints for user approval using:
[CHECKPOINT:id:title:description]

Current workspace: ${request.context?.workspaceRoot || 'unknown'}
${request.context?.openFiles ? `Open files: ${request.context.openFiles.join(', ')}` : ''}
${request.context?.selectedText ? `Selected text: ${request.context.selectedText}` : ''}`;
  }

  private buildLLMMessages(conversation: Conversation, systemPrompt: string): Array<{ role: string; content: string }> {
    return [
      { role: 'system', content: systemPrompt },
      ...conversation!.messages.map(m => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
      })),
    ];
  }

  private parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const regex = /<tool_call>\s*\{[^}]*"name"\s*:\s*"([^"]+)"[^}]*"arguments"\s*:\s*(\{[^}]+\})\s*\}\s*<\/tool_call>/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const dedupKey = match[1] + ':' + match[2].substring(0, 80);
      if (this.seenToolCallIds.has(dedupKey)) continue;
      this.seenToolCallIds.add(dedupKey);
      try {
        toolCalls.push({
          id: uuid(),
          name: match[1],
          arguments: JSON.parse(match[2]),
          status: 'pending',
        });
      } catch { /* skip malformed JSON */ }
    }
    return toolCalls;
  }

  private async executeToolCall(tc: ToolCall, _request: ChatRequest): Promise<unknown> {
    tc.status = 'running';
    try {
      switch (tc.name) {
        case 'readFile':
          return await this.taskRunner.readFile(tc.arguments.path as string);
        case 'writeFile':
          return await this.taskRunner.writeFile(
            tc.arguments.path as string,
            tc.arguments.content as string,
          );
        case 'deleteFile':
          return await this.taskRunner.deleteFile(tc.arguments.path as string);
        case 'runCommand':
          return await this.taskRunner.runCommand(tc.arguments.command as string);
        case 'searchFiles':
          return await this.taskRunner.searchFiles(tc.arguments.pattern as string);
        case 'getWorkspaceInfo':
          return await this.taskRunner.getWorkspaceInfo();
        default:
          return { error: `Unknown tool: ${tc.name}` };
      }
    } catch (_err) {
      tc.status = 'failed';
      tc.error = _err instanceof Error ? _err.message : String(_err);
      return { error: tc.error };
    }
  }

  private parseCheckpoints(content: string): Checkpoint[] {
    const checkpoints: Checkpoint[] = [];
    const checkpointRegex = /\[CHECKPOINT:([^\]]+)\]/g;
    const fileBlockRegex = /```(\S+?)\n([\s\S]*?)```/g;
    let cpMatch;
    while ((cpMatch = checkpointRegex.exec(content)) !== null) {
      const parts = cpMatch[1].split(':');
      if (parts.length >= 3) {
        const _checkpointStart = cpMatch.index;
        const checkpointEnd = cpMatch.index + cpMatch[0].length;
        const _contentAfter = content.substring(checkpointEnd);
        const nextCheckpoint = content.indexOf('[CHECKPOINT:', checkpointEnd);
        const blockEnd = nextCheckpoint === -1 ? content.length : nextCheckpoint;
        const nearbyContent = content.substring(checkpointEnd, blockEnd);
        const changes: FileChange[] = [];
        fileBlockRegex.lastIndex = 0;
        let fileMatch;
        while ((fileMatch = fileBlockRegex.exec(nearbyContent)) !== null) {
          changes.push({
            path: fileMatch[1],
            originalContent: '',
            modifiedContent: fileMatch[2],
            status: 'modified',
          });
        }
        checkpoints.push({
          id: uuid(),
          type: parts[0] as Checkpoint['type'],
          title: parts[1],
          description: parts.slice(2).join(':'),
          status: 'pending',
          changes: changes.length > 0 ? changes : undefined,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return checkpoints;
  }
}
