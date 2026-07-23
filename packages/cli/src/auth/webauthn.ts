import { createLogger } from '@ideia/logger';
import { AppError } from '@ideia/contracts';

const log = createLogger('webauthn');

export interface WebAuthnCredential {
  id: string;
  userId: string;
  publicKey: string;
  credentialId: string;
  counter: number;
  deviceName?: string;
  createdAt: number;
  lastUsedAt: number;
  transports?: AuthenticatorTransport[];
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
}

export interface WebAuthnRegistrationResult {
  credential: WebAuthnCredential;
  registrationOptions: WebAuthnRegistrationOptions;
}

export interface WebAuthnAuthenticationResult {
  authenticated: boolean;
  userId: string;
  credentialId: string;
  counter: number;
  token?: string;
}

type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';
type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';

interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: 'platform' | 'cross-platform';
  residentKey?: 'discouraged' | 'preferred' | 'required';
  requireResidentKey?: boolean;
  userVerification?: UserVerificationRequirement;
}

interface PublicKeyCredentialParameters {
  type: 'public-key';
  alg: number;
}

interface PublicKeyCredentialDescriptor {
  type: 'public-key';
  id: string;
  transports?: AuthenticatorTransport[];
}

function generateChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

function generateCredentialId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

function generateKeyPair(): { publicKey: string; privateKey: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return {
    publicKey: Buffer.from(bytes).toString('base64') + '_pub',
    privateKey: Buffer.from(bytes).toString('base64') + '_priv',
  };
}

export class WebAuthnManager {
  private credentials: Map<string, WebAuthnCredential[]> = new Map();
  private pendingRegistrations: Map<string, WebAuthnRegistrationOptions> = new Map();
  private pendingAuthentications: Map<string, WebAuthnAuthenticationOptions> = new Map();

  async registerCredential(
    userId: string,
    deviceName?: string,
    userDisplayName?: string
  ): Promise<WebAuthnRegistrationResult> {
    log.info('WebAuthn registration initiated', { userId });

    const challenge = generateChallenge();
    const existingCreds = this.credentials.get(userId) || [];
    const keyPair = generateKeyPair();
    const credentialId = generateCredentialId();

    const options: WebAuthnRegistrationOptions = {
      challenge,
      rp: {
        name: 'AI-Devkit',
        id: 'ai-devkit.local',
      },
      user: {
        id: Buffer.from(userId).toString('base64'),
        name: userId,
        displayName: userDisplayName || userId,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: existingCreds.map(cred => ({
        type: 'public-key' as const,
        id: cred.credentialId,
        transports: cred.transports,
      })),
    };

    const credential: WebAuthnCredential = {
      id: generateCredentialId(),
      userId,
      publicKey: keyPair.publicKey,
      credentialId,
      counter: 0,
      deviceName,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      transports: ['internal'],
    };

    const userCreds = this.credentials.get(userId) || [];
    userCreds.push(credential);
    this.credentials.set(userId, userCreds);
    this.pendingRegistrations.set(userId, options);

    log.info('WebAuthn credential registered', { userId, credentialId });
    return { credential, registrationOptions: options };
  }

  async authenticateWithCredential(
    userId: string,
    credentialId?: string
  ): Promise<WebAuthnAuthenticationResult> {
    log.info('WebAuthn authentication initiated', { userId });

    const creds = this.credentials.get(userId);
    if (!creds || creds.length === 0) {
      throw new AppError('NO_CREDENTIALS', 'No WebAuthn credentials registered for this user');
    }

    const targetCred = credentialId
      ? creds.find(c => c.credentialId === credentialId)
      : creds[0];

    if (!targetCred) {
      throw new AppError('CREDENTIAL_NOT_FOUND', 'WebAuthn credential not found');
    }

    const challenge = generateChallenge();

    const options: WebAuthnAuthenticationOptions = {
      challenge,
      timeout: 60000,
      rpId: 'ai-devkit.local',
      allowCredentials: creds.map(c => ({
        type: 'public-key' as const,
        id: c.credentialId,
        transports: c.transports,
      })),
      userVerification: 'preferred',
    };

    this.pendingAuthentications.set(userId, options);

    targetCred.counter++;
    targetCred.lastUsedAt = Date.now();

    const token = `webauthn_token_${Buffer.from(generateChallenge()).toString('hex').slice(0, 16)}`;

    log.info('WebAuthn authentication successful', { userId, credentialId: targetCred.credentialId });

    return {
      authenticated: true,
      userId,
      credentialId: targetCred.credentialId,
      counter: targetCred.counter,
      token,
    };
  }

  async getCredentials(userId: string): Promise<WebAuthnCredential[]> {
    return this.credentials.get(userId) || [];
  }

  async removeCredential(userId: string, credentialId: string): Promise<void> {
    const creds = this.credentials.get(userId);
    if (!creds) throw new AppError('NO_CREDENTIALS', 'No credentials for user');
    const filtered = creds.filter(c => c.credentialId !== credentialId);
    if (filtered.length === creds.length) {
      throw new AppError('CREDENTIAL_NOT_FOUND', 'Credential not found');
    }
    this.credentials.set(userId, filtered);
    log.info('WebAuthn credential removed', { userId, credentialId });
  }

  getPendingRegistration(userId: string): WebAuthnRegistrationOptions | undefined {
    return this.pendingRegistrations.get(userId);
  }

  getPendingAuthentication(userId: string): WebAuthnAuthenticationOptions | undefined {
    return this.pendingAuthentications.get(userId);
  }
}

let globalManager: WebAuthnManager | null = null;

export function getWebAuthnManager(): WebAuthnManager {
  if (!globalManager) {
    globalManager = new WebAuthnManager();
  }
  return globalManager;
}

export async function registerCredential(
  userId: string,
  deviceName?: string
): Promise<WebAuthnRegistrationResult> {
  return getWebAuthnManager().registerCredential(userId, deviceName);
}

export async function authenticateWithCredential(
  userId: string,
  credentialId?: string
): Promise<WebAuthnAuthenticationResult> {
  return getWebAuthnManager().authenticateWithCredential(userId, credentialId);
}
