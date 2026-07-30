/**
 * knowledge-graph.ts — Knowledge Graph Interno (Item 18)
 *
 * Graph interno JSON com nós = projetos/módulos/decisões/arquivos
 * e arestas = depende/implementa/substitui/causou.
 * Permite análise de impacto e rastreabilidade.
 */
export interface GraphNode {
    id: string;
    type: 'project' | 'module' | 'decision' | 'file' | 'agent' | 'pattern';
    name: string;
    properties: Record<string, unknown>;
    createdAt: string;
}
export interface GraphEdge {
    source: string;
    target: string;
    relation: 'depends_on' | 'implements' | 'replaces' | 'caused' | 'references' | 'deployed_to' | 'co_occurs';
    properties?: Record<string, unknown>;
}
export interface ImpactAnalysis {
    node: GraphNode;
    directDependents: GraphNode[];
    transitiveDependents: GraphNode[];
    depth: number;
}
export declare class KnowledgeGraph {
    private nodes;
    private edges;
    addNode(node: Omit<GraphNode, 'id' | 'createdAt'>): string;
    addEdge(edge: GraphEdge): void;
    getNode(id: string): GraphNode | undefined;
    queryNodes(type?: string, name?: string): GraphNode[];
    getDependencies(id: string): GraphNode[];
    getDependents(id: string): GraphNode[];
    analyzeImpact(id: string): ImpactAnalysis;
    exportGraph(): {
        nodes: GraphNode[];
        edges: GraphEdge[];
    };
    queryNode(id: string): {
        node: GraphNode | undefined;
        neighbors: Array<{
            node: GraphNode;
            edge: GraphEdge;
            direction: 'in' | 'out';
        }>;
    };
    traverse(startId: string, relation?: string, maxDepth?: number): Array<{
        node: GraphNode;
        depth: number;
        path: string[];
    }>;
    searchSimilar(query: string, limit?: number): GraphNode[];
    getStats(): {
        nodes: number;
        edges: number;
        density: number;
        nodeTypes: Record<string, number>;
    };
    findByType(type: string): GraphNode[];
    private calculateDepth;
}
//# sourceMappingURL=knowledge-graph.d.ts.map