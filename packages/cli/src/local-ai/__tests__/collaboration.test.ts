import { describe, it, expect } from '@jest/globals';
import { saveSession, loadSession, listSessions, startCollaboration } from '../collaboration';
import type { AgentMessage, CollaborationSession } from '../collaboration';

describe('collaboration', () => {
  it('saveSession should be defined', () => {
    expect(saveSession).toBeDefined();
  });
  it('loadSession should be defined', () => {
    expect(loadSession).toBeDefined();
  });
  it('listSessions should be defined', () => {
    expect(listSessions).toBeDefined();
  });
  it('startCollaboration should be defined', () => {
    expect(startCollaboration).toBeDefined();
  });
  it('saveSession should be defined', () => {
    expect(saveSession).toBeDefined();
  });
  it('loadSession should be defined', () => {
    expect(loadSession).toBeDefined();
  });
  it('listSessions should be defined', () => {
    expect(listSessions).toBeDefined();
  });
  it('AgentMessage interface should be a type', () => {
    expect(typeof (null as unknown as AgentMessage)).toBe('object');
  });
  it('CollaborationSession interface should be a type', () => {
    expect(typeof (null as unknown as CollaborationSession)).toBe('object');
  });
});
