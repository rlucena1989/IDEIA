export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
  failureType: 'transient' | 'structural' | 'unknown';
}

export function classifyFailure(error: string): 'transient' | 'structural' | 'unknown' {
  const transientPatterns = [
    'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND',
    'socket hang up', 'network', 'timeout', '429', '503',
    'Service Unavailable', 'Too Many Requests', 'temporary',
    'rate limit', 'Resource temporarily unavailable'
  ];
  const structuralPatterns = [
    'SyntaxError', 'TypeError', 'ReferenceError', 'Module not found',
    'Cannot find module', 'ERR_MODULE_NOT_FOUND', 'ERR_REQUIRE_ESM',
    'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_URL', 'ERR_INVALID_FILE_URL',
    'ERR_INVALID_PROTOCOL', 'ERR_INVALID_CALLBACK', 'ERR_INVALID_RETURN_VALUE',
    'ERR_INVALID_THIS', 'ERR_SYNTAX_ERROR', 'ERR_PARSE_ERROR',
    'lint', 'eslint', 'typecheck', 'tsc', 'TypeScript',
    'compilation error', 'build failed', 'precommit', 'hook',
    'EACCES', 'EPERM', 'ENOENT', 'ERR_ACCESS_DENIED',
    'ERR_MISSING_ARGS', 'ERR_INVALID_ARG_VALUE'
  ];

  const upper = error.toUpperCase();
  for (const p of structuralPatterns) {
    if (upper.includes(p.toUpperCase())) return 'structural';
  }
  for (const p of transientPatterns) {
    if (upper.includes(p.toUpperCase())) return 'transient';
  }
  return 'unknown';
}

export function getRetryDecision(attempt: number, maxAttempts = 3, error?: string): RetryDecision {
  if (attempt >= maxAttempts) {
    return { shouldRetry: false, delayMs: 0, attempt, failureType: 'unknown' };
  }

  if (error) {
    const failureType = classifyFailure(error);
    if (failureType === 'structural') {
      return { shouldRetry: false, delayMs: 0, attempt, failureType };
    }
    if (failureType === 'transient') {
      return {
        shouldRetry: true,
        delayMs: Math.min(1000 * Math.pow(2, attempt), 10000),
        attempt,
        failureType
      };
    }
  }

  return {
    shouldRetry: true,
    delayMs: Math.min(1000 * Math.pow(2, attempt), 10000),
    attempt,
    failureType: 'unknown'
  };
}