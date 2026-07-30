import { Spec, Requirement, DesignDoc, Task, TestCase, SpecChange } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('spec-generator');

export interface GenerationInput {
  title: string
  intention: string
  context: {
    projectType: string
    language: string
    existingArchitecture?: string
    constraints?: string[]
  }
  steeringFiles?: string[]
}

export class SpecGenerator {
  generate(input: GenerationInput): Spec {
    const now = new Date().toISOString()
    const specId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const spec: Spec = {
      id: specId,
      title: input.title,
      version: 1,
      status: 'draft',
      requirements: this.generateRequirements(input),
      design: this.generateDesign(input),
      tasks: this.generateTasks(input),
      acceptanceCriteria: this.generateTestCases(input),
      createdAt: now,
      updatedAt: now,
      changelog: [{
        version: 1,
        date: now,
        author: 'spec-engine',
        description: `Initial spec generation for: ${input.title}`,
      }],
    }

    return spec
  }

  private generateRequirements(input: GenerationInput): Requirement[] {
    const requirements: Requirement[] = [
      {
        id: 'REQ-001',
        description: `Implement ${input.title} based on user intention`,
        category: 'functional',
        priority: 'critical',
        acceptanceCriteria: [
          `System delivers ${input.title} as described`,
          'All acceptance tests pass',
        ],
      },
    ]
    if (input.context.constraints) {
      for (let i = 0; i < input.context.constraints.length; i++) {
        requirements.push({
          id: `REQ-${String(i + 2).padStart(3, '0')}`,
          description: input.context.constraints[i],
          category: 'non-functional',
          priority: 'high',
          acceptanceCriteria: [`Constraint met: ${input.context.constraints[i]}`],
        })
      }
    }
    return requirements
  }

  private generateDesign(input: GenerationInput): DesignDoc {
    return {
      overview: `${input.title} — designed for ${input.context.projectType} in ${input.context.language}`,
      architecture: input.context.existingArchitecture || 'Modular architecture following project conventions',
      components: [
        {
          name: input.title.replace(/\s+/g, ''),
          responsibility: `Implement ${input.title}`,
          interfaces: [{
            name: 'public-api',
            type: 'bidirectional',
            contract: 'Standard input/output contract',
          }],
          dependencies: [],
        },
      ],
      dataFlow: ['User request → Processing → Response'],
      decisions: [],
    }
  }

  private generateTasks(input: GenerationInput): Task[] {
    return [
      {
        id: 'TASK-001',
        title: `Set up structure for ${input.title}`,
        description: `Create the necessary files and structure`,
        dependencies: [],
        estimatedEffort: 'small',
        acceptanceCriteria: ['Structure is in place'],
        status: 'pending',
      },
      {
        id: 'TASK-002',
        title: `Implement ${input.title}`,
        description: `Core implementation following project conventions`,
        dependencies: ['TASK-001'],
        estimatedEffort: 'large',
        acceptanceCriteria: ['Implementation compiles', 'Implementation passes tests'],
        status: 'pending',
      },
      {
        id: 'TASK-003',
        title: `Test ${input.title}`,
        description: 'Write and run tests',
        dependencies: ['TASK-002'],
        estimatedEffort: 'medium',
        acceptanceCriteria: ['All tests pass', 'Coverage meets threshold'],
        status: 'pending',
      },
    ]
  }

  private generateTestCases(input: GenerationInput): TestCase[] {
    return [
      {
        id: 'TC-001',
        description: `Basic functionality of ${input.title}`,
        type: 'unit',
        given: 'the system is initialized',
        when: `${input.title} is invoked with valid input`,
        then: 'it should produce correct output',
        expectedResult: 'Correct output returned',
      },
    ]
  }
}
