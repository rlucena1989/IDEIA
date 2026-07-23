export const ADR_TEMPLATES: Record<string, string> = {
  'technology-adoption': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

We are considering adopting {technology} for {purpose}.

The current solution uses {currentSolution} which has limitations:
- {limitation1}
- {limitation2}

We need to evaluate whether {technology} is the right choice for our architecture.

## Decision

We will adopt {technology} because:
- {reason1}
- {reason2}
- {reason3}

Implementation will follow these steps:
1. {step1}
2. {step2}
3. {step3}

## Consequences

### Positive
- {positive1}
- {positive2}

### Negative
- {negative1}
- {negative2}

### Neutral
- {neutral1}
`,

  'architecture-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

Current architecture: {currentArchitecture}

Problem: {problem}

Drivers:
- {driver1}
- {driver2}

## Decision

We will change the architecture to {newArchitecture}.

Key changes:
1. {change1}
2. {change2}
3. {change3}

## Consequences

### Positive
- {positive1}
- {positive2}

### Negative
- Requires migration of existing components
- {negative2}

### Migration Plan
1. {migrationStep1}
2. {migrationStep2}
3. {migrationStep3}
`,

  'api-change': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

Current API: {currentApi}

Problem: {problem}

Requirements:
- {requirement1}
- {requirement2}

## Decision

We will change the API as follows:
{apiSpecification}

The new contract will be:
- Method: {method}
- Path: {path}
- Request: {request}
- Response: {response}

## Consequences

### Positive
- {positive1}
- {positive2}

### Migration
- Version {newVersion} will be released
- Deprecation period: {deprecationPeriod}
- Migration guide will be provided
`,

  'tool-creation': `# ADR-{number}: {title}

## Status

proposed

## Date

{date}

## Context

We need a new tool for {purpose}.

Current gap: {gap}

Success criteria:
- {criterion1}
- {criterion2}
- {criterion3}

## Decision

We will create a new tool: {toolName}

Specifications:
- Language: {language}
- Framework: {framework}
- Integration: {integration}

Location: {location}

## Consequences

### Positive
- {positive1}
- {positive2}

### Negative
- Maintenance burden
- {negative2}

### Alternatives Considered
- {alternative1}
- {alternative2}
`,
};

export function getTemplateNames(): string[] {
  return Object.keys(ADR_TEMPLATES);
}

export function getTemplate(name: string): string | undefined {
  return ADR_TEMPLATES[name];
}

export function renderTemplate(templateName: string, variables: Record<string, string>): string {
  const template = ADR_TEMPLATES[templateName];
  if (!template) throw new Error(`Unknown template: ${templateName}`);

  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
