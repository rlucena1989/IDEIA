export function getIO() {
  return {
    fs: {
      cwd: () => process.cwd(),
      exists: () => true,
      read: () => '',
      readDir: () => [],
      stat: () => ({ mtimeMs: Date.now(), size: 0 }),
      write: () => {},
      mkdir: () => {},
      remove: () => {},
    },
    shell: {
      exec: () => ({ status: 0, stdout: '', stderr: '' }),
      execString: () => ({ status: 0, stdout: '', stderr: '' }),
      spawn: () => ({ on: () => {}, pid: 0 }),
    },
    http: {
      get: () => Promise.resolve({ status: 200, data: null }),
      post: () => Promise.resolve({ status: 200, data: null }),
    },
  };
}

export function createIO() {
  return getIO();
}

export function resetIO() {}
