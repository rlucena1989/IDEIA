"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTONOMY_OPTIONS = exports.PROFILES = void 0;
exports.PROFILES = [
    {
        id: 'solo-dev',
        label: 'Solo Dev',
        description: 'Individual developer working on personal projects',
        icon: '👤',
        tooltip: 'Best for freelancers and solo founders. Quick setup with minimal config.',
        recommendedFor: 'Personal projects and small teams of 1-2'
    },
    {
        id: 'tech-lead',
        label: 'Tech Lead',
        description: 'Technical lead managing a team and codebase',
        icon: '👑',
        tooltip: 'Includes code review, team metrics, and governance features.',
        recommendedFor: 'Teams of 3-15 developers'
    },
    {
        id: 'automator',
        label: 'Automator',
        description: 'CI/CD and workflow automation specialist',
        icon: '⚡',
        tooltip: 'Focus on pipelines, automation rules, and integration hooks.',
        recommendedFor: 'DevOps and platform engineering'
    },
    {
        id: 'enterprise',
        label: 'Enterprise',
        description: 'Organization-wide deployment with compliance',
        icon: '🏢',
        tooltip: 'Full security, audit, SSO, and compliance controls enabled.',
        recommendedFor: 'Organizations with 50+ developers'
    },
    {
        id: 'custom',
        label: 'Custom',
        description: 'Full manual configuration from scratch',
        icon: '🔧',
        tooltip: 'All options available. Best for experienced users with specific needs.',
        recommendedFor: 'Users who want full control'
    }
];
exports.AUTONOMY_OPTIONS = [
    { value: 'N1', label: 'Supervisionado', description: 'IA sugere, humano aprova' },
    { value: 'N2', label: 'Semi-autônomo', description: 'IA executa com supervisão seletiva' },
    { value: 'N3', label: 'Autônomo', description: 'IA executa e reporta' },
    { value: 'N4', label: 'Total', description: 'IA age independentemente' }
];
//# sourceMappingURL=types.js.map