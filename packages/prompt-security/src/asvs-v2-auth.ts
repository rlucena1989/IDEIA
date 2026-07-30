import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import type { AsvsCheck, AsvsCategory } from './asvs-types';
const logger = createLogger('asvs-v2-auth');

const CATEGORY: AsvsCategory = 'V2';

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
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const match = content.match(pattern);
            if (match) {
              const relative = path.relative(rootDir, full);
              results.push(`${relative}: ${match[0].slice(0, 80)}`);
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

function scanForZodSchemas(rootDir: string): string[] {
  return scanFilesForPattern(rootDir, /z\.object\(\{[^}]*\}[^)]*\)/);
}

function scanForHelmet(rootDir: string): string[] {
  return scanPackageJsonDeps(rootDir, ['helmet']);
}

function scanForCspHeaders(rootDir: string): string[] {
  return scanFilesForPattern(rootDir, /content-security-policy|csp|ContentSecurityPolicy/i);
}

export function checkV2_1_1(rootDir: string): AsvsCheck {
  const authDeps = scanPackageJsonDeps(rootDir, ['passport', 'passport-http', 'passport-jwt', '@nestjs/passport', 'jsonwebtoken', 'jose', 'next-auth', 'remix-auth', 'express-session', 'cookie-parser', 'bcrypt', 'bcryptjs', 'argon2']);
  const authPatterns = scanFilesForPattern(rootDir, /(authenticate|authorize|login|signIn|signUp|register|authGuard|AuthGuard|@UseGuards)/i);
  const passed = authDeps.length > 0 || authPatterns.length > 0;
  const evidence: string[] = [];
  if (authDeps.length > 0) evidence.push(`Auth dependencies found: ${authDeps.slice(0, 5).join(', ')}`);
  if (authPatterns.length > 0) evidence.push(`Auth patterns in code: ${authPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No authentication libraries or patterns detected');
  return {
    id: '2.1.1',
    name: 'Verify that authentication is required for all sensitive endpoints',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV2_1_2(rootDir: string): AsvsCheck {
  const bcryptDeps = scanPackageJsonDeps(rootDir, ['bcrypt', 'bcryptjs', 'argon2', 'password-validator', 'owasp-password-strength-test', 'zxcvbn', 'zod']);
  const passwordPatterns = scanFilesForPattern(rootDir, /(password|senha|passwd).*?(min[Ll]ength|minLength|maxLength|uppercase|lowercase|digit|symbol|specialChar|strength|force)/i);
  const hasZodPassword = scanFilesForPattern(rootDir, /z\.string\(\)[\s\S]{0,200}min\(\d+\).{0,200}(?:password|senha)/i);
  const passed = bcryptDeps.length > 0 || passwordPatterns.length > 0 || hasZodPassword.length > 0;
  const evidence: string[] = [];
  if (bcryptDeps.length > 0) evidence.push(`Password hashing: ${bcryptDeps.slice(0, 3).join(', ')}`);
  if (passwordPatterns.length > 0) evidence.push(`Password rules: ${passwordPatterns.slice(0, 2).join(', ')}`);
  if (hasZodPassword.length > 0) evidence.push(`Zod password validation: ${hasZodPassword.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No password strength requirements detected');
  return {
    id: '2.1.2',
    name: 'Verify password strength requirements exist',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV2_2_1(rootDir: string): AsvsCheck {
  const strongHashing = scanPackageJsonDeps(rootDir, ['argon2', 'bcrypt', 'bcryptjs']);
  const hashPatterns = scanFilesForPattern(rootDir, /(argon2\.hash|argon2\.verify|bcrypt\.hash|bcrypt\.hashSync|bcrypt\.compare|hashSync|compareSync|hashPassword|verifyPassword)/i);
  const passed = strongHashing.length > 0 || hashPatterns.length > 0;
  const evidence: string[] = [];
  if (strongHashing.length > 0) evidence.push(`Strong hashing libs: ${strongHashing.join(', ')}`);
  if (hashPatterns.length > 0) evidence.push(`Hash verification: ${hashPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No approved credential storage encryption detected');
  return { id: '2.2.1', name: 'Verify credential storage uses approved encryption', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV2_3_1(rootDir: string): AsvsCheck {
  const mfaAdminPatterns = scanFilesForPattern(rootDir, /(admin.*mfa|mfa.*admin|admin.*2fa|2fa.*admin|admin.*totp|admin.*otp|admin.*authenticator|admin.*multi.?factor)/i);
  const mfaEnforcePatterns = scanFilesForPattern(rootDir, /(mfaRequired|requireMfa|forceMfa|enforceMfa|mfa.*required|mfa.*enforce|two.?factor.*require)/i);
  const passed = mfaAdminPatterns.length > 0 || mfaEnforcePatterns.length > 0;
  const evidence: string[] = [];
  if (mfaAdminPatterns.length > 0) evidence.push(`Admin MFA patterns: ${mfaAdminPatterns.slice(0, 3).join(', ')}`);
  if (mfaEnforcePatterns.length > 0) evidence.push(`MFA enforcement: ${mfaEnforcePatterns.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No MFA enforcement for admin accounts detected');
  return { id: '2.3.1', name: 'Verify MFA is enforced for admin accounts', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV2_4_1(rootDir: string): AsvsCheck {
  const credStrengthPatterns = scanFilesForPattern(rootDir, /(password.*config|password.*policy|password.*rule|password.*strength|minLength|maxLength|uppercase|lowercase|digit|specialChar|symbol|password.*complexity)/i);
  const credConfigFiles = scanFilesForPattern(rootDir, /(password\.config|auth\.config|authConfig|passwordPolicy|password_policy)/i);
  const passed = credStrengthPatterns.length > 0 || credConfigFiles.length > 0;
  const evidence: string[] = [];
  if (credStrengthPatterns.length > 0) evidence.push(`Credential strength config: ${credStrengthPatterns.slice(0, 3).join(', ')}`);
  if (credConfigFiles.length > 0) evidence.push(`Config files: ${credConfigFiles.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No credential strength configuration detected');
  return { id: '2.4.1', name: 'Verify credential strength configuration exists', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV2_5_1(rootDir: string): AsvsCheck {
  const apiKeyDeps = scanPackageJsonDeps(rootDir, ['passport-http', 'passport-headerapikey', 'express-api-key', 'api-key']);
  const apiKeyPatterns = scanFilesForPattern(rootDir, /(api[_-]?key|apikey|X-API-Key|x-api-key|apiKey|API_KEY)/i);
  const passed = apiKeyDeps.length > 0 || apiKeyPatterns.length > 0;
  const evidence: string[] = [];
  if (apiKeyDeps.length > 0) evidence.push(`API key deps: ${apiKeyDeps.join(', ')}`);
  if (apiKeyPatterns.length > 0) evidence.push(`API key patterns: ${apiKeyPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No API key authentication detected');
  return {
    id: '2.5.1',
    name: 'Verify API key authentication exists',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV2_6_1(rootDir: string): AsvsCheck {
  const noncePatterns = scanFilesForPattern(rootDir, /(nonce|timestamp.*valid|replay.*protect|replay.*attack|token.*nonce|nonce.*token|request.*timestamp|expire|expiry|ttl|iat|exp)/i);
  const jwtClaims = scanFilesForPattern(rootDir, /(jwt.*exp|jwt.*iat|jwt.*nbf|token.*expire|token.*ttl|sign.*expires|sign.*expiresIn)/i);
  const passed = noncePatterns.length > 0 || jwtClaims.length > 0;
  const evidence: string[] = [];
  if (noncePatterns.length > 0) evidence.push(`Nonce/timestamp protection: ${noncePatterns.slice(0, 3).join(', ')}`);
  if (jwtClaims.length > 0) evidence.push(`JWT expiry claims: ${jwtClaims.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No replay attack protection detected');
  return { id: '2.6.1', name: 'Verify replay attack protection through nonce/timestamp', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}

export function checkV2_7_1(rootDir: string): AsvsCheck {
  const hsmPatterns = scanFilesForPattern(rootDir, /(hsm|TPM|hardware.?security.?module|secure.?enclave|KeyStore|keyStore|keystore|key.?vault|KeyVault|vault)/i);
  const hsmDeps = scanPackageJsonDeps(rootDir, ['keyvault', '@azure/keyvault-secrets', 'aws-sdk', '@aws-sdk/client-kms', 'google-cloud-kms']);
  const passed = hsmPatterns.length > 0 || hsmDeps.length > 0;
  const evidence: string[] = [];
  if (hsmPatterns.length > 0) evidence.push(`HSM/secure storage: ${hsmPatterns.slice(0, 3).join(', ')}`);
  if (hsmDeps.length > 0) evidence.push(`KMS integrations: ${hsmDeps.join(', ')}`);
  if (!passed) evidence.push('No hardware-backed key storage detected');
  return { id: '2.7.1', name: 'Verify hardware-backed key storage (HSM/TPM)', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function checkV2_8_1(rootDir: string): AsvsCheck {
  const recoveryPatterns = scanFilesForPattern(rootDir, /(forgot|reset|recover|restore).{0,20}(password|senha|credential)/i);
  const recoveryDeps = scanPackageJsonDeps(rootDir, ['nodemailer', 'sendgrid', 'resend', 'mailgun-js']);
  const passed = recoveryPatterns.length > 0 || recoveryDeps.length > 0;
  const evidence: string[] = [];
  if (recoveryPatterns.length > 0) evidence.push(`Recovery patterns: ${recoveryPatterns.slice(0, 3).join(', ')}`);
  if (recoveryDeps.length > 0) evidence.push(`Email deps for recovery: ${recoveryDeps.join(', ')}`);
  if (!passed) evidence.push('No credential recovery process detected');
  return {
    id: '2.8.1',
    name: 'Verify credential recovery process exists',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV2_9_1(rootDir: string): AsvsCheck {
  const invalidationPatterns = scanFilesForPattern(rootDir, /(password.*change|change.*password|password.*reset|reset.*password|session.*destroy.*password|password.*session.*invalid|invalidate.*session|logoutAll|logout.*all|revoke.*token)/i);
  const passed = invalidationPatterns.length > 0;
  const evidence: string[] = [];
  if (invalidationPatterns.length > 0) evidence.push(`Session invalidation on password change: ${invalidationPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No session invalidation on password change detected');
  return { id: '2.9.1', name: 'Verify session invalidation on password change', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function checkV2_10_1(rootDir: string): AsvsCheck {
  const mfaPatterns = scanFilesForPattern(rootDir, /(mfa|multi.?factor|two.?factor|2fa|2FA|totp|otp|one.?time.?password|authenticator)/i);
  const mfaDeps = scanPackageJsonDeps(rootDir, ['speakeasy', 'otplib', 'notp', 'authenticator', '@google-cloud/recaptcha-enterprise']);
  const passed = mfaPatterns.length > 0 || mfaDeps.length > 0;
  const evidence: string[] = [];
  if (mfaDeps.length > 0) evidence.push(`MFA deps: ${mfaDeps.join(', ')}`);
  if (mfaPatterns.length > 0) evidence.push(`MFA patterns: ${mfaPatterns.slice(0, 3).join(', ')}`);
  if (!passed) evidence.push('No MFA configuration detected');
  return {
    id: '2.10.1',
    name: 'Verify MFA is configurable',
    category: CATEGORY,
    level: 1,
    passed,
    evidence: evidence.join(' | '),
  };
}

export function checkV2_11_1(rootDir: string): AsvsCheck {
  const lockoutPatterns = scanFilesForPattern(rootDir, /(lockout|lock.?out|account.?lock|account.?block|brute.?force|bruteforce|max.*(attempt|retry|fail)|rate.?limit.*login|login.*rate)/i);
  const lockoutConfigs = scanFilesForPattern(rootDir, /(maxLoginAttempts|maxAttempts|lockoutDuration|lockoutTime|loginAttempts|failedAttempts)/i);
  const passed = lockoutPatterns.length > 0 || lockoutConfigs.length > 0;
  const evidence: string[] = [];
  if (lockoutPatterns.length > 0) evidence.push(`Lockout patterns: ${lockoutPatterns.slice(0, 3).join(', ')}`);
  if (lockoutConfigs.length > 0) evidence.push(`Lockout config: ${lockoutConfigs.slice(0, 2).join(', ')}`);
  if (!passed) evidence.push('No account lockout after brute force attempts detected');
  return { id: '2.11.1', name: 'Verify account lockout after brute force attempts', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}

export function runAllV2Checks(rootDir: string): AsvsCheck[] {
  return [
    checkV2_1_1(rootDir),
    checkV2_1_2(rootDir),
    checkV2_2_1(rootDir),
    checkV2_3_1(rootDir),
    checkV2_4_1(rootDir),
    checkV2_5_1(rootDir),
    checkV2_6_1(rootDir),
    checkV2_7_1(rootDir),
    checkV2_8_1(rootDir),
    checkV2_9_1(rootDir),
    checkV2_10_1(rootDir),
    checkV2_11_1(rootDir),
  ];
}
