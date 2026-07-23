import { ipcRenderer } from 'electron';

try {
  (window as any).ideia = {
    platform: process.platform,
    versions: {
      node: process.versions.node,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
    },
    onNavigate: (callback: (route: string) => void) => {
      ipcRenderer.on('navigate', (_event: any, route: string) => callback(route));
    },
    openExternal: (url: string) => {
      ipcRenderer.invoke('open-external', url);
    },
  };
} catch (e) {
  console.warn('[IDEIA preload]', e);
}
