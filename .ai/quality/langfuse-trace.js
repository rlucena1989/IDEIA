#!/usr/bin/env node

/**
 * LangFuse LLM Tracing — Traces LLM calls and agent actions
 * Reports to LangFuse if configured (LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST),
 * otherwise logs locally.
 *
 * Usage:
 *   const { initLangFuse, traceLLMCall, traceAgentAction } = require('./langfuse-trace');
 *   await traceLLMCall('gpt-4', 'Hello', 'Hi there!', 1200);
 *   await traceAgentAction('programmer', 'write_file', { path: 'src/main.ts' });
 */

const LANGFUSE_AVAILABLE = (() => {
  try { require('langfuse'); return true; }
  catch { return false; }
})();

let langfuseClient = null;
let traceBuffer = [];
let initialized = false;

function getConfig() {
  return {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
    enabled: process.env.LANGFUSE_ENABLED !== 'false',
    environment: process.env.NODE_ENV || 'development',
  };
}

async function initLangFuse() {
  if (initialized) return langfuseClient;
  initialized = true;

  const config = getConfig();

  if (!config.enabled) {
    console.log('[LangFuse] Tracing disabled (LANGFUSE_ENABLED=false)');
    return null;
  }

  if (LANGFUSE_AVAILABLE && config.publicKey && config.secretKey) {
    try {
      const { Langfuse } = require('langfuse');
      langfuseClient = new Langfuse({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
        baseUrl: config.host,
      });
      console.log('[LangFuse] Initialized with remote host:', config.host);
    } catch (err) {
      console.error('[LangFuse] Failed to initialize:', err.message);
      langfuseClient = null;
    }
  } else {
    console.log('[LangFuse] Not configured (set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY). Using local logging.');
  }

  return langfuseClient;
}

async function traceLLMCall(model, prompt, response, durationMs, metadata) {
  const trace = await getTrace();

  if (trace) {
    try {
      const generation = trace.generation({
        name: 'llm-call',
        model,
        input: prompt,
        output: response,
        usage: { promptTokens: estimateTokens(prompt), completionTokens: estimateTokens(response) },
        latency: durationMs,
        metadata: { ...metadata, environment: getConfig().environment },
      });
      await generation;
      return;
    } catch (err) {
      console.error('[LangFuse] Trace error:', err.message);
    }
  }

  logLocally({
    type: 'llm_call',
    model,
    promptLength: prompt?.length || 0,
    responseLength: response?.length || 0,
    durationMs,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

async function traceAgentAction(agent, action, result, metadata) {
  const trace = await getTrace();

  if (trace) {
    try {
      const span = trace.span({
        name: `agent.${action}`,
        input: { agent, action, ...metadata },
        output: result,
        metadata: { ...metadata, environment: getConfig().environment },
      });
      await span;
      return;
    } catch (err) {
      console.error('[LangFuse] Trace error:', err.message);
    }
  }

  logLocally({
    type: 'agent_action',
    agent,
    action,
    result: typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result),
    metadata,
    timestamp: new Date().toISOString(),
  });
}

async function traceEvent(name, input, output, metadata) {
  const trace = await getTrace();

  if (trace) {
    try {
      const event = trace.event({
        name,
        input,
        output,
        metadata: { ...metadata, environment: getConfig().environment },
      });
      await event;
      return;
    } catch (err) {
      console.error('[LangFuse] Trace error:', err.message);
    }
  }

  logLocally({
    type: 'event',
    name,
    input: typeof input === 'object' ? JSON.stringify(input).slice(0, 500) : String(input),
    output: typeof output === 'object' ? JSON.stringify(output).slice(0, 500) : String(output),
    metadata,
    timestamp: new Date().toISOString(),
  });
}

function flush() {
  if (langfuseClient) {
    try {
      langfuseClient.flush();
    } catch (err) {
      console.error('[LangFuse] Flush error:', err.message);
    }
  }
}

function getTraceHistory() {
  return [...traceBuffer];
}

async function getTrace() {
  const client = await initLangFuse();
  if (!client) return null;
  try {
    return client.trace({
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'ideia-trace',
      metadata: { environment: getConfig().environment, timestamp: new Date().toISOString() },
    });
  } catch {
    return null;
  }
}

function estimateTokens(text) {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

function logLocally(entry) {
  traceBuffer.push(entry);
  if (traceBuffer.length > 1000) traceBuffer.shift();

  if (process.env.LANGFUSE_VERBOSE) {
    console.log('[LangFuse:Local]', JSON.stringify(entry));
  }
}

module.exports = {
  initLangFuse,
  traceLLMCall,
  traceAgentAction,
  traceEvent,
  flush,
  getTraceHistory,
};
