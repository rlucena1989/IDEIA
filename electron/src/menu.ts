import { app, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from 'electron';

export function createAppMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'New Project...',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-action', 'new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-action', 'open-project'),
        },
        { type: 'separator' },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-action', 'save-all'),
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }]),
      ],
    },

    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },

    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        { type: 'separator' },
        {
          label: 'Dashboard',
          click: () => mainWindow.webContents.send('menu-action', 'open-dashboard'),
        },
        {
          label: 'Security Dashboard',
          click: () => mainWindow.webContents.send('menu-action', 'open-security'),
        },
      ],
    },

    {
      label: 'IDEIA',
      submenu: [
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow.webContents.send('menu-action', 'open-chat'),
        },
        {
          label: 'Run Agent...',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow.webContents.send('menu-action', 'run-agent'),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => mainWindow.webContents.send('check-updates'),
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-action', 'open-settings'),
        },
      ],
    },

    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://ideia.dev/docs'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/anomalyco/ideia/issues'),
        },
        { type: 'separator' },
        {
          label: 'About IDEIA',
          click: () => mainWindow.webContents.send('menu-action', 'about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

export function updateMenuTheme(isDark: boolean): void {
  const menu = Menu.getApplicationMenu();
  if (menu) {
    Menu.setApplicationMenu(menu);
  }
}
