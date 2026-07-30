export interface TechItem {
    name: string;
    category: string;
    stars?: number;
    downloads?: number;
    recencyDays?: number;
    score: number;
    source: 'github' | 'npm' | 'arxiv';
    url?: string;
    description?: string;
}
export interface TechEvaluation {
    name: string;
    overall: number;
    dimensions: {
        community: number;
        maturity: number;
        innovation: number;
        adoption: number;
        maintenance: number;
    };
}
export interface ScanHistoryEntry {
    timestamp: number;
    source: string;
    query: string;
    resultsCount: number;
}
export interface TechRecommendation {
    name: string;
    score: number;
    category: string;
    source: string;
    reason: string;
}
export declare class TechRadarAPI {
    private items;
    private scanHistory;
    scanGithubTrending(language: string, _since?: 'daily' | 'weekly' | 'monthly'): Promise<TechItem[]>;
    scanNpmDownloads(packageName: string): Promise<{
        name: string;
        downloads: number;
        score: number;
    }>;
    scanArxivPapers(topic: string, maxResults?: number): Promise<TechItem[]>;
    evaluateTechnology(name: string, data: {
        stars: number;
        downloads: number;
        recencyDays: number;
    }): TechEvaluation;
    getRecommendations(minScore?: number): TechRecommendation[];
    addItem(item: TechItem): void;
    getAll(): TechItem[];
    clear(): void;
    scheduleAutoScan(intervalMs: number): ReturnType<typeof setInterval>;
    getScanHistory(): ScanHistoryEntry[];
    getLatestResults(limit?: number): TechItem[];
    private recordScan;
    private getFallbackGithub;
    private getFallbackArxiv;
}
export declare class TechRadar {
    private items;
    scanGitHub(language: string, limit?: number): Promise<TechItem[]>;
    scanNpm(keyword: string, limit?: number): Promise<TechItem[]>;
    scanArxiv(topic: string, limit?: number): Promise<TechItem[]>;
    evaluateTech(name: string, category: string, stars: number, downloads: number, recencyDays: number): number;
    addItem(item: TechItem): void;
    getRecommendations(minScore?: number): TechItem[];
    getAll(): TechItem[];
    clear(): void;
    private getFallbackNpm;
}
export declare function createTechRadar(): TechRadar;
export declare function createTechRadarAPI(): TechRadarAPI;
//# sourceMappingURL=tech-radar.d.ts.map