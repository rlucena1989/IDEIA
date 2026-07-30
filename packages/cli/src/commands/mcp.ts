import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { spawnSync } from 'node:child_process';

interface JsonRpcRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const TOOLS = [
  {
    name: 'mcp_status',
    description: 'Audita a saude do projeto atual (health check)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_verify',
    description: 'Executa todos os quality gates disponiveis',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_doctor',
    description: 'Diagnostica o ambiente de instalacao do AI-Devkit',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_detect',
    description: 'Detecta a stack tecnologica do projeto',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_mode_get',
    description: 'Exibe o modo de sessao atual',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_mode_set',
    description: 'Altera o modo de sessao',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['development', 'security', 'performance', 'migration', 'debugging', 'documentation'],
          description: 'Modo de sessao desejado',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'mcp_hook_install',
    description: 'Instala pre-commit hook do AI-Devkit',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_hook_uninstall',
    description: 'Remove o pre-commit hook do AI-Devkit',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_adapter_list',
    description: 'Lista os adapters de framework disponiveis',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_ci_generate',
    description: 'Gera pipelines de CI/CD (GitHub Actions + GitLab CI)',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Sobrescreve arquivos existentes',
        },
      },
      required: [],
    },
  },
  {
    name: 'mcp_context_start',
    description: 'Gera contexto de pre-start para a sessao da IA',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mcp_context_end',
    description: 'Valida e documenta a sessao encerrada',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Resumo do que foi feito na sessao' },
        decisions: { type: 'string', description: 'Decisoes tomadas (separadas por ;)' },
        next: { type: 'string', description: 'Proxima tarefa a ser feita' },
      },
      required: [],
    },
  },
  {
    name: 'mcp_retrospective',
    description: 'Gera relatorio de retrospectiva do periodo',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'Tag git para periodo inicial (opcional)',
        },
      },
      required: [],
    },
  },
];

interface CliResult { stdout: string; stderr: string; exitCode: number; }

export function runCli(args: string, env?: Record<string, string>, entryPoint?: string): CliResult {
  const root = process.cwd();
  const entry = entryPoint ?? require.resolve('../index.js');
  const result = spawnSync('node', [
    entry, ...args.split(' '),
  ], { cwd: root, encoding: 'utf8', timeout: MCP_TIMEOUT_MS, env: { ...process.env, ...env } });
  const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
  if (result.error && result.error.message?.includes('ETIMEDOUT')) {
    return { stdout: '', stderr: `MCP command timed out after ${MCP_TIMEOUT_MS}ms`, exitCode: 124 };
  }
  return {
    stdout,
    stderr,
    exitCode: result.status ?? 1,
  };
}

/**
 * Processa request.
 * @param req - Valor req.
 * @returns O resultado da operação.
 */
export function handleRequest(req: JsonRpcRequest, runCliOverride?: typeof runCli): JsonRpcResponse {
  const id = req.id ?? null;
  const executeTool = runCliOverride ?? runCli;

  if (req.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'ai-devkit-mcp', version: '1.0.0' },
      },
    };
  }

  if (req.method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (req.method === 'tools/call') {
    const toolName = req.params?.name as string;
    const args = req.params?.arguments as Record<string, string> || {};

    const tool = TOOLS.find(t => t.name === toolName);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      };
    }

    let cliArgs = '';
    let envVars: Record<string, string> = {};
    switch (toolName) {
      case 'mcp_status': cliArgs = 'status'; envVars = { AI_LLM_MODE: '1' }; break;
      case 'mcp_verify': cliArgs = 'verify'; break;
      case 'mcp_doctor': cliArgs = 'doctor'; break;
      case 'mcp_detect': cliArgs = 'detect stack'; break;
      case 'mcp_mode_get': cliArgs = 'mode current'; break;
      case 'mcp_mode_set': cliArgs = `mode set ${args.mode}`; break;
      case 'mcp_hook_install': cliArgs = 'hook install'; break;
      case 'mcp_hook_uninstall': cliArgs = 'hook uninstall'; break;
      case 'mcp_adapter_list': cliArgs = 'adapter list'; break;
      case 'mcp_retrospective': cliArgs = `retrospective generate${args.since ? ` --since ${args.since}` : ''}`; break;
      case 'mcp_ci_generate': cliArgs = `ci generate${args.force ? ' --force' : ''}`; break;
      case 'mcp_context_start': cliArgs = 'context start'; break;
      case 'mcp_context_end': {
        const summary = args.summary ? ` --summary "${args.summary}"` : '';
        const decisions = args.decisions ? ` --decisions "${args.decisions}"` : '';
        const next = args.next ? ` --next "${args.next}"` : '';
        cliArgs = `context end${summary}${decisions}${next}`;
        break;
      }
    }

    const out = executeTool(cliArgs, envVars);

    if (out.exitCode === 124) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: `Tool ${toolName} timed out after ${MCP_TIMEOUT_MS}ms` },
      };
    }

    const isError = out.exitCode !== 0 || out.stderr.length > 0;
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{
          type: 'text',
          text: isError ? `Error: ${out.stderr || out.stdout}` : out.stdout,
        }],
        isError,
      },
    };
  }

  if (req.method === 'notifications/initialized') {
    return { jsonrpc: '2.0', id: null, result: null };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${req.method}` },
  };
}

const MCP_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`MCP timeout after ${ms}ms`)), ms)),
  ]);
}

export function startMcpServer(): void {
  const _root = process.cwd();
  let buffer = '';
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
    process.stderr.write(`{"jsonrpc":"2.0","id":null,"error":{"code":-32000,"message":"Server timeout after ${MCP_TIMEOUT_MS}ms"}}\n`);
  }, MCP_TIMEOUT_MS);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (abortController.signal.aborted) return;
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        const res = handleRequest(req);
        if (res.id !== null || res.error) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch {
        process.stderr.write(`{"jsonrpc":"2.0","id":null,"error":{"code":-32700,"message":"Parse error"}}\n`);
      }
    }
  });

  process.stdin.on('end', () => {
    clearTimeout(timeout);
    process.exit(0);
  });
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function mcpCommand(): Command {
  return new Command('mcp')
    .description('Inicia servidor MCP (Model Context Protocol) via stdio')
    .action(() => {
      startMcpServer();
    });
}
