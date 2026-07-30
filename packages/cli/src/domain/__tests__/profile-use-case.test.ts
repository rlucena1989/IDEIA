import { createProfileUseCase } from '../profile-use-case';

describe('ProfileUseCase', () => {
  const useCase = createProfileUseCase();

  beforeEach(() => {
    const profiles = useCase.listProfiles();
    for (const p of profiles.data ?? []) {
      useCase.deleteProfile(p.id);
    }
  });

  it('createProfile returns profile with defaults', () => {
    const result = useCase.createProfile('dev-user', 'developer', 2);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.name).toBe('dev-user');
    expect(result.data!.role).toBe('developer');
    expect(result.data!.autonomyLevel).toBe(2);
    expect(result.data!.preferences).toEqual({});
    expect(result.data!.id).toMatch(/^profile_/);
  });

  it('updatePreferences modifies preferences', () => {
    const created = useCase.createProfile('user1', 'architect', 3);
    const id = created.data!.id;

    const updated = useCase.updatePreferences(id, { theme: 'dark', verbose: true });
    expect(updated.ok).toBe(true);
    expect(updated.data!.preferences).toEqual({ theme: 'dark', verbose: true });

    const merged = useCase.updatePreferences(id, { theme: 'light' });
    expect(merged.data!.preferences).toEqual({ theme: 'light', verbose: true });
  });

  it('setAutonomyLevel changes level', () => {
    const created = useCase.createProfile('user2', 'tester', 1);
    const id = created.data!.id;

    const updated = useCase.setAutonomyLevel(id, 4);
    expect(updated.ok).toBe(true);
    expect(updated.data!.autonomyLevel).toBe(4);

    const clamped = useCase.setAutonomyLevel(id, 10);
    expect(clamped.data!.autonomyLevel).toBe(4);
  });

  it('deleteProfile removes profile', () => {
    const created = useCase.createProfile('temp', 'devops', 0);
    const id = created.data!.id;

    const delResult = useCase.deleteProfile(id);
    expect(delResult.ok).toBe(true);

    const getResult = useCase.getProfile(id);
    expect(getResult.ok).toBe(false);
    expect(getResult.code).toBe(1);
  });
});
