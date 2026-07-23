import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { checkSystem, runFirstRunWizard } from './installer';
import { AppUpdater } from './updater';
import { AppTray } from './tray';
import { DesktopNotifier } from './notifications';

const THEIA_PORT = 3000;
const THEIA_HOST = '127.0.0.1';

let mainWindow: BrowserWindow | null = null;
let theiaServer: ChildProcess | null = null;

function log(msg: string): void {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'ideia.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
  console.log(msg);
}

function findNodeBinary(): string | null {
  try {
    const which = require('child_process').execSync('where node', { encoding: 'utf-8', timeout: 3000, shell: 'cmd.exe' }).trim().split('\n')[0];
    if (which && which.endsWith('.exe')) return which;
  } catch {}
  return 'node';
}

function startTheiaBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const nodeBin = findNodeBinary();
    const cliPath = path.join(process.resourcesPath, 'theia-backend', 'lib', 'backend', 'main.js');
    const appPath = path.join(process.resourcesPath, 'theia-backend', 'lib');
    log(`Starting Theia backend`);
    log(`  Node: ${nodeBin}`);
    log(`  Script: ${cliPath}`);
    log(`  Script exists: ${fs.existsSync(cliPath)}`);

    theiaServer = spawn(nodeBin!, [cliPath], {
      cwd: appPath,
      env: { ...process.env, THEIA_PORT: String(THEIA_PORT), PORT: String(THEIA_PORT) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let backendLog = '';
    theiaServer.stdout?.on('data', (data) => { backendLog += data.toString(); log(`[theia] ${data}`); });
    theiaServer.stderr?.on('data', (data) => { backendLog += data.toString(); log(`[theia:err] ${data}`); });

    const timeout = setTimeout(() => {
      log('Theia backend ready (timeout - assuming started)');
      resolve();
    }, 10000);

    theiaServer.on('error', (err) => {
      clearTimeout(timeout);
      log(`Theia backend error: ${err}`);
      reject(err);
    });

    theiaServer.on('exit', (code, signal) => {
      clearTimeout(timeout);
      log(`Theia backend exited: code=${code} signal=${signal}`);
      log(`Backend output: ${backendLog.substring(0, 2000)}`);
      if (code !== 0 && code !== null) reject(new Error(`Theia backend exited with code ${code}`));
    });
  });
}

function createMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'IDEIA',
      submenu: [
        { label: 'About IDEIA', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => mainWindow?.webContents.send('navigate', 'preferences') },
        { type: 'separator' },
        { role: 'quit', label: 'Quit IDEIA' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'zoom' }, { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://ideia.dev/docs') },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/anomalyco/ideia/issues') },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    title: 'IDEIA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('console-message', (_event, level, message, _line, sourceId) => {
    log(`[renderer:${level}] ${message} (${sourceId})`);
  });

  mainWindow.loadURL(`http://${THEIA_HOST}:${THEIA_PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let updater: AppUpdater;
let tray: AppTray;
let notifier: DesktopNotifier;

app.whenReady().then(async () => {
  createMenu();

  runFirstRunWizard();

  try {
    await startTheiaBackend();
    log('Theia backend started successfully');
  } catch (err) {
    log(`Startup error: ${err}`);
    dialog.showErrorBox('IDEIA Startup Error', `Failed to start the IDEIA engine:\n${err}`);
    app.quit();
    return;
  }

  createWindow();

  if (mainWindow) {
    notifier = new DesktopNotifier();
    notifier.setMainWindow(mainWindow);

    updater = new AppUpdater(true);
    updater.setMainWindow(mainWindow);
    updater.init();

    tray = new AppTray(mainWindow);
    tray.create();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (theiaServer) {
    theiaServer.kill();
    theiaServer = null;
  }
});
