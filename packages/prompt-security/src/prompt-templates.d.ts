export type AgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops';
export interface TemplateDefinition {
    name: string;
    role: AgentRole;
    template: string;
    variables: string[];
    description: string;
}
export declare function renderTemplate(templateName: string, variables: Record<string, string>): string;
export declare function listTemplates(): string[];
export declare function getTemplateDef(name: string): TemplateDefinition | undefined;
export declare function getTemplatesByRole(role: AgentRole): TemplateDefinition[];
export declare function getAllTemplates(): TemplateDefinition[];
//# sourceMappingURL=prompt-templates.d.ts.map