import { describe, it, expect } from '@jest/globals';
import { ContextualHelp, HELP_TOPICS } from '../contextual-help';

describe('ContextualHelp', () => {
  let help: ContextualHelp;

  beforeEach(() => {
    help = new ContextualHelp();
  });

  it('can be constructed', () => {
    expect(help).toBeDefined();
  });

  it('has help topics', () => {
    expect(HELP_TOPICS.length).toBeGreaterThanOrEqual(5);
  });

  it('getHelp returns a topic by id', () => {
    const topic = help.getHelp('getting-started');
    expect(topic).toBeDefined();
    expect(topic!.id).toBe('getting-started');
    expect(topic!.title).toBe('Getting Started');
  });

  it('getHelp returns undefined for unknown topic', () => {
    expect(help.getHelp('nonexistent')).toBeUndefined();
  });

  it('search returns matching topics', () => {
    const results = help.search('agent');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(t => t.title.toLowerCase().includes('agent'))).toBe(true);
  });

  it('search with empty query returns empty', () => {
    expect(help.search('')).toEqual([]);
  });

  it('getHelpForContext returns topics for a widget', () => {
    const topics = help.getHelpForContext('dashboard');
    expect(topics.length).toBeGreaterThan(0);
  });

  it('getHelpForContext returns getting-started for unknown widget', () => {
    const topics = help.getHelpForContext('unknown');
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].id).toBe('getting-started');
  });

  it('getAllTopics returns all topics', () => {
    const all = help.getAllTopics();
    expect(all.length).toBe(HELP_TOPICS.length);
  });

  it('lookupTerm delegates to glossary', () => {
    const term = help.lookupTerm('autonomy');
    expect(term).toBeDefined();
    expect(term!.term).toBe('autonomy');
  });

  it('every topic has required fields', () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.id).toBeTruthy();
      expect(topic.title).toBeTruthy();
      expect(topic.description).toBeTruthy();
      expect(topic.content).toBeTruthy();
      expect(Array.isArray(topic.relatedTopics)).toBe(true);
      expect(Array.isArray(topic.keywords)).toBe(true);
    }
  });
});
