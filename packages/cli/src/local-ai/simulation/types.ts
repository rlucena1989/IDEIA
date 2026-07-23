/** Interface que define a estrutura de company project. */
export interface CompanyProject {
  name: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  roles: SimulationRole[];
  artifacts: SimulationArtifact[];
  timeline: SimulationEvent[];
}

/** Interface que define a estrutura de simulation role. */
export interface SimulationRole {
  name: string;
  title: string;
  responsibilities: string[];
  artifactsProduced: string[];
}

/** Interface que define a estrutura de simulation artifact. */
export interface SimulationArtifact {
  id: string;
  title: string;
  role: string;
  phase: string;
  content: string;
  format: 'markdown' | 'code' | 'diagram' | 'test' | 'config';
  createdAt: string;
  approved: boolean;
}

/** Interface que define a estrutura de simulation event. */
export interface SimulationEvent {
  timestamp: string;
  role: string;
  action: string;
  description: string;
  artifactId?: string;
}

/** Tipo que define simulation phase. */
export type SimulationPhase = 'requirements' | 'architecture' | 'implementation' | 'testing' | 'deployment' | 'review';

/** Processa o m p a n y_ r o l e s. */
export const COMPANY_ROLES: SimulationRole[] = [
  {
    name: 'ceo',
    title: 'CEO (Chief Executive Officer)',
    responsibilities: ['Define product vision', 'Approve milestones', 'Review final deliverables'],
    artifactsProduced: ['Product Vision', 'Milestone Plan', 'Go-to-Market Strategy'],
  },
  {
    name: 'cto',
    title: 'CTO (Chief Technology Officer)',
    responsibilities: ['Define technical architecture', 'Choose technology stack', 'Review code quality'],
    artifactsProduced: ['Architecture Decision Record', 'Technology Stack', 'Technical Specification'],
  },
  {
    name: 'pm',
    title: 'PM (Product Manager)',
    responsibilities: ['Write user stories', 'Prioritize backlog', 'Define acceptance criteria'],
    artifactsProduced: ['User Stories', 'Product Backlog', 'Acceptance Criteria'],
  },
  {
    name: 'engineer',
    title: 'Software Engineer',
    responsibilities: ['Implement features', 'Write unit tests', 'Fix bugs'],
    artifactsProduced: ['Source Code', 'Unit Tests', 'API Documentation'],
  },
  {
    name: 'qa',
    title: 'QA Engineer',
    responsibilities: ['Write test plans', 'Execute test cases', 'Report bugs'],
    artifactsProduced: ['Test Plan', 'Test Cases', 'Bug Report'],
  },
];

/** Processa h a s e_ o r d e r. */
export const PHASE_ORDER: SimulationPhase[] = ['requirements', 'architecture', 'implementation', 'testing', 'deployment', 'review'];

/** Processa h a s e_ r o l e s. */
export const PHASE_ROLES: Record<SimulationPhase, string[]> = {
  requirements: ['ceo', 'pm'],
  architecture: ['cto', 'engineer'],
  implementation: ['engineer'],
  testing: ['qa', 'engineer'],
  deployment: ['ceo', 'cto', 'engineer'],
  review: ['ceo', 'cto', 'pm', 'qa'],
};