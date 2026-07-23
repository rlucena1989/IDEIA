import { FRAMEWORKS, FrameworkDefinition, FrameworkRequirement } from '../compliance/frameworks';

describe('compliance - frameworks', () => {
  it('FRAMEWORKS deve ter frameworks definidos', () => {
    expect(FRAMEWORKS.length).toBeGreaterThan(0);
  });

  it('cada framework deve ter id, name, description, requirements', () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.id).toBeTruthy();
      expect(fw.name).toBeTruthy();
      expect(fw.description).toBeTruthy();
      expect(fw.requirements.length).toBeGreaterThan(0);
    }
  });

  it('deve conter SOC 2', () => {
    const soc2 = FRAMEWORKS.find(f => f.id === 'soc2');
    expect(soc2).toBeDefined();
    expect(soc2!.name).toBe('SOC 2');
    expect(soc2!.requirements.length).toBeGreaterThanOrEqual(6);
  });

  it('deve conter PCI DSS', () => {
    const pci = FRAMEWORKS.find(f => f.id === 'pci-dss');
    expect(pci).toBeDefined();
    expect(pci!.name).toContain('PCI DSS');
  });

  it('deve conter ISO 27001', () => {
    const iso = FRAMEWORKS.find(f => f.id === 'iso27001');
    expect(iso).toBeDefined();
  });

  it('deve conter LGPD', () => {
    const lgpd = FRAMEWORKS.find(f => f.id === 'lgpd');
    expect(lgpd).toBeDefined();
  });

  it('cada requirement deve ter id, title, description, keywords', () => {
    for (const fw of FRAMEWORKS) {
      for (const req of fw.requirements) {
        expect(req.id).toBeTruthy();
        expect(req.title).toBeTruthy();
        expect(req.description).toBeTruthy();
        expect(Array.isArray(req.keywords)).toBe(true);
        expect(req.keywords.length).toBeGreaterThan(0);
      }
    }
  });

  it('requirements ids devem ser unicos dentro de cada framework', () => {
    for (const fw of FRAMEWORKS) {
      const ids = fw.requirements.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});