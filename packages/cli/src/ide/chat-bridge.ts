/**
 * chat-bridge.ts — Bridge SSE para o chat central
 *
 * Expõe o ChatEngine via SSE (Server-Sent Events) para o Theia frontend.
 * Endpoint: POST /api/chat/completions
 *
 * O frontend envia:
 *   { messages: ChatMessage[], config?: ChatConfig }
 *
 * Recebe SSE events:
 *   event: delta    data: {"content": "text chunk"}
 *   event: tool_call  data: {"name": "...", "args": {...}}
 *   event: tool_result data: {"content": "..."}
 *   event: done     data: {"messages": [...]}
 *   event: error    data: {"error": "..."}
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { ChatEngine, ChatMessage, ChatConfig } from '../local-ai/chat';
import { AuditTrail } from '@ideia/audit-trail';
import { AgentRuntime } from '@ideia/agent-runtime';
import { createMemoryRecord } from '@ideia/memory-store';

const SSE_HEARTBEAT_MS = 15_000;
const SSE_BACKPRESSURE_LIMIT = 50;
const SSE_MAX_CONNECTION_MS = 120_000;

let _chatSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function createChatHandler(auditTrail: AuditTrail, memoryPath: string, root?: string, agentRuntime?: AgentRuntime) {
  const engine = new ChatEngine(auditTrail, memoryPath, root);
  let messageCount = 0;

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });

    let aborted = false;
    let pendingEvents = 0;
    const abortController = new AbortController();

    req.on('close', () => { aborted = true; abortController.abort(); });

    const connectionTimeout = setTimeout(() => {
      aborted = true;
      abortController.abort();
    }, SSE_MAX_CONNECTION_MS);

    req.on('end', async () => {
      if (aborted) { clearTimeout(connectionTimeout); return; }

      let messages: ChatMessage[];
      let config: ChatConfig | undefined;

      try {
        const parsed = JSON.parse(body);
        messages = parsed.messages || [];
        config = parsed.config;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        clearTimeout(connectionTimeout);
        return;
      }

      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });

      const sendEvent = (event: string, data: unknown) => {
        if (aborted) return false;
        if (pendingEvents >= SSE_BACKPRESSURE_LIMIT) {
          return false;
        }
        pendingEvents++;
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          pendingEvents--;
          return true;
        } catch {
          aborted = true;
          pendingEvents--;
          return false;
        }
      };

      // Heartbeat to keep SSE connection alive
      const heartbeat = setInterval(() => {
        if (aborted) { clearInterval(heartbeat); return; }
        try { res.write(':heartbeat\n\n'); } catch { clearInterval(heartbeat); aborted = true; }
      }, SSE_HEARTBEAT_MS);

      try {
        const contextMessages: ChatMessage[] = [];
        if (agentRuntime) {
          const plan = agentRuntime.run({
            message: messages[messages.length - 1]?.content || 'chat',
            actionType: 'chat.message',
          });
          if (plan.decision === 'block') {
            sendEvent('delta', { content: `\n\n⛔ **Ação bloqueada pela política.** ${plan.reason}\n` });
            sendEvent('done', { messages: [...messages, { role: 'assistant', content: `⛔ Ação bloqueada: ${plan.reason}`, timestamp: Date.now() }] });
            return;
          }
          if (plan.decision === 'ask') {
            sendEvent('delta', { content: `\n\n🤔 **Aprovação necessária.** ${plan.reason}\n` });
            sendEvent('tool_call', { name: 'request_approval', args: { actionType: 'chat.message', reason: plan.reason } });
            return;
          }
          const memory = agentRuntime.getMemoryStore()?.load();
          if (memory?.activeTask || memory?.lastDecisions?.length) {
            contextMessages.push({
              role: 'system',
              content: `[Context] Active task: ${memory.activeTask || 'none'}. Recent decisions: ${(memory.lastDecisions || []).slice(-3).map((d: Record<string, unknown>) => `${d.actionType || ''}:${d.decision || ''}`).join(', ')}. Policy: ${plan.reason}`,
            });
          }
        }

        const result = await engine.chat([...contextMessages, ...messages], {
          onDelta: (content: string) => sendEvent('delta', { content }),
          onToolCall: (name: string, args: Record<string, unknown>) => sendEvent('tool_call', { name, args }),
          onToolResult: (content: string) => sendEvent('tool_result', { content }),
        }, config);

        messageCount += messages.length;

        if (agentRuntime && messageCount % 10 === 0) {
          if (_chatSaveTimeout) clearTimeout(_chatSaveTimeout);
          _chatSaveTimeout = setTimeout(() => {
            const lastMsg = messages[messages.length - 1]?.content || '';
            const memory = agentRuntime.getMemoryStore()?.load();
            if (memory) {
              const summary = lastMsg.substring(0, 100);
              memory.lastDecisions?.push({ type: 'chat', summary, timestamp: new Date().toISOString() });
              agentRuntime.getMemoryStore()?.save(memory);
            }
            _chatSaveTimeout = null;
          }, 500);
          messageCount = 0;
        }

        if (!aborted) sendEvent('done', { messages: result });
      } catch (_err) {
        if (!aborted) {
          const msg = err instanceof Error ? err.message : String(err);
          const isOffline = msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('LLM erro');
          if (isOffline) {
            sendEvent('delta', { content: '\n\n⚠️ **Provedor LLM indisponível.** ' });
            sendEvent('delta', { content: 'O servidor de IA pode estar offline ou não configurado. ' });
            sendEvent('delta', { content: 'Verifique se o servidor está rodando ou configure um provedor diferente em Settings.\n' });
            sendEvent('done', { messages: [...messages, { role: 'assistant', content: '⚠️ Provedor LLM indisponível. Verifique a configuração ou tente novamente mais tarde.' }] });
          } else {
            sendEvent('error', { error: msg });
          }
        }
      } finally {
        clearInterval(heartbeat);
        clearTimeout(connectionTimeout);
      }

      if (!aborted) res.end();
    });
  };
}
