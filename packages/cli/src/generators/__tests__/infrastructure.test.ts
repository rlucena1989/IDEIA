jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { dockerfile, dockerfileAction, dockerCompose, githubActions, terraform } from '../infrastructure';

describe('infrastructure generators', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  describe('dockerfile', () => {
    it('generates a Dockerfile for node stack', () => {
      dockerfile('api', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalled();
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('Dockerfile');
      expect(files[0].content).toContain('node:20-alpine');
    });

    it('generates Dockerfile for python stack', () => {
      dockerfile('ml-service', { dryRun: false, force: false, stack: 'python' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('python:3.12-slim');
    });

    it('generates Dockerfile for go stack', () => {
      dockerfile('worker', { dryRun: false, force: false, stack: 'go' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('golang:1.22');
    });

    it('generates Dockerfile for java stack', () => {
      dockerfile('service', { dryRun: false, force: false, stack: 'java' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('eclipse-temurin:21');
    });

    it('uses custom port when provided', () => {
      dockerfile('api', { dryRun: false, force: false, port: '4000' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('4000');
    });
  });

  describe('dockerfileAction', () => {
    it('delegates to dockerfile', () => {
      dockerfileAction('app', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalled();
    });
  });

  describe('dockerCompose', () => {
    it('generates docker-compose.yml with postgres by default', () => {
      dockerCompose('myapp', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalled();
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files.length).toBe(1);
      expect(files[0].content).toContain('postgres:16');
      expect(files[0].content).toContain('postgresql://');
    });

    it('supports mysql database', () => {
      dockerCompose('myapp', { dryRun: false, force: false, db: 'mysql' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('mysql:8');
    });

    it('skips database service when db is none', () => {
      dockerCompose('myapp', { dryRun: false, force: false, db: 'none' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).not.toContain('image:');
    });
  });

  describe('githubActions', () => {
    it('generates CI workflow for node', () => {
      githubActions('myapp', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalled();
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files.length).toBe(1);
      expect(files[0].path).toContain('ci.yml');
      expect(files[0].content).toContain('npm ci');
    });

    it('generates CI workflow for python', () => {
      githubActions('myapp', { dryRun: false, force: false, stack: 'python' });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('pip install');
      expect(files[0].content).toContain('pytest');
    });
  });

  describe('terraform', () => {
    it('generates 3 infra files', () => {
      terraform('myapp', { dryRun: false, force: false });
      expect(generateFiles).toHaveBeenCalled();
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files.length).toBe(3);
      expect(files[0].path).toContain('main.tf');
      expect(files[1].path).toContain('variables.tf');
      expect(files[2].path).toContain('outputs.tf');
    });

    it('includes RDS instance with db_name', () => {
      terraform('myapp', { dryRun: false, force: false });
      const files = (generateFiles as jest.Mock).mock.calls[0][0];
      expect(files[0].content).toContain('aws_rds_instance');
      expect(files[0].content).toContain('db_name');
    });
  });
});
