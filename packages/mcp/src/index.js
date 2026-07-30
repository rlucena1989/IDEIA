"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketplace = exports.MCPMarketplace = exports.createA2AProtocol = exports.A2AProtocol = exports.createMcpHttpServer = exports.McpHttpServer = exports.MCPRegistry = void 0;
exports.createMCPServer = createMCPServer;
exports.createFileSystemTools = createFileSystemTools;
exports.createMCPRegistry = createMCPRegistry;
class MCPRegistry {
    servers = new Map();
    register(server) { this.servers.set(server.name, server); }
    unregister(name) { return this.servers.delete(name); }
    getServer(name) { return this.servers.get(name); }
    listServers() { return Array.from(this.servers.values()); }
    getTools() {
        const tools = [];
        for (const server of this.servers.values())
            tools.push(...server.tools);
        return tools;
    }
    getResources() {
        const resources = [];
        for (const server of this.servers.values())
            resources.push(...server.resources);
        return resources;
    }
    getPrompts() {
        const prompts = [];
        for (const server of this.servers.values())
            prompts.push(...server.prompts);
        return prompts;
    }
    async callTool(name, args) {
        for (const server of this.servers.values()) {
            const tool = server.tools.find(t => t.name === name);
            if (!tool)
                continue;
            try {
                const result = await tool.handler(args);
                return { ok: true, result };
            }
            catch (err) {
                return { ok: false, error: String(err) };
            }
        }
        return { ok: false, error: `Tool not found: ${name}` };
    }
    async readResource(uri) {
        for (const server of this.servers.values()) {
            const resource = server.resources.find(r => r.uri === uri);
            if (!resource)
                continue;
            try {
                const content = await resource.handler();
                return { ok: true, content: typeof content === 'string' ? content : content.text };
            }
            catch (err) {
                return { ok: false, error: String(err) };
            }
        }
        return { ok: false, error: `Resource not found: ${uri}` };
    }
    async getPrompt(name, args) {
        for (const server of this.servers.values()) {
            const prompt = server.prompts.find(p => p.name === name);
            if (!prompt)
                continue;
            try {
                const result = await prompt.handler(args);
                return { ok: true, prompt: result };
            }
            catch (err) {
                return { ok: false, error: String(err) };
            }
        }
        return { ok: false, error: `Prompt not found: ${name}` };
    }
}
exports.MCPRegistry = MCPRegistry;
function createMCPServer(config) {
    return { name: config.name, version: config.version ?? '1.0.0', tools: [], resources: [], prompts: [] };
}
function createFileSystemTools(basePath) {
    return [
        {
            name: 'read_file', description: 'Read a file from the workspace',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
            handler: async (args) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
                const safePath = path.resolve(basePath, String(args.path));
                if (!safePath.startsWith(path.resolve(basePath)))
                    throw new Error('Path traversal blocked');
                return fs.readFileSync(safePath, 'utf-8');
            },
        },
        {
            name: 'write_file', description: 'Write content to a file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
            handler: async (args) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
                const safePath = path.resolve(basePath, String(args.path));
                if (!safePath.startsWith(path.resolve(basePath)))
                    throw new Error('Path traversal blocked');
                fs.mkdirSync(path.dirname(safePath), { recursive: true });
                fs.writeFileSync(safePath, String(args.content), 'utf-8');
                return { written: true, path: args.path };
            },
        },
        {
            name: 'list_files', description: 'List files in a directory',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
            handler: async (args) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
                const dir = path.resolve(basePath, String(args.path));
                if (!dir.startsWith(path.resolve(basePath)))
                    throw new Error('Path traversal blocked');
                return fs.readdirSync(dir);
            },
        },
        {
            name: 'search_files', description: 'Search for files by name pattern',
            inputSchema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] },
            handler: async (args) => {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
                const pattern = String(args.pattern).toLowerCase();
                const results = [];
                function walk(dir) {
                    try {
                        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                            const fullPath = path.join(dir, entry.name);
                            if (entry.name.toLowerCase().includes(pattern))
                                results.push(fullPath);
                            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
                                walk(fullPath);
                        }
                    }
                    catch { }
                }
                walk(path.resolve(basePath));
                return results.slice(0, 100);
            },
        },
        {
            name: 'execute_command', description: 'Execute a shell command',
            inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
            handler: async (args) => {
                const { execFileSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
                const cmd = String(args.command);
                try {
                    const output = execFileSync(process.env.COMSPEC || 'cmd', ['/c', cmd], { encoding: 'utf8', timeout: 30000 });
                    return { output: output?.trim() || '', code: 0 };
                }
                catch (e) {
                    const err = e;
                    return { output: (err.stdout || err.stderr || '').toString().trim(), code: err.status ?? 1 };
                }
            },
        },
    ];
}
function createMCPRegistry() {
    return new MCPRegistry();
}
var server_http_1 = require("./server-http");
Object.defineProperty(exports, "McpHttpServer", { enumerable: true, get: function () { return server_http_1.McpHttpServer; } });
Object.defineProperty(exports, "createMcpHttpServer", { enumerable: true, get: function () { return server_http_1.createMcpHttpServer; } });
var a2a_1 = require("./a2a");
Object.defineProperty(exports, "A2AProtocol", { enumerable: true, get: function () { return a2a_1.A2AProtocol; } });
Object.defineProperty(exports, "createA2AProtocol", { enumerable: true, get: function () { return a2a_1.createA2AProtocol; } });
var marketplace_1 = require("./marketplace");
Object.defineProperty(exports, "MCPMarketplace", { enumerable: true, get: function () { return marketplace_1.MCPMarketplace; } });
Object.defineProperty(exports, "createMarketplace", { enumerable: true, get: function () { return marketplace_1.createMarketplace; } });
//# sourceMappingURL=index.js.map