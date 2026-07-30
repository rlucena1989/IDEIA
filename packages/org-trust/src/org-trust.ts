import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Certification, CertificationStatus, ComplianceCheck, TrustReport } from './types';
export class OrgTrust {
  private certifications: Map<string,Certification> = new Map();
  private checks: ComplianceCheck[] = [];
  registerCertification(name: string, standard: string): Certification {
    const cert: Certification = { id: randomUUID(), name, standard, status: 'none', evidence: [] };
    this.certifications.set(cert.id, cert); return cert;
  }
  updateCertStatus(id: string, status: CertificationStatus, evidence?: string[]): boolean {
    const c = this.certifications.get(id); if (!c) return false;
    c.status = status; if (status === 'achieved') c.achievedAt = new Date().toISOString();
    if (evidence) c.evidence.push(...evidence); return true;
  }
  recordCheck(name: string, category: string, passed: boolean, details: string): ComplianceCheck {
    const check: ComplianceCheck = { name, category, passed, details, timestamp: new Date().toISOString() };
    this.checks.push(check); return check;
  }
  getReport(): TrustReport {
    const certs = Array.from(this.certifications.values());
    const achieved = certs.filter(c => c.status === 'achieved').length;
    const passedChecks = this.checks.filter(c => c.passed).length;
    const certScore = certs.length ? (achieved / certs.length) * 50 : 0;
    const checkScore = this.checks.length ? (passedChecks / this.checks.length) * 50 : 50;
    const score = Math.round(certScore + checkScore);
    const level = score >= 80 ? 'high' : score >= 50 ? 'medium' : score >= 20 ? 'low' : 'critical';
    return { certifications: certs, checks: [...this.checks], score, level };
  }
  getCertifications(): Certification[] { return Array.from(this.certifications.values()); }
  searchCert(query: string): Certification[] {
    const q = query.toLowerCase();
    return Array.from(this.certifications.values()).filter(c => c.name.toLowerCase().includes(q) || c.standard.toLowerCase().includes(q));
  }
}
export function createOrgTrust(): OrgTrust { return new OrgTrust(); }
