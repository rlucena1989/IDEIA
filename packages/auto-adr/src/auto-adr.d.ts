import { EventBus } from '@ideia/event-bus';
import { AdrDecision, AutoAdrConfig } from './types';
export declare class AutoAdr {
    private config;
    private bus;
    constructor(config: Partial<AutoAdrConfig>, bus: EventBus);
    generate(decision: Omit<AdrDecision, 'id' | 'date'>): Promise<AdrDecision>;
    list(): Promise<AdrDecision[]>;
    get(id: string): Promise<AdrDecision | null>;
    supersede(id: string, newId: string): Promise<AdrDecision | null>;
    private nextId;
}
export declare function createAutoAdr(bus: EventBus, config?: Partial<AutoAdrConfig>): AutoAdr;
//# sourceMappingURL=auto-adr.d.ts.map