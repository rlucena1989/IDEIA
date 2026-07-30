export interface ChainVerifyResult {
    valid: boolean;
    brokenLinks: number[];
    totalEntries: number;
}
export interface MerkleProof {
    entryIndex: number;
    entryHash: string;
    siblings: string[];
    rootHash: string;
    valid?: boolean;
}
export declare function proveEntry(filePath: string, eventId: string): {
    valid: boolean;
    entryIndex: number;
};
export declare function getChainRoot(filePath: string): string;
export declare function verifyChain(filePath: string): ChainVerifyResult;
//# sourceMappingURL=verify-chain.d.ts.map