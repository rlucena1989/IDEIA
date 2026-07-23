export type ErrorHandler = (err: Error) => void;

let onFatalError: ErrorHandler | null = null;

export function setFatalErrorHandler(handler: ErrorHandler | null): void {
  onFatalError = handler;
}

function handleFatal(err: Error): void {
  console.error(`[FATAL] ${err.message}`);
  console.error(err.stack?.split('\n').slice(0, 5).join('\n'));
  if (onFatalError) {
    onFatalError(err);
  }
}

export function setupGlobalErrorHandlers(exitOnFatal = false): void {
  process.on('uncaughtException', (err) => {
    handleFatal(err);
    if (exitOnFatal) process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    handleFatal(err);
    if (exitOnFatal) process.exit(1);
  });
}
