"use strict";
/**
 * knowledge-graph.ts — Knowledge Graph Interno (Item 18)
 *
 * Graph interno JSON com nós = projetos/módulos/decisões/arquivos
 * e arestas = depende/implementa/substitui/causou.
 * Permite análise de impacto e rastreabilidade.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraph = void 0;
const crypto_1 = require("crypto");
class KnowledgeGraph {
    nodes = new Map();
    edges = [];
    addNode(node) {
        const id = (0, crypto_1.randomUUID)().slice(0, 12);
        this.nodes.set(id, { ...node, id, createdAt: new Date().toISOString() });
        return id;
    }
    addEdge(edge) {
        if (this.nodes.has(edge.source) && this.nodes.has(edge.target)) {
            this.edges.push(edge);
        }
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    queryNodes(type, name) {
        return Array.from(this.nodes.values()).filter(n => {
            if (type && n.type !== type)
                return false;
            if (name && !n.name.toLowerCase().includes(name.toLowerCase()))
                return false;
            return true;
        });
    }
    getDependencies(id) {
        const depIds = this.edges.filter(e => e.source === id && e.relation === 'depends_on').map(e => e.target);
        return depIds.map(d => this.nodes.get(d)).filter(Boolean);
    }
    getDependents(id) {
        const depIds = this.edges.filter(e => e.target === id).map(e => e.source);
        return depIds.map(d => this.nodes.get(d)).filter(Boolean);
    }
    analyzeImpact(id) {
        const node = this.nodes.get(id);
        if (!node)
            throw new Error(`Node ${id} not found`);
        const directDependents = this.getDependents(id);
        const transitiveDependents = [];
        const visited = new Set();
        const traverse = (nodeId, depth) => {
            if (depth > 5 || visited.has(nodeId))
                return;
            visited.add(nodeId);
            const dependents = this.getDependents(nodeId);
            for (const dep of dependents) {
                if (dep.id !== id && !transitiveDependents.find(d => d.id === dep.id)) {
                    transitiveDependents.push(dep);
                }
                traverse(dep.id, depth + 1);
            }
        };
        traverse(id, 0);
        return { node, directDependents, transitiveDependents, depth: this.calculateDepth(id) };
    }
    exportGraph() {
        return { nodes: Array.from(this.nodes.values()), edges: [...this.edges] };
    }
    queryNode(id) {
        const node = this.nodes.get(id);
        if (!node)
            return { node: undefined, neighbors: [] };
        const neighbors = [];
        for (const edge of this.edges) {
            if (edge.source === id) {
                const target = this.nodes.get(edge.target);
                if (target)
                    neighbors.push({ node: target, edge, direction: 'out' });
            }
            else if (edge.target === id) {
                const source = this.nodes.get(edge.source);
                if (source)
                    neighbors.push({ node: source, edge, direction: 'in' });
            }
        }
        return { node, neighbors };
    }
    traverse(startId, relation, maxDepth = 10) {
        const result = [];
        const visited = new Set();
        const queue = [{ id: startId, depth: 0, path: [startId] }];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id))
                continue;
            visited.add(current.id);
            const node = this.nodes.get(current.id);
            if (!node)
                continue;
            if (current.depth > 0 || current.id === startId) {
                result.push({ node, depth: current.depth, path: current.path });
            }
            if (current.depth >= maxDepth)
                continue;
            for (const edge of this.edges) {
                if (relation && edge.relation !== relation)
                    continue;
                if (edge.source === current.id) {
                    if (!visited.has(edge.target)) {
                        queue.push({ id: edge.target, depth: current.depth + 1, path: [...current.path, edge.target] });
                    }
                }
                else if (edge.target === current.id) {
                    if (!visited.has(edge.source)) {
                        queue.push({ id: edge.source, depth: current.depth + 1, path: [...current.path, edge.source] });
                    }
                }
            }
        }
        return result;
    }
    searchSimilar(query, limit) {
        const q = query.toLowerCase();
        const matches = Array.from(this.nodes.values()).filter(n => n.name.toLowerCase().includes(q) ||
            (typeof n.properties?.type === 'string' && n.properties.type.toLowerCase().includes(q)));
        return limit ? matches.slice(0, limit) : matches;
    }
    getStats() {
        const nodeTypes = {};
        for (const node of this.nodes.values()) {
            nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
        }
        const n = this.nodes.size;
        const e = this.edges.length;
        const density = n < 2 ? 0 : e / (n * (n - 1));
        return { nodes: n, edges: e, density, nodeTypes };
    }
    findByType(type) {
        return Array.from(this.nodes.values()).filter(n => n.type === type);
    }
    calculateDepth(id) {
        let depth = 0;
        let current = id;
        const visited = new Set();
        while (current) {
            visited.add(current);
            const deps = this.getDependencies(current);
            if (deps.length === 0)
                break;
            current = deps[0].id;
            if (visited.has(current))
                break;
            depth++;
        }
        return depth;
    }
}
exports.KnowledgeGraph = KnowledgeGraph;
//# sourceMappingURL=knowledge-graph.js.map