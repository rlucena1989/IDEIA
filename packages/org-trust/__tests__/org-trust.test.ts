import { OrgTrust } from '../src/org-trust';
describe('OrgTrust', () => {
  it('should register certifications', () => {
    const ot = new OrgTrust();
    ot.registerCertification('SOC2', 'SOC 2 Type II');
    expect(ot.getCertifications()).toHaveLength(1);
  });
  it('should update certification status', () => {
    const ot = new OrgTrust();
    const c = ot.registerCertification('ISO27001', 'ISO 27001');
    expect(ot.updateCertStatus(c.id, 'achieved', ['audit_report.pdf'])).toBe(true);
    expect(ot.getCertifications()[0].status).toBe('achieved');
  });
  it('should record compliance checks', () => {
    const ot = new OrgTrust();
    ot.recordCheck('Data encryption', 'security', true, 'AES-256 enabled');
    ot.recordCheck('Access control', 'security', false, 'MFA not enforced');
    const report = ot.getReport();
    expect(report.checks).toHaveLength(2);
    expect(report.score).toBeLessThan(100);
  });
  it('should compute trust level', () => {
    const ot = new OrgTrust();
    const c = ot.registerCertification('SOC2', 'SOC 2');
    ot.updateCertStatus(c.id, 'achieved');
    ot.recordCheck('All checks pass', 'general', true, 'OK');
    expect(ot.getReport().level).toBe('high');
  });
  it('should search certifications', () => {
    const ot = new OrgTrust();
    ot.registerCertification('SOC2', 'SOC 2 Type II');
    ot.registerCertification('PCI-DSS', 'PCI DSS v4');
    expect(ot.searchCert('soc')).toHaveLength(1);
    expect(ot.searchCert('pci')).toHaveLength(1);
  });
  it('should handle invalid updates', () => {
    const ot = new OrgTrust();
    expect(ot.updateCertStatus('nonexistent', 'achieved')).toBe(false);
  });
});
