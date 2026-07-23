export interface PolicyRule {
    id: string;
    description: string;
    pattern?: string;
    action: 'block' | 'ask' | 'auto';
    severity?: 'critical' | 'high' | 'medium' | 'low';
    resourcePattern?: string;
    actionPattern?: string;
    riskLevel?: 'high' | 'medium' | 'low';
}
export interface PolicyDocument {
    version: string;
    metadata: {
        name: string;
        description: string;
        updatedAt: string;
    };
    rules: PolicyRule[];
}
export declare function loadPolicyFile(filePath: string): PolicyDocument;
export declare function loadPolicyDirectory(dirPath?: string): Map<string, PolicyDocument>;
export declare function policyToInput(rule: PolicyRule): {
    actionType: string;
    resource?: string;
    riskLevel?: string;
};
//# sourceMappingURL=policy-loader.d.ts.map