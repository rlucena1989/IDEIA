import { TestStubGenerator } from '../src/test-stub-generator';
import { GherkinParser } from '../src/gherkin-parser';

describe('TestStubGenerator', () => {
  it('should generate jest test stubs from gherkin', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: User Login
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should be redirected to dashboard`);

    const gen = new TestStubGenerator();
    const code = gen.generate(feature, 'jest');
    expect(code).toContain("describe('User Login'");
    expect(code).toContain("it('Successful login'");
    expect(code).toContain('// Given I am on the login page');
    expect(code).toContain('expect(true).toBe(true);');
  });

  it('should generate vitest stubs', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: API
  Scenario: GET /users
    Given the API is running
    When I request GET /users
    Then I should get 200`);

    const gen = new TestStubGenerator();
    const code = gen.generate(feature, 'vitest');
    expect(code).toContain("import { describe, it, expect } from 'vitest';");
    expect(code).toContain("describe('API'");
  });

  it('should generate from requirement with acceptance criteria', () => {
    const gen = new TestStubGenerator();
    const code = gen.generateFromRequirement(
      'User Authentication',
      'Users must be able to login',
      ['User can login with email and password', 'Invalid credentials show error message']
    );
    expect(code).toContain("describe('User Authentication'");
    expect(code).toContain('Scenario 1');
    expect(code).toContain('Scenario 2');
    expect(code).toContain('acceptance criteria');
  });

  it('should generate mocha stubs', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: Test
  Scenario: Basic
    Given a precondition`);

    const gen = new TestStubGenerator();
    const code = gen.generate(feature, 'mocha');
    expect(code).toContain('function()');
    expect(code).not.toContain('import {');
  });
});
