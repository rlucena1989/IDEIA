"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPMarketplace = void 0;
exports.createMarketplace = createMarketplace;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_https_1 = require("node:https");
const index_1 = require("./index");
function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        (0, node_https_1.get)(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk.toString(); });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error(`Invalid JSON from ${url}`));
                }
            });
        }).on('error', reject);
    });
}
class MCPMarketplace {
    registry;
    registryUrl;
    storageDir;
    installed = new Map();
    constructor(config) {
        this.registry = new index_1.MCPRegistry();
        this.registryUrl = config?.registryUrl ?? 'https://registry.ideia.dev/mcp';
        this.storageDir = config?.storageDir ?? (0, node_path_1.join)(process.cwd(), '.ai', 'mcp');
        this.loadInstalled();
    }
    getRegistry() { return this.registry; }
    getInstalledServers() {
        return Array.from(this.installed.values());
    }
    isInstalled(name) {
        return this.installed.has(name);
    }
    async discover() {
        try {
            const result = await httpGetJson(`${this.registryUrl}/servers`);
            if (Array.isArray(result))
                return result;
            if (result && typeof result === 'object' && 'servers' in result) {
                return result.servers;
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async install(serverName, serverEntry) {
        if (this.installed.has(serverName)) {
            throw new Error(`Server already installed: ${serverName}`);
        }
        let entry = serverEntry;
        if (!entry) {
            const available = await this.discover();
            entry = available.find(s => s.name === serverName);
            if (!entry)
                throw new Error(`Server not found in registry: ${serverName}`);
        }
        const server = {
            name: entry.name,
            version: entry.version,
            tools: entry.tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: {},
                handler: async (args) => {
                    try {
                        const result = await httpGetJson(`${entry?.registryUrl ?? ''}/call?server=${entry?.name ?? ''}&tool=${t.name}&args=${encodeURIComponent(JSON.stringify(args))}`);
                        return result;
                    }
                    catch (err) {
                        return { error: String(err) };
                    }
                },
            })),
            resources: [],
            prompts: [],
        };
        this.registry.register(server);
        const installedEntry = {
            ...entry,
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.installed.set(serverName, installedEntry);
        this.saveInstalled();
        return server;
    }
    uninstall(serverName) {
        const removed = this.registry.unregister(serverName);
        this.installed.delete(serverName);
        this.saveInstalled();
        return removed;
    }
    async publish(server) {
        return { ok: true, url: `${this.registryUrl}/publish/${server.name}` };
    }
    getTools() { return this.registry.getTools(); }
    async callTool(name, args) {
        return this.registry.callTool(name, args);
    }
    loadInstalled() {
        const filePath = (0, node_path_1.join)(this.storageDir, 'installed.json');
        if ((0, node_fs_1.existsSync)(filePath)) {
            try {
                const data = JSON.parse((0, node_fs_1.readFileSync)(filePath, 'utf-8'));
                if (Array.isArray(data)) {
                    for (const entry of data) {
                        this.installed.set(entry.name, entry);
                    }
                }
                for (const entry of data) {
                    if (entry.tools) {
                        const server = {
                            name: entry.name,
                            version: entry.version,
                            tools: entry.tools.map((t) => ({
                                name: t.name,
                                description: t.description,
                                inputSchema: {},
                                handler: async (args) => {
                                    try {
                                        const result = await httpGetJson(`${entry.registryUrl}/call?server=${entry.name}&tool=${t.name}&args=${encodeURIComponent(JSON.stringify(args))}`);
                                        return result;
                                    }
                                    catch (err) {
                                        return { error: String(err) };
                                    }
                                },
                            })),
                            resources: [],
                            prompts: [],
                        };
                        this.registry.register(server);
                    }
                }
            }
            catch {
                this.installed.clear();
            }
        }
    }
    saveInstalled() {
        const dir = (0, node_path_1.resolve)(this.storageDir);
        if (!(0, node_fs_1.existsSync)(dir))
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, 'installed.json'), JSON.stringify(Array.from(this.installed.values()), null, 2), 'utf-8');
    }
}
exports.MCPMarketplace = MCPMarketplace;
function createMarketplace(config) {
    return new MCPMarketplace(config);
}
//# sourceMappingURL=marketplace.js.map