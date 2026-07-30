import type { ContextType } from './types';
import type { ConfigEngine } from './config-engine';
export declare class ContextDetector {
    private configEngine;
    private current;
    constructor(configEngine: ConfigEngine);
    detect(): Promise<ContextType>;
    private detectFromEnvironment;
    switch(context: ContextType): Promise<void>;
    private persistContext;
    private applyContextConfig;
    getCurrent(): ContextType;
    getContextHistory(): Array<{
        context: ContextType;
        timestamp: string;
        source: string;
    }>;
}
//# sourceMappingURL=context-detection.d.ts.map