import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import type { AsvsCheck, AsvsCategory } from './asvs-types';
const logger = createLogger('asvs-v4-access-control');

const CATEGORY: AsvsCategory = 'V4';

function scanFilesForPattern(rootDir: string, pattern: RegExp, maxResults = 5): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= maxResults) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (results.length >= maxResults) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const match = content.match(pattern);
            if (match) {
              const relative = path.relative(rootDir, full);
              results.push(`${relative}: ${match[0].slice(0, 100)}`);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return results;
}

function scanPackageJsonDeps(rootDir: string, depNames: string[]): string[] {
  const found: string[] = [];
  function walk(dir: string) {
    try {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const allDeps = { ...content.dependencies, ...content.devDependencies };
        for (const depName of depNames) {
          if (allDeps[depName]) {
            found.push(`${depName}@${allDeps[depName]} (in ${path.relative(rootDir, pkgPath)})`);
          }
        }
      }
    } catch {
    }
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(path.join(dir, entry.name));
        }
      }
    } catch {
    }
  }
  walk(rootDir);
  return found;
}

export function checkV4_1_1(rootDir: string): AsvsCheck {
  const rolePatterns = scanFilesForPattern(rootDir, /(role|Role|permission|Permission|least.?privilege|privilege.?separat|RBAC|ABAC|policy.*access|access.*policy)/i);
  const authorizationDeps = scanPackageJsonDeps(rootDir, ['casbin', 'casl', 'accesscontrol', 'acl', 'authorization', '@nestjs/casl', 'permissions']);
  const passed = rolePatterns.length > 0 || authorizationDeps.length > 0;
  const evidence: string[] = [];
  if (authorizationDeps.length > 0) evidence.push(`AuthZ libraries: ${authorizationDeps.join(', ')}`);
  if (rolePatterns.length > 0) evidence.push(`Role/permission patterns: ${rolePatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No least privilege principle implementation detected');
  return { id: '4.1.1', name: 'Verify least privilege principle is implemented', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_1_2(rootDir: string): AsvsCheck {
  const denyPatterns = scanFilesForPattern(rootDir, /(deny|denyAll|default.?deny|deny.?by.?default|block.?all|denyAccess|deny_request|access.*denied|unauthorized|forbidden|403)/i);
  const guardPatterns = scanFilesForPattern(rootDir, /(AuthGuard|@UseGuards|@Guard|guard.*auth|auth.*guard|permission.*guard|role.*guard)/i);
  const passed = denyPatterns.length > 0 || guardPatterns.length > 0;
  const evidence: string[] = [];
  if (denyPatterns.length > 0) evidence.push(`Default deny patterns: ${denyPatterns.slice(0, 3).join(', ')}`);
  if (guardPatterns.length > 0) evidence.push(`Access guards: ${guardPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No default deny access control detected');
  return { id: '4.1.2', name: 'Verify default deny access is enforced', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_1_3(rootDir: string): AsvsCheck {
  const privilegePatterns = scanFilesForPattern(rootDir, /(privilege.?separat|admin.*role|user.*role|elevat.*privilege|privilege.*escalat|runAs|impersonat|su-?do|sudo)/i);
  const serviceAccountPatterns = scanFilesForPattern(rootDir, /(service.?account|serviceAccount|service_account|process.*account)/i);
  const passed = privilegePatterns.length > 0 || serviceAccountPatterns.length > 0;
  const evidence: string[] = [];
  if (privilegePatterns.length > 0) evidence.push(`Privilege separation: ${privilegePatterns.slice(0, 3).join(', ')}`);
  if (serviceAccountPatterns.length > 0) evidence.push(`Service accounts: ${serviceAccountPatterns.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No privilege separation detected');
  return { id: '4.1.3', name: 'Verify privilege separation is enforced', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_2_1(rootDir: string): AsvsCheck {
  const sensitiveAccess = scanFilesForPattern(rootDir, /(sensitive.*data.*access|access.*sensitive|data.*restrict|restrict.*data|encrypt.*access|data.*visibility|mask.*sensitive)/i);
  const dataLayerSecurity = scanFilesForPattern(rootDir, /(repository.*guard|data.*access.*layer|dao.*security|database.*access.*control|db.*auth|graphql.*auth)/i);
  const passed = sensitiveAccess.length > 0 || dataLayerSecurity.length > 0;
  const evidence: string[] = [];
  if (sensitiveAccess.length > 0) evidence.push(`Sensitive data access controls: ${sensitiveAccess.slice(0, 3).join(', ')}`);
  if (dataLayerSecurity.length > 0) evidence.push(`Data layer security: ${dataLayerSecurity.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No access controls for sensitive data detected');
  return { id: '4.2.1', name: 'Verify access controls protect sensitive data', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_2_2(rootDir: string): AsvsCheck {
  const rbacPatterns = scanFilesForPattern(rootDir, /(RBAC|role.?based|role.*access|Casbin|CASL|AccessControl|@RequireRoles|@Roles|@HasRole|hasRole|hasPermission|canActivate|ability)/i);
  const roleConfigs = scanFilesForPattern(rootDir, /(role|Role)\s*[:=]\s*\[\s*['"]|enum.*Role|RolesEnum|UserRole/i);
  const passed = rbacPatterns.length > 0 || roleConfigs.length > 0;
  const evidence: string[] = [];
  if (rbacPatterns.length > 0) evidence.push(`RBAC libraries: ${rbacPatterns.slice(0, 3).join(', ')}`);
  if (roleConfigs.length > 0) evidence.push(`Role definitions: ${roleConfigs.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No role-based access controls detected');
  return { id: '4.2.2', name: 'Verify role-based access controls are implemented', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_3_1(rootDir: string): AsvsCheck {
  const adminControls = scanFilesForPattern(rootDir, /(admin|Admin).{0,30}(guard|control|protect|restrict|access|secure)/i);
  const adminEndpoints = scanFilesForPattern(rootDir, /(\/admin|\/manage|\/control|\/dashboard|\/system)/i);
  const adminDeps = scanPackageJsonDeps(rootDir, ['adminjs', 'react-admin', 'admin-bro', 'forest-admin']);
  const passed = adminControls.length > 0 || adminDeps.length > 0;
  const evidence: string[] = [];
  if (adminControls.length > 0) evidence.push(`Admin controls: ${adminControls.slice(0, 3).join(', ')}`);
  if (adminEndpoints.length > 0) evidence.push(`Admin endpoints: ${adminEndpoints.slice(0, 3).join(', ')}`);
  if (adminDeps.length > 0) evidence.push(`Admin libraries: ${adminDeps.join(', ')}`);
  if (!passed) evidence.push('No administrative access controls detected');
  return { id: '4.3.1', name: 'Verify administrative access is properly controlled', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_3_2(rootDir: string): AsvsCheck {
  const endpointSecurity = scanFilesForPattern(rootDir, /(@UseGuards|@Guard|authGuard|AuthGuard|@Route|@Controller|@RequestMapping|middleware.*auth|auth.*middleware|authenticate|authorize)/i);
  const routeSecurity = scanFilesForPattern(rootDir, /(router.*use|app\.use|app\.all|Route.*guard|router.*guard)/i);
  const passed = endpointSecurity.length > 0;
  const evidence: string[] = [];
  if (endpointSecurity.length > 0) evidence.push(`Endpoint security: ${endpointSecurity.slice(0, 4).join(', ')}`);
  if (routeSecurity.length > 0) evidence.push(`Route guards: ${routeSecurity.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No access control for all endpoints detected');
  return { id: '4.3.2', name: 'Verify access controls exist for all endpoints', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function checkV4_3_3(rootDir: string): AsvsCheck {
  const apiAuthPatterns = scanFilesForPattern(rootDir, /(@UseGuards|AuthGuard|authenticate|authorize|@Auth|token.*guard|jwt.*guard|apiKey.*guard)/i);
  const apiAuthDeps = scanPackageJsonDeps(rootDir, ['passport', 'passport-jwt', 'passport-http', '@nestjs/passport', 'jsonwebtoken', 'jose']);
  const passed = apiAuthPatterns.length > 0 || apiAuthDeps.length > 0;
  const evidence: string[] = [];
  if (apiAuthDeps.length > 0) evidence.push(`API auth libraries: ${apiAuthDeps.join(', ')}`);
  if (apiAuthPatterns.length > 0) evidence.push(`API auth patterns: ${apiAuthPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No authenticated access for all APIs detected');
  return { id: '4.3.3', name: 'Verify authenticated access to all APIs', category: CATEGORY, level: 1, passed, evidence: evidence.join(' | ') };
}

export function runAllV4Checks(rootDir: string): AsvsCheck[] {
  return [
    checkV4_1_1(rootDir),
    checkV4_1_2(rootDir),
    checkV4_1_3(rootDir),
    checkV4_2_1(rootDir),
    checkV4_2_2(rootDir),
    checkV4_3_1(rootDir),
    checkV4_3_2(rootDir),
    checkV4_3_3(rootDir),
  ];
}
