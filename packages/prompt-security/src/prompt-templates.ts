export type AgentRole = 'analyst' | 'architect' | 'programmer' | 'reviewer' | 'tester' | 'devops';

export interface TemplateDefinition {
  name: string;
  role: AgentRole;
  template: string;
  variables: string[];
  description: string;
}

const TEMPLATES: TemplateDefinition[] = [
  {
    name: 'analyst-requirements',
    role: 'analyst',
    template: `Analyze the following requirements and extract:
- Functional requirements
- Non-functional requirements
- Risks and assumptions
- Dependencies

Context: {context}

Requirements:
{task}

Constraints:
{constraints}

Provide a structured analysis with prioritization.`,
    variables: ['context', 'task', 'constraints'],
    description: 'Analyze requirements and extract structured information',
  },
  {
    name: 'architect-design',
    role: 'architect',
    template: `Design a solution architecture for the following:

Context: {context}
Task: {task}

Constraints:
{constraints}

Provide:
1. Architecture diagram (ASCII/PlantUML)
2. Component breakdown
3. Data flow
4. Technology choices with rationale
5. API contracts
6. Security considerations`,
    variables: ['context', 'task', 'constraints'],
    description: 'Design solution architecture from requirements',
  },
  {
    name: 'programmer-implement',
    role: 'programmer',
    template: `Implement the following:

Context: {context}
Task: {task}

Technical constraints:
{constraints}

Requirements:
- Follow existing code style and patterns
- Include error handling
- Add necessary types/interfaces
- Keep functions focused and testable

Implementation:`,
    variables: ['context', 'task', 'constraints'],
    description: 'Implement code based on task description',
  },
  {
    name: 'programmer-refactor',
    role: 'programmer',
    template: `Refactor the following code:

Context: {context}
Current code/task: {task}

Refactoring goals:
{constraints}

Ensure:
- No breaking changes to public API
- All existing tests pass
- Improved readability and maintainability
- Follow SOLID principles`,
    variables: ['context', 'task', 'constraints'],
    description: 'Refactor existing code with specific goals',
  },
  {
    name: 'reviewer-code-review',
    role: 'reviewer',
    template: `Review the following changes:

Context: {context}
Changes: {task}

Review checklist:
{constraints}

Evaluate:
- Correctness
- Security vulnerabilities
- Performance implications
- Code style and conventions
- Test coverage
- Edge cases`,
    variables: ['context', 'task', 'constraints'],
    description: 'Perform a comprehensive code review',
  },
  {
    name: 'tester-generate-tests',
    role: 'tester',
    template: `Generate tests for:

Context: {context}
Code/Task: {task}

Testing constraints:
{constraints}

Include:
- Unit tests for all public functions
- Edge cases and error conditions
- Integration tests if applicable
- Mock setup where needed
- Coverage targets`,
    variables: ['context', 'task', 'constraints'],
    description: 'Generate comprehensive test suite',
  },
  {
    name: 'devops-deploy',
    role: 'devops',
    template: `Plan and execute deployment:

Context: {context}
Task: {task}

Infrastructure constraints:
{constraints}

Provide:
- Deployment steps
- Infrastructure changes
- Rollback plan
- Monitoring setup
- Security checklist
- Performance considerations`,
    variables: ['context', 'task', 'constraints'],
    description: 'Plan and execute infrastructure deployment',
  },
  {
    name: 'analyst-bug-triage',
    role: 'analyst',
    template: `Triage the following bug report:

Context: {context}
Bug description: {task}

Analysis parameters:
{constraints}

Provide:
- Severity assessment
- Root cause analysis
- Impact scope
- Potential fix approaches
- Test cases to verify fix`,
    variables: ['context', 'task', 'constraints'],
    description: 'Triage and analyze bug reports',
  },
];

export function renderTemplate(templateName: string, variables: Record<string, string>): string {
  const def = TEMPLATES.find(t => t.name === templateName);
  if (!def) {
    throw new Error(`Template "${templateName}" not found. Available: ${listTemplates().join(', ')}`);
  }

  let result = def.template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return result;
}

export function listTemplates(): string[] {
  return TEMPLATES.map(t => t.name);
}

export function getTemplateDef(name: string): TemplateDefinition | undefined {
  return TEMPLATES.find(t => t.name === name);
}

export function getTemplatesByRole(role: AgentRole): TemplateDefinition[] {
  return TEMPLATES.filter(t => t.role === role);
}

export function getAllTemplates(): TemplateDefinition[] {
  return [...TEMPLATES];
}
