import { GherkinParser } from '../src/gherkin-parser';

describe('GherkinParser', () => {
  it('should parse a simple feature', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: User Login
  As a user I want to login

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should be redirected to dashboard`);

    expect(feature.title).toBe('User Login');
    expect(feature.scenarios).toHaveLength(1);
    expect(feature.scenarios[0].name).toBe('Successful login');
    expect(feature.scenarios[0].steps).toHaveLength(3);
  });

  it('should parse tags', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`@smoke @regression
Feature: Auth

  @slow
  Scenario: Login with token
    Given I have a valid token
    When I authenticate
    Then I should get access`);

    expect(feature.tags).toEqual(['@smoke', '@regression']);
    expect(feature.scenarios[0].tags).toEqual(['@slow']);
  });

  it('should parse background', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: Dashboard

  Background:
    Given I am logged in
    And I am on the dashboard page

  Scenario: View profile
    When I click profile
    Then I should see my info`);

    expect(feature.background).toHaveLength(2);
    expect(feature.background![0].keyword).toBe('Given');
    expect(feature.background![0].text).toBe('I am logged in');
  });

  it('should parse scenario outline with examples', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: Calculator

  Scenario Outline: Addition
    Given I have <a> and <b>
    When I add them
    Then the result should be <sum>

    Examples:
      | a | b | sum |
      | 1 | 2 | 3   |
      | 4 | 5 | 9   |`);

    expect(feature.scenarios[0].name).toBe('Addition');
    const steps = feature.scenarios[0].steps;
    expect(steps.some(s => s.text === 'examples:')).toBe(true);
    const examplesStep = steps.find(s => s.text === 'examples:');
    expect(examplesStep?.argument).toContain('| a | b | sum |');
  });

  it('should generate feature back to string', () => {
    const parser = new GherkinParser();
    const input = `@smoke
Feature: Login

  Scenario: Success
    Given I am on login page
    When I login
    Then I see dashboard`;

    const feature = parser.parse(input);
    const output = parser.generate(feature);
    expect(output).toContain('Feature: Login');
    expect(output).toContain('@smoke');
    expect(output).toContain('Scenario: Success');
    expect(output).toContain('Given I am on login page');
  });

  it('should handle multiple scenarios', () => {
    const parser = new GherkinParser();
    const feature = parser.parse(`Feature: Multiple

  Scenario: First
    Given step one

  Scenario: Second
    When step two`);

    expect(feature.scenarios).toHaveLength(2);
    expect(feature.scenarios[0].name).toBe('First');
    expect(feature.scenarios[1].name).toBe('Second');
  });
});
