import { CompressorInput, CompressorOutput } from '../types';
export declare class ContextCompressor {
    private summarize;
    private deduplicate;
    private ranker;
    compress(input: CompressorInput): Promise<CompressorOutput>;
    private countTokens;
}
//# sourceMappingURL=index.d.ts.map