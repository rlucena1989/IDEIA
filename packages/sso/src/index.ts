export { OIDCProvider } from './providers/oidc-provider';
export { SAMLProvider } from './providers/saml-provider';
export { LDAPProvider } from './providers/ldap-provider';
export { createSSOMiddleware } from './middleware/express-middleware';
export type { SSOMiddlewareOptions, SSOMiddleware } from './middleware/express-middleware';
export {
  OIDCConfigSchema,
  SAMLConfigSchema,
  LDAPConfigSchema,
} from './types';
export type {
  OIDCConfig,
  SAMLConfig,
  LDAPConfig,
  SSOProvider,
  SSOUser,
  SSOGroup,
  SSOSession,
  AuthResult,
} from './types';
