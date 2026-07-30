import { AuditTrail } from '@ideia/audit-trail';
export type OrgRole = 'admin' | 'tech-lead' | 'developer' | 'viewer';
export type ConstraintScope = 'autonomy' | 'features' | 'notifications' | 'integrations';
export interface OrgPolicyRule {
    id: string;
    scope: ConstraintScope;
    constraint: string;
    value: unknown;
    description: string;
    severity: 'mandatory' | 'recommended' | 'optional';
}
export interface OrgPolicyTemplate {
    id: string;
    name: string;
    description: string;
    rules: OrgPolicyRule[];
    createdAt: string;
    updatedAt: string;
    version: number;
}
export interface TeamMember {
    id: string;
    email: string;
    role: OrgRole;
    profiles: string[];
}
export interface OrgConfig {
    orgName: string;
    adminEmail: string;
    members: TeamMember[];
    activePolicies: string[];
    enforcementLevel: 'strict' | 'permissive' | 'advisory';
}
export interface OrgPolicyResult {
    valid: boolean;
    violations: Array<{
        rule: string;
        member: string;
        message: string;
    }>;
    warnings: Array<{
        rule: string;
        member: string;
        message: string;
    }>;
}
export declare class OrgPolicyManager {
    private templates;
    private policies;
    private orgConfig;
    private auditTrail?;
    constructor(auditTrail?: AuditTrail);
    setOrgConfig(config: OrgConfig): void;
    getOrgConfig(): OrgConfig | null;
    createPolicy(name: string, rules: OrgPolicyRule[]): OrgPolicyTemplate;
    listPolicies(): OrgPolicyTemplate[];
    getPolicy(name: string): OrgPolicyTemplate | undefined;
    updatePolicy(name: string, rules: OrgPolicyRule[]): OrgPolicyTemplate | null;
    deletePolicy(name: string): boolean;
    validatePolicy(policy: OrgPolicyTemplate): string[];
    getComplianceReport(policy: OrgPolicyTemplate, config: Record<string, unknown>): {
        compliant: boolean;
        violations: Array<{
            rule: string;
            message: string;
        }>;
    };
    addTemplate(template: OrgPolicyTemplate): void;
    getTemplates(): OrgPolicyTemplate[];
    getTemplate(id: string): OrgPolicyTemplate | undefined;
    activatePolicy(templateId: string): boolean;
    deactivatePolicy(templateId: string): boolean;
    getActivePolicies(): OrgPolicyTemplate[];
    addMember(member: TeamMember): void;
    removeMember(memberId: string): void;
    getMembers(): TeamMember[];
    getMember(memberId: string): TeamMember | undefined;
    validateMemberCompliance(memberId: string): OrgPolicyResult;
    validateAllCompliance(): OrgPolicyResult;
    private audit;
}
//# sourceMappingURL=org-policy.d.ts.map