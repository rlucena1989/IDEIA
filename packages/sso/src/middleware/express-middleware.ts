import { SSOProvider, AuthResult } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('express-middleware');

export interface SSOMiddlewareOptions {
  providers: Map<string, SSOProvider>;
  defaultProvider?: string;
  sessionDuration?: number;
  onUnauthenticated?: (req: unknown, res: unknown) => void;
}

export interface SSOMiddleware {
  authGuard: () => unknown;
  callbackHandler: (providerName: string) => unknown;
  getProvider: (name: string) => SSOProvider | undefined;
  registerProvider: (name: string, provider: SSOProvider) => void;
  authenticate: (providerName: string, credentials: unknown) => Promise<AuthResult>;
}

export function createSSOMiddleware(options: SSOMiddlewareOptions): SSOMiddleware {
  const { providers, defaultProvider } = options;
  const providerMap = new Map(providers);

  function getProvider(name: string): SSOProvider | undefined {
    return providerMap.get(name);
  }

  function registerProvider(name: string, provider: SSOProvider): void {
    providerMap.set(name, provider);
  }

  function authGuard(): unknown {
    return (req: { headers: Record<string, string | undefined>; url: string }, res: { statusCode?: number; end?: (msg: string) => void }, next: () => void) => {
      const authHeader = req.headers['authorization'];
      const sessionCookie = req.headers['cookie'];

      if (authHeader?.startsWith('Bearer ') || sessionCookie?.includes('sso_session=')) {
        return next();
      }

      const provider = defaultProvider ? providerMap.get(defaultProvider) : undefined;
      if (provider && provider.type === 'oidc' && 'authorize' in provider) {
        const oidcProvider = provider as { authorize: () => string };
        if (typeof oidcProvider.authorize === 'function') {
          if (typeof res.statusCode === 'number') res.statusCode = 302;
          return res;
        }
      }

      if (res.statusCode) res.statusCode = 401;
      if (res.end) res.end('Unauthorized');
      return undefined;
    };
  }

  function callbackHandler(providerName: string): unknown {
    return async (req: { body?: Record<string, unknown>; query?: Record<string, string> }, res: { statusCode?: number; json?: (data: unknown) => void; end?: (msg: string) => void }) => {
      const provider = providerMap.get(providerName);
      if (!provider) {
        if (res.statusCode) res.statusCode = 404;
        if (res.json) res.json({ error: `provider ${providerName} not found` });
        return;
      }

      const code = req.query?.code || req.body?.code;
      if (!code) {
        if (res.statusCode) res.statusCode = 400;
        if (res.json) res.json({ error: 'authorization code required' });
        return;
      }
      if (res.statusCode) res.statusCode = 200;
      if (res.json) res.json({ success: true, provider: providerName });
    };
  }

  async function authenticate(providerName: string, credentials: unknown): Promise<AuthResult> {
    const provider = providerMap.get(providerName);
    if (!provider) {
      return { success: false, error: `provider ${providerName} not found` };
    }
    return provider.authenticate(credentials);
  }

  return {
    authGuard,
    callbackHandler,
    getProvider,
    registerProvider,
    authenticate,
  };
}
