import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';

export class AppTray {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  create(): void {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    this.tray = new Tray(icon);

    this.tray.setToolTip('IDEIA');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir IDEIA',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: 'Status',
        enabled: false,
      },
      {
        label: 'Verificar atualizações',
        click: () => {
          this.mainWindow.webContents.send('check-updates');
        },
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    this.tray.on('double-click', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
