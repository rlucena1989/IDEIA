#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Server para o AI-Devkit.
 * Permite que IDEs como Cursor e Claude Desktop conectem-se diretamente
 * às fitness functions e memórias do DevKit sem intervenção humana.
 */
'use strict';

const { getSignatures } = require('./v3-engines/ast-slicer');
const { applyPatch } = require('./v3-engines/patch-applier');
const { truncateError } = require('./v3-engines/error-truncator');
const { researchDocs } = require('./v3-engines/oracle-research');


const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.cwd();

// Implementação real de loop JSON-RPC via stdio para MCP Servers
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function sendResponse(id, result, error = null) {
    console.log(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result,
        error
    }));
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const req = JSON.parse(line);
        if (req.method === 'initialize') {
            sendResponse(req.id, {
                protocolVersion: "2024-11-05",
                serverInfo: { name: "ai-devkit-mcp", version: "1.0.0" },
                capabilities: {
                    tools: {},
                    resources: {}
                }
            });
        } 
        else if (req.method === 'tools/list') {
            sendResponse(req.id, {
                tools: [
                    {
                        name: "run_quality_gate",
                        description: "Executa a verificação arquitetural do AI-Devkit (Boundaries e Leis).",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "trigger_self_heal",
                        description: "Aciona o motor AST para mover entidades/casos de uso pro lugar certo e corrigir imports.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "ast_get_signatures",
                        description: "[V3] Lê um arquivo TypeScript e retorna APENAS as assinaturas de classes/métodos (Oculta o corpo para salvar 90% de tokens).",
                        inputSchema: { type: "object", properties: { filepath: { type: "string" } }, required: ["filepath"] }
                    },
                    {
                        name: "apply_unified_diff",
                        description: "[V3] Aplica uma modificação estrutural usando o formato Unified Diff. Não é necessário reescrever o arquivo inteiro, poupando tokens de output.",
                        inputSchema: { type: "object", properties: { diff_content: { type: "string" } }, required: ["diff_content"] }
                    },
                    {
                        name: "oracle_research_docs",
                        description: "[V3] Pesquisa na Web/Knowledge base por documentações de bibliotecas atuais para embasar o código e evitar alucinação.",
                        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                    },

                    {
                        name: "get_context",
                        description: "Lê o Handoff atual com log dos agentes.",
                        inputSchema: { type: "object", properties: {} }
                    }
                ]
            });
        }
        else if (req.method === 'tools/call') {
            if (req.params.name === 'ast_get_signatures') {
                try {
                    const signatures = getSignatures(req.params.arguments.filepath);
                    sendResponse(req.id, { content: [{ type: "text", text: signatures }] });
                } catch(e) {
                    sendResponse(req.id, { content: [{ type: "text", text: e.message }], isError: true });
                }
            }
            else if (req.params.name === 'apply_unified_diff') {
                try {
                    const result = applyPatch(req.params.arguments.filepath, req.params.arguments.diff_content);
                    sendResponse(req.id, { content: [{ type: "text", text: result }] });
                } catch(e) {
                    sendResponse(req.id, { content: [{ type: "text", text: e.message }], isError: true });
                }
            }
            else if (req.params.name === 'oracle_research_docs') {
                researchDocs(req.params.arguments.query).then(res => {
                    sendResponse(req.id, { content: [{ type: "text", text: res }] });
                }).catch(e => {
                    sendResponse(req.id, { content: [{ type: "text", text: e.message }], isError: true });
                });
            }
            else if (req.params.name === 'run_quality_gate') {
                try {
                    execSync('node .ai/bin/quality-agent.js', { cwd: ROOT });
                    sendResponse(req.id, { content: [{ type: "text", text: "Quality Gate Passou com Sucesso." }] });
                } catch(e) {
                    sendResponse(req.id, { content: [{ type: "text", text: "Falha no Quality Gate. Verifique os imports e a estrutura." }], isError: true });
                }
            }
            else if (req.params.name === 'trigger_self_heal') {
                try {
                    const out = execSync('node .ai/bin/self-heal.js', { cwd: ROOT, encoding: 'utf8' });
                    sendResponse(req.id, { content: [{ type: "text", text: out }] });
                } catch(e) {
                    sendResponse(req.id, { content: [{ type: "text", text: e.stdout || e.message }], isError: true });
                }
            }
            else if (req.params.name === 'get_context') {
                 const handoff = fs.readFileSync(path.join(ROOT, '.ai/context/ai-handoff.md'), 'utf8');
                 sendResponse(req.id, { content: [{ type: "text", text: handoff }] });
            }
            else {
                 sendResponse(req.id, null, { code: -32601, message: "Method not found" });
            }
        }
    } catch (err) {
        // Silently ignore malformed JSON or log to stderr
    }
});
